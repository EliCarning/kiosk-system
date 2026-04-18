namespace KioskAPI.Models;

public class Command
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public string Status { get; set; } = CommandStatuses.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
