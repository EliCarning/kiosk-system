namespace KioskAPI.Models;

public class Site
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;

    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<Kiosk> Kiosks { get; set; } = new List<Kiosk>();
}
