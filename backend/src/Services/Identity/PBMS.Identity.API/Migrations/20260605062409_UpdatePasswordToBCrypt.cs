using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PBMS.Identity.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePasswordToBCrypt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "PasswordHash",
                value: "$2a$11$e.f1XhD.kIplhQ9Qx2y/gupBwJmH7K1P3lC3O8g6dJbI922/cT7r6");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "PasswordHash",
                value: "$2a$11$e.f1XhD.kIplhQ9Qx2y/gupBwJmH7K1P3lC3O8g6dJbI922/cT7r6");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "PasswordHash",
                value: "$2a$11$e.f1XhD.kIplhQ9Qx2y/gupBwJmH7K1P3lC3O8g6dJbI922/cT7r6");

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "FullName", "PasswordHash", "PhoneNumber", "Role", "Username" },
                values: new object[] { new Guid("44444444-4444-4444-4444-444444444444"), "AI Service Daemon", "$2a$11$e.f1XhD.kIplhQ9Qx2y/gupBwJmH7K1P3lC3O8g6dJbI922/cT7r6", null, "Manager", "ai_service" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "PasswordHash",
                value: "5e883727f7132f1610817287e0d161d7a4416a03c0974443a7a486d23f11d4f4");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "PasswordHash",
                value: "5e883727f7132f1610817287e0d161d7a4416a03c0974443a7a486d23f11d4f4");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "PasswordHash",
                value: "5e883727f7132f1610817287e0d161d7a4416a03c0974443a7a486d23f11d4f4");
        }
    }
}
