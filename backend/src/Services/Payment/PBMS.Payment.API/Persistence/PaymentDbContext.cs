using Microsoft.EntityFrameworkCore;
using PBMS.Payment.API.Models;
using MassTransit;

namespace PBMS.Payment.API.Persistence
{
    public class PaymentDbContext : DbContext
    {
        public PaymentDbContext(DbContextOptions<PaymentDbContext> options) : base(options)
        {
        }

        public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure MassTransit Inbox/Outbox state tables
            modelBuilder.AddInboxStateEntity();
            modelBuilder.AddOutboxMessageEntity();
            modelBuilder.AddOutboxStateEntity();

            modelBuilder.Entity<PaymentTransaction>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PaymentGateway).HasMaxLength(50).IsRequired();
                entity.Property(e => e.TransactionId).HasMaxLength(50).IsRequired();
                entity.Property(e => e.IdempotencyKey).HasMaxLength(256).IsRequired();
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.TimestampUtc).IsRequired();

                // Unique index for idempotency check at the database constraint level
                entity.HasIndex(e => e.IdempotencyKey).IsUnique();
            });
        }
    }
}
