namespace KioskAPI.Models;

public class CreateCommandRequest
{
    public string MachineName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Payload { get; set; }
}
