namespace KioskAPI.Models;

public class RdpSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string SessionName { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public DateTime? LoginTime { get; set; }
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}
