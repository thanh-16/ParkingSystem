using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using PBMS.Registry.API.Persistence;
using PBMS.Registry.API.Models;

namespace PBMS.Registry.API.Services
{
    public class SlotReconciliationService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public SlotReconciliationService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<RegistryDbContext>();

                    var expiredThreshold = DateTime.UtcNow.Subtract(TimeSpan.FromMinutes(5));

                    var expiredSlots = await dbContext.ParkingSlots
                        .Where(s => s.Status == SlotStatus.Reserved && s.ReservationTimestampUtc < expiredThreshold)
                        .ToListAsync(stoppingToken);

                    if (expiredSlots.Any())
                    {
                        foreach (var slot in expiredSlots)
                        {
                            Console.WriteLine($"Reconciliation: Slot {slot.SlotNumber} reservation expired. Releasing to Available.");
                            slot.Status = SlotStatus.Available;
                            slot.ReservationTimestampUtc = null;
                        }

                        await dbContext.SaveChangesAsync(stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in SlotReconciliationService: {ex.Message}");
                }


                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}