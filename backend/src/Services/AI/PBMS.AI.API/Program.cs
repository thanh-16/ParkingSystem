using System;
using System.Net.Sockets;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using MassTransit;
using PBMS.AI.API.Consumers;
using PBMS.AI.API.Services;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Polly;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.Seq(builder.Configuration["Seq:ServerUrl"] ?? "http://localhost:5341")
    .CreateLogger();

builder.Host.UseSerilog();

// Register OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.AI"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")))
    .WithMetrics(metrics => metrics
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.AI"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")));

builder.Services.AddHealthChecks();

// Add Redis Caching for AI Allocation
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton(provider => new RedisSortedSetCache(redisConnectionString));

// Add HTTP Client Factory with Polly resilience transient error retry policy and service-to-service auth handler
builder.Services.AddTransient<ServiceToServiceAuthHandler>();
builder.Services.AddHttpClient("AuthClient");
builder.Services.AddHttpClient("RegistryClient")
    .AddHttpMessageHandler<ServiceToServiceAuthHandler>()
    .AddTransientHttpErrorPolicy(policy => policy.WaitAndRetryAsync(3, retryAttempt => 
        TimeSpan.FromMilliseconds(200 * retryAttempt)));

builder.Services.AddHostedService<CacheWarmupService>();

// Check RabbitMQ availability
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

// Add MassTransit (RabbitMQ / InMemory fallback)
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<CheckInInitiatedEventConsumer>();
    x.AddConsumer<SlotReleasedEventConsumer>();
    x.AddConsumer<SlotDeletedEventConsumer>();

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

// Register JWT Authentication & Validation
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

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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
