using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using MassTransit;
using PBMS.AI.API.Services;
using PBMS.Shared;

namespace PBMS.AI.API.Consumers
{
    public class CheckInInitiatedEventConsumer : IConsumer<CheckInInitiatedEvent>
    {
        private readonly RedisSortedSetCache _cache;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public CheckInInitiatedEventConsumer(RedisSortedSetCache cache, IHttpClientFactory httpClientFactory, IPublishEndpoint publishEndpoint, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _cache = cache;
            _httpClientFactory = httpClientFactory;
            _publishEndpoint = publishEndpoint;
            _configuration = configuration;
        }

        public async Task Consume(ConsumeContext<CheckInInitiatedEvent> context)
        {
            var @event = context.Message;
            var client = _httpClientFactory.CreateClient("RegistryClient");
            var registryBaseUrl = _configuration["Services:RegistryUrl"] ?? "http://localhost:5020";


            var optimalSlotId = await _cache.PopOptimalSlotAsync(@event.VehicleTypeId);

            if (optimalSlotId.HasValue)
            {
                Console.WriteLine($"Cache Hit: Found optimal slot {optimalSlotId.Value} in Redis for vehicle type {@event.VehicleTypeId}");
                var slotNumber = await _cache.GetSlotNumberAsync(optimalSlotId.Value) ?? "Unknown";


                await _cache.ReserveSlotAsync(optimalSlotId.Value, TimeSpan.FromMinutes(5));


                try
                {
                    var updateUrl = $"{registryBaseUrl.TrimEnd('/')}/api/v1/registry/slots/update-status";
                    var response = await client.PostAsJsonAsync(updateUrl, new { SlotId = optimalSlotId.Value, Status = 2 });
                    if (!response.IsSuccessStatusCode)
                    {
                        Console.WriteLine("Failed to update slot status in Registry DB.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error calling Registry status update: {ex.Message}");
                }


                await _publishEndpoint.Publish(new SlotAllocatedEvent
                {
                    SessionId = @event.SessionId,
                    SlotId = optimalSlotId.Value,
                    SlotNumber = slotNumber,
                    TimestampUtc = DateTime.UtcNow
                });

                return;
            }

            Console.WriteLine($"Cache Miss/Empty: Fetching available slots from Registry Service for vehicle type {@event.VehicleTypeId}");


            var registryUrl = $"{registryBaseUrl.TrimEnd('/')}/api/v1/registry/slots/available?vehicleTypeId={@event.VehicleTypeId}";
            var occupancyUrl = $"{registryBaseUrl.TrimEnd('/')}/api/v1/registry/floors/occupancy";
            List<ParkingSlotDto>? availableSlots = null;
            List<FloorOccupancyDto>? occupancyList = null;

            try
            {
                availableSlots = await client.GetFromJsonAsync<List<ParkingSlotDto>>(registryUrl);
                occupancyList = await client.GetFromJsonAsync<List<FloorOccupancyDto>>(occupancyUrl);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error contacting Registry Service: {ex.Message}");
            }

            if (availableSlots == null || !availableSlots.Any())
            {
                Console.WriteLine($"No available slots for vehicle type {@event.VehicleTypeId}");
                await _publishEndpoint.Publish(new CheckInFailedEvent
                {
                    SessionId = @event.SessionId,
                    Reason = "No available slots for vehicle type",
                    TimestampUtc = DateTime.UtcNow
                });
                return;
            }


            var (w1, w2, w3, w4) = await _cache.GetWeightsAsync();


            bool isLongTerm = @event.CardNumber.StartsWith("MONTHLY", StringComparison.OrdinalIgnoreCase);

            foreach (var slot in availableSlots)
            {
                double distanceScore = 1.0 / Math.Max(1, slot.DistanceMetric);
                double floorLevelScore = 1.0 / Math.Max(1, Math.Abs(slot.Floor?.FloorNumber ?? 1));


                double utilizationBalance = 0.8;
                if (occupancyList != null)
                {
                    var occ = occupancyList.FirstOrDefault(o => o.FloorId == slot.FloorId);
                    if (occ != null && occ.TotalSlots > 0)
                    {

                        utilizationBalance = (double)(occ.TotalSlots - occ.OccupiedSlots) / occ.TotalSlots;
                    }
                }

                double durationMatch = 0.0;
                if (isLongTerm)
                {
                    durationMatch = (double)slot.DistanceMetric / 100.0;
                }
                else
                {
                    durationMatch = 100.0 / Math.Max(1, slot.DistanceMetric);
                }

                double score = (w1 * distanceScore) + (w2 * floorLevelScore) + (w3 * utilizationBalance) + (w4 * durationMatch);


                await _cache.AddAvailableSlotAsync(@event.VehicleTypeId, slot.Id, score, slot.SlotNumber);
            }


            optimalSlotId = await _cache.PopOptimalSlotAsync(@event.VehicleTypeId);

            if (optimalSlotId.HasValue)
            {
                var optimalSlot = availableSlots.First(s => s.Id == optimalSlotId.Value);


                await _cache.ReserveSlotAsync(optimalSlotId.Value, TimeSpan.FromMinutes(5));


                try
                {
                    var updateUrl = $"{registryBaseUrl.TrimEnd('/')}/api/v1/registry/slots/update-status";

                    var response = await client.PostAsJsonAsync(updateUrl, new { SlotId = optimalSlotId.Value, Status = 2 });
                    if (!response.IsSuccessStatusCode)
                    {
                        Console.WriteLine("Failed to update slot status in Registry DB.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error calling Registry status update: {ex.Message}");
                }


                await _publishEndpoint.Publish(new SlotAllocatedEvent
                {
                    SessionId = @event.SessionId,
                    SlotId = optimalSlotId.Value,
                    SlotNumber = optimalSlot.SlotNumber,
                    TimestampUtc = DateTime.UtcNow
                });
            }
            else
            {
                Console.WriteLine($"Optimal slot resolution failed for session {@event.SessionId}");
                await _publishEndpoint.Publish(new CheckInFailedEvent
                {
                    SessionId = @event.SessionId,
                    Reason = "Optimal slot resolution failed",
                    TimestampUtc = DateTime.UtcNow
                });
            }
        }
    }

    public class ParkingSlotDto
    {
        public Guid Id { get; set; }
        public Guid FloorId { get; set; }
        public string SlotNumber { get; set; } = string.Empty;
        public int DistanceMetric { get; set; }
        public string Status { get; set; } = string.Empty;
        public FloorDto? Floor { get; set; }
    }

    public class FloorDto
    {
        public Guid Id { get; set; }
        public int FloorNumber { get; set; }
        public int TotalSlots { get; set; }
        public int AllowedVehicleTypeId { get; set; }
    }

    public class FloorOccupancyDto
    {
        public Guid FloorId { get; set; }
        public int FloorNumber { get; set; }
        public int OccupiedSlots { get; set; }
        public int TotalSlots { get; set; }
    }
}