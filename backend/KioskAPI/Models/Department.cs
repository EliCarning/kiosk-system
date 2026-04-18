namespace KioskAPI.Models;

public class Department
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;

    public Guid SiteId { get; set; }
    public Site? Site { get; set; }

    public ICollection<Kiosk> Kiosks { get; set; } = new List<Kiosk>();
}
