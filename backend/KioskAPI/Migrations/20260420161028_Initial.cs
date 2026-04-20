using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KioskAPI.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Alerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsResolved = table.Column<bool>(type: "INTEGER", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Commands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Commands", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EventLogEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    LogName = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    EventId = table.Column<int>(type: "INTEGER", nullable: false),
                    Level = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventLogEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Level = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RdpSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Username = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SessionName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    State = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    LoginTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CollectedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RdpSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sites", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemInfoSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Hostname = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    OsVersion = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
                    IpAddress = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Uptime = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    CurrentUser = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    CpuCores = table.Column<int>(type: "INTEGER", nullable: true),
                    TotalRamMb = table.Column<long>(type: "INTEGER", nullable: true),
                    FreeRamMb = table.Column<long>(type: "INTEGER", nullable: true),
                    DiskSummary = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    LastBoot = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CpuUsagePct = table.Column<double>(type: "REAL", nullable: true),
                    RamUsagePct = table.Column<double>(type: "REAL", nullable: true),
                    DiskUsagePct = table.Column<double>(type: "REAL", nullable: true),
                    CollectedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemInfoSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WindowsProcesses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ProcessName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Pid = table.Column<int>(type: "INTEGER", nullable: false),
                    MemoryMb = table.Column<long>(type: "INTEGER", nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WindowsProcesses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WindowsServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ServiceName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    StartType = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WindowsServices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SiteId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Departments_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Kiosks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MachineName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    IpAddress = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    LastSeen = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SiteId = table.Column<Guid>(type: "TEXT", nullable: true),
                    DepartmentId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Kiosks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Kiosks_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Kiosks_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_CreatedAt",
                table: "Alerts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_MachineName_Type_IsResolved",
                table: "Alerts",
                columns: new[] { "MachineName", "Type", "IsResolved" });

            migrationBuilder.CreateIndex(
                name: "IX_Commands_CreatedAt",
                table: "Commands",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Commands_MachineName_Status",
                table: "Commands",
                columns: new[] { "MachineName", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Departments_SiteId_Name",
                table: "Departments",
                columns: new[] { "SiteId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EventLogEntries_MachineName_CollectedAt",
                table: "EventLogEntries",
                columns: new[] { "MachineName", "CollectedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EventLogEntries_Timestamp",
                table: "EventLogEntries",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_Kiosks_DepartmentId",
                table: "Kiosks",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Kiosks_MachineName",
                table: "Kiosks",
                column: "MachineName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Kiosks_SiteId",
                table: "Kiosks",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_Logs_MachineName_Timestamp",
                table: "Logs",
                columns: new[] { "MachineName", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_RdpSessions_MachineName_CollectedAt",
                table: "RdpSessions",
                columns: new[] { "MachineName", "CollectedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sites_Name",
                table: "Sites",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemInfoSnapshots_MachineName_CollectedAt",
                table: "SystemInfoSnapshots",
                columns: new[] { "MachineName", "CollectedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WindowsProcesses_MachineName_CollectedAt",
                table: "WindowsProcesses",
                columns: new[] { "MachineName", "CollectedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WindowsServices_MachineName_CollectedAt",
                table: "WindowsServices",
                columns: new[] { "MachineName", "CollectedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Alerts");

            migrationBuilder.DropTable(
                name: "Commands");

            migrationBuilder.DropTable(
                name: "EventLogEntries");

            migrationBuilder.DropTable(
                name: "Kiosks");

            migrationBuilder.DropTable(
                name: "Logs");

            migrationBuilder.DropTable(
                name: "RdpSessions");

            migrationBuilder.DropTable(
                name: "SystemInfoSnapshots");

            migrationBuilder.DropTable(
                name: "WindowsProcesses");

            migrationBuilder.DropTable(
                name: "WindowsServices");

            migrationBuilder.DropTable(
                name: "Departments");

            migrationBuilder.DropTable(
                name: "Sites");
        }
    }
}
