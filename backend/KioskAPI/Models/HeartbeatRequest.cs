namespace KioskAPI.Models;

public class HeartbeatRequest
{
    public string MachineName { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string AgentVersion { get; set; } = string.Empty;
    public string Os { get; set; } = string.Empty;
    public string CurrentUser { get; set; } = string.Empty;
    public string Uptime { get; set; } = string.Empty;
    public string LastCommandResult { get; set; } = string.Empty;
}
