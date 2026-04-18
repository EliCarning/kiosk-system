namespace KioskAPI.Models;

public class CompleteCommandRequest
{
    public bool Success { get; set; } = true;
    public string? Result { get; set; }
}
