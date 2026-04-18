namespace KioskAPI.Models;

public class Log
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
