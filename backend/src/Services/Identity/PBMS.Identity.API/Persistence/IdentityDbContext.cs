using System;
using Microsoft.EntityFrameworkCore;
using PBMS.Identity.API.Models;

namespace PBMS.Identity.API.Persistence
{
    public class IdentityDbContext : DbContext
    {
        public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.HasIndex(e => e.Username).IsUnique();
                entity.Property(e => e.PasswordHash).HasMaxLength(500).IsRequired();
                entity.Property(e => e.FullName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Role).HasMaxLength(20).IsRequired();
                entity.Property(e => e.PhoneNumber).HasMaxLength(15);


                string defaultHash = "$2a$11$e.f1XhD.kIplhQ9Qx2y/gupBwJmH7K1P3lC3O8g6dJbI922/cT7r6";

                entity.HasData(
                    new User
                    {
                        Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                        Username = "manager1",
                        PasswordHash = defaultHash,
                        FullName = "Nguyễn Văn A",
                        Role = "Manager"
                    },
                    new User
                    {
                        Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                        Username = "staff1",
                        PasswordHash = defaultHash,
                        FullName = "Trần Thị B",
                        Role = "Staff"
                    },
                    new User
                    {
                        Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                        Username = "driver1",
                        PasswordHash = defaultHash,
                        FullName = "Phạm Văn C",
                        Role = "Driver"
                    },
                    new User
                    {
                        Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                        Username = "ai_service",
                        PasswordHash = defaultHash,
                        FullName = "AI Service Daemon",
                        Role = "Staff"
                    }
                );
            });
        }
    }
}