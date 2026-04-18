namespace KioskAPI.Models;

public class Site
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<Kiosk> Kiosks { get; set; } = new List<Kiosk>();
}
