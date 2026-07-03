using System;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using PBMS.Registry.API.Persistence;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using MassTransit;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.Seq(builder.Configuration["Seq:ServerUrl"] ?? "http://localhost:5341")
    .CreateLogger();

builder.Host.UseSerilog();


builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.Registry"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")))
    .WithMetrics(metrics => metrics
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.Registry"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")));

builder.Services.AddHealthChecks();


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Host=localhost;Database=pbms_registry_db;Username=postgres;Password=postgres";

builder.Services.AddDbContextPool<RegistryDbContext>(options =>
    options.UseNpgsql(connectionString));


var rabbitHost = builder.Configuration["RabbitMQ:Host"] ?? "localhost";
bool rabbitAvailable = false;
try
{
    using var tcpClient = new System.Net.Sockets.TcpClient();
    var result = tcpClient.BeginConnect(rabbitHost, 5672, null, null);
    rabbitAvailable = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(500));
    if (rabbitAvailable) tcpClient.EndConnect(result);
}
catch
{
    rabbitAvailable = false;
}


builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<RegistryDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();
    });

    if (rabbitAvailable)
    {
        x.UsingRabbitMq((context, cfg) =>
        {
            cfg.Host(rabbitHost, "/", h =>
            {
                h.Username(builder.Configuration["RabbitMQ:Username"] ?? "guest");
                h.Password(builder.Configuration["RabbitMQ:Password"] ?? "guest");
            });

            cfg.UseMessageRetry(r =>
            {
                r.Exponential(5, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(2));
                r.Ignore<ArgumentException>();
                r.Ignore<ArgumentNullException>();
                r.Ignore<InvalidOperationException>();
            });
            cfg.ConfigureEndpoints(context);
        });
    }
    else
    {
        Console.WriteLine("RabbitMQ not accessible. Falling back to InMemory transport.");
        x.UsingInMemory((context, cfg) =>
        {
            cfg.UseMessageRetry(r =>
            {
                r.Exponential(5, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(2));
                r.Ignore<ArgumentException>();
                r.Ignore<ArgumentNullException>();
                r.Ignore<InvalidOperationException>();
            });
            cfg.ConfigureEndpoints(context);
        });
    }
});


var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? builder.Configuration["Jwt:Secret"]
                ?? "ThisIsASecretKeyForPBMSAuthTokenGenerationAndSigningOfJWTs!";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
                ?? builder.Configuration["Jwt:Issuer"]
                ?? "PBMS.Identity";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
                ?? builder.Configuration["Jwt:Audience"]
                ?? "PBMS.Clients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new X509SecurityKey(PBMS.Shared.JwtCertHelper.GetOrGenerateJwtCert()),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ManagerOnly", policy => policy.RequireRole("Manager"));
    options.AddPolicy("StaffOrManager", policy => policy.RequireRole("Manager", "Staff"));
});
builder.Services.AddHostedService<PBMS.Registry.API.Services.SlotReconciliationService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();


try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<RegistryDbContext>();
        await db.Database.MigrateAsync();

        if (!await db.ParkingSlots.AnyAsync())
        {
            Console.WriteLine("[REGISTRY] ParkingSlots table is empty. Automatically seeding default database...");
            var floor1 = new PBMS.Registry.API.Models.Floor { FloorNumber = 1, AllowedVehicleTypeId = 2, TotalSlots = 15 };
            var floor2 = new PBMS.Registry.API.Models.Floor { FloorNumber = 2, AllowedVehicleTypeId = 3, TotalSlots = 10 };
            var floor3 = new PBMS.Registry.API.Models.Floor { FloorNumber = 3, AllowedVehicleTypeId = 4, TotalSlots = 10 };

            db.Floors.AddRange(floor1, floor2, floor3);
            await db.SaveChangesAsync();

            for (int i = 1; i <= 15; i++)
            {
                db.ParkingSlots.Add(new PBMS.Registry.API.Models.ParkingSlot
                {
                    FloorId = floor1.Id,
                    SlotNumber = $"F1-C{i:00}",
                    Status = PBMS.Registry.API.Models.SlotStatus.Available,
                    DistanceMetric = i * 4
                });
            }

            for (int i = 1; i <= 10; i++)
            {
                db.ParkingSlots.Add(new PBMS.Registry.API.Models.ParkingSlot
                {
                    FloorId = floor2.Id,
                    SlotNumber = $"F2-S{i:00}",
                    Status = PBMS.Registry.API.Models.SlotStatus.Available,
                    DistanceMetric = i * 5
                });
            }

            for (int i = 1; i <= 10; i++)
            {
                db.ParkingSlots.Add(new PBMS.Registry.API.Models.ParkingSlot
                {
                    FloorId = floor3.Id,
                    SlotNumber = $"F3-E{i:00}",
                    Status = PBMS.Registry.API.Models.SlotStatus.Available,
                    DistanceMetric = i * 6
                });
            }

            await db.SaveChangesAsync();
            Console.WriteLine("[REGISTRY] Default database seeded successfully with 35 slots.");
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Registry database migration failed: {ex.Message}. Continuing startup in local configuration.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapControllers();

app.Run();