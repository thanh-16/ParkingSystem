using Microsoft.EntityFrameworkCore;
using PBMS.Transaction.API.Models;
using MassTransit;

namespace PBMS.Transaction.API.Persistence
{
    public class TransactionDbContext : DbContext
    {
        public TransactionDbContext(DbContextOptions<TransactionDbContext> options) : base(options)
        {
        }

        public DbSet<ParkingSession> ParkingSessions => Set<ParkingSession>();
        public DbSet<PricingRule> PricingRules => Set<PricingRule>();
        public DbSet<Booking> Bookings => Set<Booking>();
        public DbSet<DriverWallet> DriverWallets => Set<DriverWallet>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            modelBuilder.AddInboxStateEntity();
            modelBuilder.AddOutboxMessageEntity();
            modelBuilder.AddOutboxStateEntity();

            modelBuilder.Entity<ParkingSession>(entity =>
            {
                entity.HasKey(e => e.CorrelationId);
                entity.Property(e => e.CurrentState).HasMaxLength(64).IsRequired();
                entity.Property(e => e.Version);

                entity.Property(e => e.CardNumber).HasMaxLength(50).IsRequired();
                entity.Property(e => e.LicensePlate).HasMaxLength(20).IsRequired();
                entity.Property(e => e.CheckInTime).IsRequired();
                entity.Property(e => e.CheckOutTime);
                entity.Property(e => e.TotalFee).HasPrecision(18, 2);
                entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
                entity.Property(e => e.Notes).HasMaxLength(500);


                entity.HasIndex(e => new { e.CardNumber, e.Status })
                    .HasDatabaseName("IX_ParkingSessions_CardNumber_Status");
                entity.HasIndex(e => new { e.LicensePlate, e.Status })
                    .HasDatabaseName("IX_ParkingSessions_LicensePlate_Status");


                entity.HasIndex(e => e.CheckInTime)
                    .HasDatabaseName("IX_ParkingSessions_CheckInTime");
                entity.HasIndex(e => new { e.CardNumber, e.LicensePlate, e.Status, e.CheckInTime })
                    .HasDatabaseName("IX_ParkingSessions_CardNumber_LicensePlate_Status_CheckInTime");
            });

            modelBuilder.Entity<PricingRule>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.RatePerHour).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.VehicleTypeId).IsRequired();
                entity.HasIndex(e => e.VehicleTypeId).IsUnique();


                entity.HasData(
                    new PricingRule { Id = 1, VehicleTypeId = 1, RatePerHour = 5000m },
                    new PricingRule { Id = 2, VehicleTypeId = 2, RatePerHour = 20000m },
                    new PricingRule { Id = 3, VehicleTypeId = 3, RatePerHour = 30000m },
                    new PricingRule { Id = 4, VehicleTypeId = 4, RatePerHour = 15000m }
                );
            });

            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LicensePlate).HasMaxLength(20).IsRequired();
                entity.Property(e => e.SlotNumber).HasMaxLength(20).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
                entity.HasIndex(e => new { e.LicensePlate, e.Status });
            });

            modelBuilder.Entity<DriverWallet>(entity =>
            {
                entity.HasKey(e => e.Username);
                entity.Property(e => e.Username).HasMaxLength(100);
                entity.Property(e => e.Balance).HasPrecision(18, 2).IsRequired();
            });
        }
    }
}