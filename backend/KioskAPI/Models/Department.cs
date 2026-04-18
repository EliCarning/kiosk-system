namespace KioskAPI.Models;

public class Department
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public int SiteId { get; set; }
    public Site? Site { get; set; }

    public ICollection<Kiosk> Kiosks { get; set; } = new List<Kiosk>();
}
