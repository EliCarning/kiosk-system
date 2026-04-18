using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace KioskAPI.Data;

public class KioskDbContextFactory : IDesignTimeDbContextFactory<KioskDbContext>
{
    public KioskDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=kioskdb;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<KioskDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new KioskDbContext(optionsBuilder.Options);
    }
}
