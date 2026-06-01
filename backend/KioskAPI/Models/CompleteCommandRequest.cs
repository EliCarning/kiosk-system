namespace KioskAPI.Models;

public class CompleteCommandRequest
{
    public bool Success { get; set; } = true;
    public string? Status { get; set; }
    public string? Output { get; set; }
    public string? Error { get; set; }
    public long? DurationMs { get; set; }
    public string? Result { get; set; }
}
