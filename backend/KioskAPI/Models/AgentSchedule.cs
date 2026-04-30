namespace KioskAPI.Models;

public class AgentSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string CommandType { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public int IntervalSeconds { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTime? LastRunAt { get; set; }
    public DateTime? NextRunAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public record CreateScheduleRequest(
    string MachineName,
    string CommandType,
    int IntervalSeconds,
    string? Payload = null);

public record UpdateScheduleRequest(
    bool? IsEnabled,
    int? IntervalSeconds,
    string? Payload);
