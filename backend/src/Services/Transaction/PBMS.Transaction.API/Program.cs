using System;
using System.Net.Sockets;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using MassTransit;
using PBMS.Transaction.API.Persistence;
using PBMS.Transaction.API.Services;
using OpenTelemetry.Metrics;
using FluentValidation;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.Seq(builder.Configuration["Seq:ServerUrl"] ?? "http://localhost:5341")
    .CreateLogger();

builder.Host.UseSerilog();


builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.Transaction"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")))
    .WithMetrics(metrics => metrics
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.Transaction"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")));

builder.Services.AddHealthChecks();


builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(PBMS.Transaction.API.CQRS.ValidationBehavior<,>));
});


builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);


builder.Services.AddHttpClient();


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Host=localhost;Database=pbms_transaction_db;Username=postgres;Password=postgres";

builder.Services.AddDbContextPool<TransactionDbContext>(options =>
    options.UseNpgsql(connectionString));


var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton(provider => new RedLockService(redisConnectionString));


var rabbitHost = builder.Configuration["RabbitMQ:Host"] ?? "localhost";
bool rabbitAvailable = false;
try
{
    using var tcpClient = new TcpClient();
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
    x.AddEntityFrameworkOutbox<TransactionDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();
    });


    x.AddSagaStateMachine<PBMS.Transaction.API.Saga.ParkingSessionSaga, PBMS.Transaction.API.Models.ParkingSession>()
        .EntityFrameworkRepository(r =>
        {
            r.ConcurrencyMode = ConcurrencyMode.Optimistic;
            r.ExistingDbContext<TransactionDbContext>();
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
                r.Ignore<FluentValidation.ValidationException>();
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
                r.Ignore<FluentValidation.ValidationException>();
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

builder.Services.AddAuthorization();
builder.Services.AddHostedService<PBMS.Transaction.API.Services.ParkingSessionTimeoutService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();


try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<TransactionDbContext>();
        await db.Database.MigrateAsync();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Transaction database migration failed: {ex.Message}. Continuing startup in local configuration.");
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