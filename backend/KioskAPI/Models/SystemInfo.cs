namespace KioskAPI.Models;

public class SystemInfo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string Hostname { get; set; } = string.Empty;
    public string OsVersion { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string? Uptime { get; set; }
    public string? CurrentUser { get; set; }
    public int? CpuCores { get; set; }
    public long? TotalRamMb { get; set; }
    public long? FreeRamMb { get; set; }
    public string? DiskSummary { get; set; }
    public DateTime? LastBoot { get; set; }
    public double? CpuUsagePct { get; set; }
    public double? RamUsagePct { get; set; }
    public double? DiskUsagePct { get; set; }
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}
