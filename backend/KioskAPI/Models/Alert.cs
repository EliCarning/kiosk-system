namespace KioskAPI.Models;

public static class AlertTypes
{
    public const string Offline = "Offline";
    public const string CommandFailed = "CommandFailed";
}

public class Alert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
