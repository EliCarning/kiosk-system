using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Site> Sites => Set<Site>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Kiosk> Kiosks => Set<Kiosk>();
    public DbSet<Command> Commands => Set<Command>();
    public DbSet<Log> Logs => Set<Log>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<SystemInfo> SystemInfoSnapshots => Set<SystemInfo>();
    public DbSet<EventLogEntry> EventLogEntries => Set<EventLogEntry>();
    public DbSet<RdpSession> RdpSessions => Set<RdpSession>();
    public DbSet<WindowsService> WindowsServices => Set<WindowsService>();
    public DbSet<WindowsProcess> WindowsProcesses => Set<WindowsProcess>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Site>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(s => s.Name).IsUnique();
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Name).IsRequired().HasMaxLength(200);
            entity.HasOne(d => d.Site)
                  .WithMany(s => s.Departments)
                  .HasForeignKey(d => d.SiteId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(d => new { d.SiteId, d.Name }).IsUnique();
        });

        modelBuilder.Entity<Kiosk>(entity =>
        {
            entity.HasKey(k => k.Id);
            entity.Property(k => k.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(k => k.IpAddress).HasMaxLength(64);
            entity.Property(k => k.Status).IsRequired().HasMaxLength(32);
            entity.HasIndex(k => k.MachineName).IsUnique();
            entity.HasOne(k => k.Site)
                  .WithMany(s => s.Kiosks)
                  .HasForeignKey(k => k.SiteId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(k => k.Department)
                  .WithMany(d => d.Kiosks)
                  .HasForeignKey(k => k.DepartmentId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Command>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(c => c.Type).IsRequired().HasMaxLength(100);
            entity.Property(c => c.Status).IsRequired().HasMaxLength(32);
            entity.HasIndex(c => new { c.MachineName, c.Status });
            entity.HasIndex(c => c.CreatedAt);
        });

        modelBuilder.Entity<Log>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(l => l.Level).IsRequired().HasMaxLength(32);
            entity.Property(l => l.Message).IsRequired();
            entity.HasIndex(l => new { l.MachineName, l.Timestamp });
        });

        modelBuilder.Entity<Alert>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(a => a.Type).IsRequired().HasMaxLength(64);
            entity.Property(a => a.Message).IsRequired();
            entity.HasIndex(a => new { a.MachineName, a.Type, a.IsResolved });
            entity.HasIndex(a => a.CreatedAt);
        });

        modelBuilder.Entity<SystemInfo>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(s => s.Hostname).IsRequired().HasMaxLength(200);
            entity.Property(s => s.OsVersion).IsRequired().HasMaxLength(512);
            entity.Property(s => s.IpAddress).HasMaxLength(64);
            entity.Property(s => s.Uptime).HasMaxLength(100);
            entity.Property(s => s.CurrentUser).HasMaxLength(200);
            entity.Property(s => s.DiskSummary).HasMaxLength(1000);
            entity.HasIndex(s => new { s.MachineName, s.CollectedAt });
        });

        modelBuilder.Entity<EventLogEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.LogName).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Source).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Level).IsRequired().HasMaxLength(32);
            entity.Property(e => e.Message).IsRequired();
            entity.HasIndex(e => new { e.MachineName, e.CollectedAt });
            entity.HasIndex(e => e.Timestamp);
        });

        modelBuilder.Entity<RdpSession>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(r => r.Username).IsRequired().HasMaxLength(200);
            entity.Property(r => r.SessionName).HasMaxLength(100);
            entity.Property(r => r.State).IsRequired().HasMaxLength(32);
            entity.HasIndex(r => new { r.MachineName, r.CollectedAt });
        });

        modelBuilder.Entity<WindowsService>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(s => s.ServiceName).IsRequired().HasMaxLength(200);
            entity.Property(s => s.DisplayName).IsRequired().HasMaxLength(300);
            entity.Property(s => s.Status).IsRequired().HasMaxLength(32);
            entity.Property(s => s.StartType).IsRequired().HasMaxLength(32);
            entity.HasIndex(s => new { s.MachineName, s.CollectedAt });
        });

        modelBuilder.Entity<WindowsProcess>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.MachineName).IsRequired().HasMaxLength(200);
            entity.Property(p => p.ProcessName).IsRequired().HasMaxLength(200);
            entity.HasIndex(p => new { p.MachineName, p.CollectedAt });
        });
    }
}
