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
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}
