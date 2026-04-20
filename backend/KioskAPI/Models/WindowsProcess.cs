namespace KioskAPI.Models;

public class WindowsProcess
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string ProcessName { get; set; } = string.Empty;
    public int Pid { get; set; }
    public long MemoryMb { get; set; }
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}
