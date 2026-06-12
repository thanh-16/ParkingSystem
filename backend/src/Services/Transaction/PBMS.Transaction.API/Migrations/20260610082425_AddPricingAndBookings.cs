using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace PBMS.Transaction.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingAndBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "ParkingSessions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LicensePlate = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    VehicleTypeId = table.Column<int>(type: "integer", nullable: false),
                    SlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    BookingTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiryTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PricingRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VehicleTypeId = table.Column<int>(type: "integer", nullable: false),
                    RatePerHour = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingRules", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "PricingRules",
                columns: new[] { "Id", "RatePerHour", "UpdatedAtUtc", "VehicleTypeId" },
                values: new object[,]
                {
                    { 1, 5000m, new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9241), 1 },
                    { 2, 20000m, new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9245), 2 },
                    { 3, 30000m, new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9246), 3 },
                    { 4, 15000m, new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9247), 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_LicensePlate_Status",
                table: "Bookings",
                columns: new[] { "LicensePlate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PricingRules_VehicleTypeId",
                table: "PricingRules",
                column: "VehicleTypeId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Bookings");

            migrationBuilder.DropTable(
                name: "PricingRules");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "ParkingSessions");
        }
    }
}
