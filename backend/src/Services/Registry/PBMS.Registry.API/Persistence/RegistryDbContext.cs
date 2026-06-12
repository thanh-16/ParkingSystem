using Microsoft.EntityFrameworkCore;
using PBMS.Registry.API.Models;
using MassTransit;

namespace PBMS.Registry.API.Persistence
{
    public class RegistryDbContext : DbContext
    {
        public RegistryDbContext(DbContextOptions<RegistryDbContext> options) : base(options)
        {
        }

        public DbSet<VehicleType> VehicleTypes => Set<VehicleType>();
        public DbSet<Floor> Floors => Set<Floor>();
        public DbSet<ParkingSlot> ParkingSlots => Set<ParkingSlot>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            modelBuilder.AddInboxStateEntity();
            modelBuilder.AddOutboxMessageEntity();
            modelBuilder.AddOutboxStateEntity();

            modelBuilder.Entity<VehicleType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Name).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(200);

                entity.HasData(
                    new VehicleType { Id = 1, Name = "Motorbike", Description = "Two-wheeled motor vehicle" },
                    new VehicleType { Id = 2, Name = "Compact Car", Description = "Four-wheeled passenger car" },
                    new VehicleType { Id = 3, Name = "SUV", Description = "Sport Utility Vehicle / Large car" },
                    new VehicleType { Id = 4, Name = "EV", Description = "Electric Vehicle" }
                );
            });

            modelBuilder.Entity<Floor>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FloorNumber).IsRequired();
                entity.Property(e => e.TotalSlots).IsRequired();
                entity.HasOne(e => e.AllowedVehicleType)
                    .WithMany()
                    .HasForeignKey(e => e.AllowedVehicleTypeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ParkingSlot>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SlotNumber).HasMaxLength(20).IsRequired();
                entity.Property(e => e.DistanceMetric).IsRequired();
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

                entity.HasOne(e => e.Floor)
                    .WithMany()
                    .HasForeignKey(e => e.FloorId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.RowVersion).IsRowVersion();


                entity.HasIndex(e => new { e.FloorId, e.Status })
                    .HasDatabaseName("IX_ParkingSlots_FloorId_Status");
            });
        }
    }
}