namespace KioskAPI.Models;

public class EventLogEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string LogName { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public int EventId { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}
