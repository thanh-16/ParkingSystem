using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PBMS.Transaction.API.Migrations
{
    /// <inheritdoc />
    public partial class AddParkingSessionSaga : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ParkingSessions",
                newName: "CorrelationId");

            migrationBuilder.AddColumn<string>(
                name: "CurrentState",
                table: "ParkingSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "ParkingSessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentState",
                table: "ParkingSessions");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "ParkingSessions");

            migrationBuilder.RenameColumn(
                name: "CorrelationId",
                table: "ParkingSessions",
                newName: "Id");
        }
    }
}
