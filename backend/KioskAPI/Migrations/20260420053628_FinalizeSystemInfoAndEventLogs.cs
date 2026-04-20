using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KioskAPI.Migrations
{
    /// <inheritdoc />
    public partial class FinalizeSystemInfoAndEventLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EventLogEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MachineName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LogName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Source = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EventId = table.Column<int>(type: "integer", nullable: false),
                    Level = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventLogEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemInfoSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MachineName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Hostname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OsVersion = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Uptime = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CurrentUser = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CollectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemInfoSnapshots", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EventLogEntries_MachineName_CollectedAt",
                table: "EventLogEntries",
                columns: new[] { "MachineName", "CollectedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EventLogEntries_Timestamp",
                table: "EventLogEntries",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_SystemInfoSnapshots_MachineName_CollectedAt",
                table: "SystemInfoSnapshots",
                columns: new[] { "MachineName", "CollectedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventLogEntries");

            migrationBuilder.DropTable(
                name: "SystemInfoSnapshots");
        }
    }
}
