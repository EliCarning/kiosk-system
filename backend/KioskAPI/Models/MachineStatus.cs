namespace KioskAPI.Models;

public class MachineStatus
{
    public string MachineName { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime LastSeen { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? SiteId { get; set; }
    public Guid? DepartmentId { get; set; }
}
