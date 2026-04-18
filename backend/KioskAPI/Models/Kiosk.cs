namespace KioskAPI.Models;

public class Kiosk
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string MachineName { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Status { get; set; } = "Offline";
    public DateTime LastSeen { get; set; }

    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }

    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
}
