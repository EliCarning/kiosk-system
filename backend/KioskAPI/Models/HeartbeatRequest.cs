namespace KioskAPI.Models;

public class HeartbeatRequest
{
    public string MachineName { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
}
