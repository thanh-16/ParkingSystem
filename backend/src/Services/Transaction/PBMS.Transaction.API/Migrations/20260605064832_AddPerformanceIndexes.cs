using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PBMS.Transaction.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_CardNumber_LicensePlate_Status_CheckInTime",
                table: "ParkingSessions",
                columns: new[] { "CardNumber", "LicensePlate", "Status", "CheckInTime" });

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_CheckInTime",
                table: "ParkingSessions",
                column: "CheckInTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ParkingSessions_CardNumber_LicensePlate_Status_CheckInTime",
                table: "ParkingSessions");

            migrationBuilder.DropIndex(
                name: "IX_ParkingSessions_CheckInTime",
                table: "ParkingSessions");
        }
    }
}
