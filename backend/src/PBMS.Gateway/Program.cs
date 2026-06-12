using System;
using System.Linq;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Yarp.ReverseProxy.Transforms;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using PBMS.Gateway;
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
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.Gateway"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")))
    .WithMetrics(metrics => metrics
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("PBMS.Gateway"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317")));

// 1. Add Memory Cache
builder.Services.AddMemoryCache();

// 2. Add YARP Reverse Proxy with Token Forwarding header preservation
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(builderContext =>
    {
        // Explicitly preserve and forward authorization headers
        builderContext.AddRequestTransform(transformContext =>
        {
            var authHeader = transformContext.HttpContext.Request.Headers["Authorization"];
            if (!string.IsNullOrEmpty(authHeader))
            {
                transformContext.ProxyRequest.Headers.Authorization = 
                    System.Net.Http.Headers.AuthenticationHeaderValue.Parse(authHeader!);
            }
            return ValueTask.CompletedTask;
        });
    });

// 3. Register JWT Authentication & Validation using shared certificate
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "PBMS.Identity";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "PBMS.Clients";

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

// 4. Configure IP and Role-based Rate Limiter (GatewayRateLimitPolicy)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    options.AddPolicy("GatewayRateLimitPolicy", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        // Extract role from validated claims, default to Anonymous
        var role = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Anonymous";
        
        int permitLimit = 5; // Default for anonymous
        if (role == "Manager") permitLimit = 100;
        else if (role == "Staff") permitLimit = 50;
        else if (role == "Driver") permitLimit = 20;

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{ip}:{role}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = permitLimit,
                Window = TimeSpan.FromSeconds(10),
                QueueLimit = 2
            });
    });
});

// 5. Add Health Checks
builder.Services.AddHealthChecks();

// 6. Add HTTP Logging for Observability
builder.Services.AddHttpLogging(logging =>
{
    logging.LoggingFields = HttpLoggingFields.RequestPropertiesAndHeaders | 
                            HttpLoggingFields.ResponsePropertiesAndHeaders;
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("GatewayCorsPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseHttpLogging();

app.UseCors("GatewayCorsPolicy");

// 7. Tracing Correlation ID propagation middleware
app.Use(async (context, next) =>
{
    if (!context.Request.Headers.TryGetValue("X-Correlation-Id", out var correlationId))
    {
        correlationId = Guid.NewGuid().ToString();
        context.Request.Headers["X-Correlation-Id"] = correlationId;
    }
    context.Response.Headers["X-Correlation-Id"] = correlationId;

    var activity = System.Diagnostics.Activity.Current;
    activity?.SetTag("CorrelationId", correlationId.ToString());

    await next();
});

// 8. Caching Middleware (GET read-only endpoints cached for 10s)
app.UseMiddleware<GatewayResponseCacheMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/auth/v1/swagger.json", "Identity (Auth) Service API");
    options.SwaggerEndpoint("/swagger/registry/v1/swagger.json", "Registry (Slots) Service API");
    options.SwaggerEndpoint("/swagger/transaction/v1/swagger.json", "Transaction Service API");
    options.SwaggerEndpoint("/swagger/payment/v1/swagger.json", "Payment Service API");
    options.SwaggerEndpoint("/swagger/ai/v1/swagger.json", "AI (Optimal Slots) Service API");
    options.RoutePrefix = "swagger"; // Expose Swagger UI at http://localhost:5125/swagger
});

// Map Health Check Endpoint
app.MapHealthChecks("/health");

// 9. Map YARP Reverse Proxy with custom Circuit Breaker middleware inside proxy pipeline
app.MapReverseProxy(proxyPipeline =>
{
    proxyPipeline.UseMiddleware<GatewayCircuitBreakerMiddleware>();
});

app.Run();
