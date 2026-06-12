using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using MassTransit;
using PBMS.AI.API.Services;
using PBMS.Shared;

namespace PBMS.AI.API.Consumers
{
    public class SlotReleasedEventConsumer : IConsumer<SlotReleasedEvent>
    {
        private readonly RedisSortedSetCache _cache;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public SlotReleasedEventConsumer(RedisSortedSetCache cache, IHttpClientFactory httpClientFactory, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _cache = cache;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task Consume(ConsumeContext<SlotReleasedEvent> context)
        {
            var @event = context.Message;


            await _cache.ReleaseSlotAsync(@event.SlotId);


            var client = _httpClientFactory.CreateClient("RegistryClient");
            try
            {
                var registryBaseUrl = _configuration["Services:RegistryUrl"] ?? "http://localhost:5020";
                var updateUrl = $"{registryBaseUrl.TrimEnd('/')}/api/v1/registry/slots/update-status";
                var response = await client.PostAsJsonAsync(updateUrl, new { SlotId = @event.SlotId, Status = 0 });
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine("Failed to update slot status to Available in Registry DB.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating slot status in Registry during release: {ex.Message}");
            }
        }
    }
}