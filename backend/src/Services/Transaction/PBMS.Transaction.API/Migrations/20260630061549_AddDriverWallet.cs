using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PBMS.Transaction.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverWallet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DriverWallets",
                columns: table => new
                {
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverWallets", x => x.Username);
                });

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 30, 6, 15, 49, 534, DateTimeKind.Utc).AddTicks(909));

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 2,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 30, 6, 15, 49, 534, DateTimeKind.Utc).AddTicks(915));

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 3,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 30, 6, 15, 49, 534, DateTimeKind.Utc).AddTicks(916));

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 4,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 30, 6, 15, 49, 534, DateTimeKind.Utc).AddTicks(917));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DriverWallets");

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9241));

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 2,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9245));

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 3,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9246));

            migrationBuilder.UpdateData(
                table: "PricingRules",
                keyColumn: "Id",
                keyValue: 4,
                column: "UpdatedAtUtc",
                value: new DateTime(2026, 6, 10, 8, 24, 24, 690, DateTimeKind.Utc).AddTicks(9247));
        }
    }
}
