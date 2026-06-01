using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KioskAPI.Migrations
{
    public partial class AddAlertNotificationFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "Alerts",
                type: "TEXT",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "NotificationSentAt",
                table: "Alerts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_NotificationSentAt",
                table: "Alerts",
                column: "NotificationSentAt");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Alerts_NotificationSentAt",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "NotificationSentAt",
                table: "Alerts");
        }
    }
}
