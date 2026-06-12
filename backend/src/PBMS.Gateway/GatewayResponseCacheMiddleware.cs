using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;

namespace PBMS.Gateway
{
    public class GatewayResponseCacheMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;

        public GatewayResponseCacheMiddleware(RequestDelegate next, IMemoryCache cache)
        {
            _next = next;
            _cache = cache;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Only cache GET read-only requests
            if (context.Request.Method != HttpMethods.Get)
            {
                await _next(context);
                return;
            }

            var path = context.Request.Path.Value ?? "";
            // Target specific read-only endpoints: /registry/slots and /registry/floors
            bool isCacheable = path.Contains("/registry/slots") || path.Contains("/registry/floors");
            if (!isCacheable)
            {
                await _next(context);
                return;
            }

            // Create a unique cache key based on Path and QueryString
            string cacheKey = $"gateway_cache:{path}:{context.Request.QueryString}";

            if (_cache.TryGetValue(cacheKey, out CachedResponse? cachedResponse) && cachedResponse != null)
            {
                Console.WriteLine($"Gateway Cache Hit: Serving cached response for {path}");
                context.Response.StatusCode = cachedResponse.StatusCode;
                context.Response.ContentType = cachedResponse.ContentType;
                foreach (var header in cachedResponse.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value;
                }
                
                // Add header to identify cache hits
                context.Response.Headers["X-Cache"] = "HIT";
                await context.Response.Body.WriteAsync(cachedResponse.Body);
                return;
            }

            // Intercept response body stream
            var originalBodyStream = context.Response.Body;
            using var responseBodyMemoryStream = new MemoryStream();
            context.Response.Body = responseBodyMemoryStream;

            await _next(context);

            if (context.Response.StatusCode == StatusCodes.Status200OK)
            {
                responseBodyMemoryStream.Seek(0, SeekOrigin.Begin);
                var bodyBytes = responseBodyMemoryStream.ToArray();

                var headers = context.Response.Headers
                    .Where(h => h.Key != "X-Cache" && h.Key != "Set-Cookie")
                    .ToDictionary(h => h.Key, h => h.Value.ToString());

                var entry = new CachedResponse
                {
                    StatusCode = context.Response.StatusCode,
                    ContentType = context.Response.ContentType ?? "application/json",
                    Headers = headers,
                    Body = bodyBytes
                };

                // Cache for 10 seconds to drastically reduce DB load
                _cache.Set(cacheKey, entry, TimeSpan.FromSeconds(10));
                Console.WriteLine($"Gateway Cache Write: Cached response for {path} for 10 seconds.");
            }

            responseBodyMemoryStream.Seek(0, SeekOrigin.Begin);
            await responseBodyMemoryStream.CopyToAsync(originalBodyStream);
            context.Response.Body = originalBodyStream;
        }

        private class CachedResponse
        {
            public int StatusCode { get; set; }
            public string ContentType { get; set; } = "application/json";
            public System.Collections.Generic.Dictionary<string, string> Headers { get; set; } = new();
            public byte[] Body { get; set; } = Array.Empty<byte>();
        }
    }
}
