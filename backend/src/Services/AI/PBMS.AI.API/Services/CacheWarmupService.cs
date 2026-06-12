using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using PBMS.AI.API.Consumers;

namespace PBMS.AI.API.Services
{
    public class CacheWarmupService : BackgroundService
    {
        private readonly RedisSortedSetCache _cache;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public CacheWarmupService(RedisSortedSetCache cache, IHttpClientFactory httpClientFactory, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _cache = cache;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {

            Console.WriteLine("CacheWarmupService: Waiting 5 seconds before warming up cache...");
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await PerformCacheSyncAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in CacheWarmupService during sync: {ex.Message}");
                }


                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task PerformCacheSyncAsync()
        {
            Console.WriteLine("CacheWarmupService: Starting background cache sync & warm-up...");
            var client = _httpClientFactory.CreateClient("RegistryClient");

            List<ParkingSlotDto>? allSlots = null;
            List<FloorOccupancyDto>? occupancyList = null;

            try
            {
                var registryUrl = _configuration["Services:RegistryUrl"] ?? "http://localhost:5020";
                allSlots = await client.GetFromJsonAsync<List<ParkingSlotDto>>($"{registryUrl.TrimEnd('/')}/api/v1/registry/slots");
                occupancyList = await client.GetFromJsonAsync<List<FloorOccupancyDto>>($"{registryUrl.TrimEnd('/')}/api/v1/registry/floors/occupancy");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CacheWarmupService: Failed to contact Registry Service. Reason: {ex.Message}");
                return;
            }

            if (allSlots == null) return;


            var availableSlots = allSlots.Where(s => s.Status.Equals("Available", StringComparison.OrdinalIgnoreCase)).ToList();

            Console.WriteLine($"CacheWarmupService: Found {availableSlots.Count} available slots out of {allSlots.Count} total slots.");


            await ResetAvailableSlotsCacheAsync();


            double w1 = 0.4;
            double w2 = 0.3;
            double w3 = 0.2;
            double w4 = 0.1;

            foreach (var slot in availableSlots)
            {
                int vehicleTypeId = slot.Floor?.AllowedVehicleTypeId ?? 1;

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

                double durationMatch = 100.0 / Math.Max(1, slot.DistanceMetric);

                double score = (w1 * distanceScore) + (w2 * floorLevelScore) + (w3 * utilizationBalance) + (w4 * durationMatch);


                await _cache.AddAvailableSlotAsync(vehicleTypeId, slot.Id, score, slot.SlotNumber);
            }

            Console.WriteLine("CacheWarmupService: Cache sync completed successfully.");
        }

        private async Task ResetAvailableSlotsCacheAsync()
        {
            await _cache.ClearAvailableSlotsAsync();
        }
    }
}