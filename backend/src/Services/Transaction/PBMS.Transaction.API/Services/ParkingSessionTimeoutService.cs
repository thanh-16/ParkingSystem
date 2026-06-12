using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using PBMS.Transaction.API.Persistence;

namespace PBMS.Transaction.API.Services
{
    public class ParkingSessionTimeoutService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public ParkingSessionTimeoutService(IServiceScopeFactory scopeFactory)
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
                    var dbContext = scope.ServiceProvider.GetRequiredService<TransactionDbContext>();

                    var timeoutThreshold = DateTime.UtcNow.Subtract(TimeSpan.FromMinutes(5));

                    var expiredSessions = await dbContext.ParkingSessions
                        .Where(s => s.CurrentState == "CheckInPending" && s.CheckInTime < timeoutThreshold)
                        .ToListAsync(stoppingToken);

                    if (expiredSessions.Any())
                    {
                        foreach (var session in expiredSessions)
                        {
                            Console.WriteLine($"Saga Timeout: Session {session.CorrelationId} check-in timed out. Transitioning to Failed.");
                            session.CurrentState = "Failed";
                            session.Status = "Failed";
                        }

                        await dbContext.SaveChangesAsync(stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in ParkingSessionTimeoutService: {ex.Message}");
                }

                // Check every 1 minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
