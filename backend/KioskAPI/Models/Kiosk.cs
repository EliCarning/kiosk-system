namespace KioskAPI.Models;

public class Kiosk
{
    public int Id { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Status { get; set; } = "Offline";
    public DateTime LastSeen { get; set; }

    public int? SiteId { get; set; }
    public Site? Site { get; set; }

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
}
