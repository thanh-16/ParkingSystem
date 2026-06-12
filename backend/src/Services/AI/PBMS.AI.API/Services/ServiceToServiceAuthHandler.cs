using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PBMS.AI.API.Services
{
    public class ServiceToServiceAuthHandler : DelegatingHandler
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;
        private static string? _cachedToken;
        private static DateTime _tokenExpiry = DateTime.MinValue;

        public ServiceToServiceAuthHandler(IHttpClientFactory httpClientFactory, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(_cachedToken) || DateTime.UtcNow >= _tokenExpiry)
            {
                await RefreshTokenAsync(cancellationToken);
            }

            if (!string.IsNullOrEmpty(_cachedToken))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedToken);
            }

            return await base.SendAsync(request, cancellationToken);
        }

        private async Task RefreshTokenAsync(CancellationToken cancellationToken)
        {
            try
            {
                // Create a temporary client to avoid recursive dependency on the handler
                var authClient = _httpClientFactory.CreateClient("AuthClient");
                var password = Environment.GetEnvironmentVariable("AI_SERVICE_PASSWORD") ?? "password";
                var identityUrl = _configuration["Services:IdentityUrl"] ?? "http://localhost:5010";
                var response = await authClient.PostAsJsonAsync($"{identityUrl.TrimEnd('/')}/api/v1/auth/login", new
                {
                    Username = "ai_service",
                    Password = password
                }, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<LoginResponseDto>(cancellationToken: cancellationToken);
                    if (result != null)
                    {
                        _cachedToken = result.Token;
                        // Token is valid for 1 day, cache for 23 hours to be safe
                        _tokenExpiry = DateTime.UtcNow.AddHours(23);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to retrieve service-to-service auth token: {ex.Message}");
            }
        }

        private class LoginResponseDto
        {
            public string Token { get; set; } = string.Empty;
        }
    }
}
