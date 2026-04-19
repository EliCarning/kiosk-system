using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class DashboardService : IDashboardService
{
    private static readonly TimeSpan FailedWindow = TimeSpan.FromHours(24);
    private const int RecentAlertsLimit = 20;
    private const int FailedCommandsLimit = 20;
    private const int ProblematicKiosksLimit = 20;

    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<GlobalSummary> GetGlobalSummaryAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var onlineCutoff = now - MachineService.OnlineThreshold;
        var failedCutoff = now - FailedWindow;

        var totalSites = await _db.Sites.CountAsync(ct);
        var totalDepartments = await _db.Departments.CountAsync(ct);
        var totalKiosks = await _db.Kiosks.CountAsync(ct);
        var online = await _db.Kiosks.CountAsync(k => k.LastSeen >= onlineCutoff, ct);
        var offline = totalKiosks - online;
        var activeAlerts = await _db.Alerts.CountAsync(a => !a.IsResolved, ct);
        var failedCommands = await _db.Commands
            .CountAsync(c => c.Status == CommandStatuses.Failed
                             && c.CreatedAt >= failedCutoff, ct);

        return new GlobalSummary
        {
            TotalSites = totalSites,
            TotalDepartments = totalDepartments,
            TotalKiosks = totalKiosks,
            OnlineKiosks = online,
            OfflineKiosks = offline,
            ActiveAlerts = activeAlerts,
            FailedCommandsLast24h = failedCommands
        };
    }

    public async Task<SiteSummary?> GetSiteSummaryAsync(Guid siteId, CancellationToken ct = default)
    {
        var site = await _db.Sites.FirstOrDefaultAsync(s => s.Id == siteId, ct);
        if (site is null) return null;

        var now = DateTime.UtcNow;
        var onlineCutoff = now - MachineService.OnlineThreshold;
        var failedCutoff = now - FailedWindow;

        var totalDepartments = await _db.Departments.CountAsync(d => d.SiteId == siteId, ct);
        var kiosks = await _db.Kiosks
            .Where(k => k.SiteId == siteId)
            .Select(k => new { k.MachineName, k.LastSeen })
            .ToListAsync(ct);
        var names = kiosks.Select(k => k.MachineName).ToList();

        var activeAlerts = names.Count == 0 ? 0 : await _db.Alerts
            .CountAsync(a => !a.IsResolved && names.Contains(a.MachineName), ct);
        var failedCommands = names.Count == 0 ? 0 : await _db.Commands
            .CountAsync(c => c.Status == CommandStatuses.Failed
                             && c.CreatedAt >= failedCutoff
                             && names.Contains(c.MachineName), ct);

        return new SiteSummary
        {
            SiteId = site.Id,
            SiteName = site.Name,
            TotalDepartments = totalDepartments,
            TotalKiosks = kiosks.Count,
            OnlineKiosks = kiosks.Count(k => k.LastSeen >= onlineCutoff),
            OfflineKiosks = kiosks.Count(k => k.LastSeen < onlineCutoff),
            ActiveAlerts = activeAlerts,
            FailedCommandsLast24h = failedCommands
        };
    }

    public async Task<DepartmentSummary?> GetDepartmentSummaryAsync(Guid departmentId, CancellationToken ct = default)
    {
        var dept = await _db.Departments.FirstOrDefaultAsync(d => d.Id == departmentId, ct);
        if (dept is null) return null;

        var now = DateTime.UtcNow;
        var onlineCutoff = now - MachineService.OnlineThreshold;
        var failedCutoff = now - FailedWindow;

        var kiosks = await _db.Kiosks
            .Where(k => k.DepartmentId == departmentId)
            .Select(k => new { k.MachineName, k.LastSeen })
            .ToListAsync(ct);
        var names = kiosks.Select(k => k.MachineName).ToList();

        var activeAlerts = names.Count == 0 ? 0 : await _db.Alerts
            .CountAsync(a => !a.IsResolved && names.Contains(a.MachineName), ct);
        var failedCommands = names.Count == 0 ? 0 : await _db.Commands
            .CountAsync(c => c.Status == CommandStatuses.Failed
                             && c.CreatedAt >= failedCutoff
                             && names.Contains(c.MachineName), ct);

        return new DepartmentSummary
        {
            DepartmentId = dept.Id,
            DepartmentName = dept.Name,
            SiteId = dept.SiteId,
            TotalKiosks = kiosks.Count,
            OnlineKiosks = kiosks.Count(k => k.LastSeen >= onlineCutoff),
            OfflineKiosks = kiosks.Count(k => k.LastSeen < onlineCutoff),
            ActiveAlerts = activeAlerts,
            FailedCommandsLast24h = failedCommands
        };
    }

    public async Task<IssuesResponse?> GetSiteIssuesAsync(Guid siteId, CancellationToken ct = default)
    {
        var siteExists = await _db.Sites.AnyAsync(s => s.Id == siteId, ct);
        if (!siteExists) return null;

        var names = await _db.Kiosks
            .Where(k => k.SiteId == siteId)
            .Select(k => k.MachineName)
            .ToListAsync(ct);

        return await BuildIssuesAsync(names, ct);
    }

    public async Task<IssuesResponse?> GetDepartmentIssuesAsync(Guid departmentId, CancellationToken ct = default)
    {
        var deptExists = await _db.Departments.AnyAsync(d => d.Id == departmentId, ct);
        if (!deptExists) return null;

        var names = await _db.Kiosks
            .Where(k => k.DepartmentId == departmentId)
            .Select(k => k.MachineName)
            .ToListAsync(ct);

        return await BuildIssuesAsync(names, ct);
    }

    public async Task<KioskOverview?> GetKioskOverviewAsync(string machineName, CancellationToken ct = default)
    {
        var kiosk = await _db.Kiosks
            .AsNoTracking()
            .Where(k => k.MachineName == machineName)
            .Select(k => new
            {
                k.MachineName,
                k.IpAddress,
                k.LastSeen,
                k.SiteId,
                k.DepartmentId,
                SiteName = k.Site != null ? k.Site.Name : null,
                DepartmentName = k.Department != null ? k.Department.Name : null
            })
            .FirstOrDefaultAsync(ct);

        if (kiosk is null) return null;

        var now = DateTime.UtcNow;
        var onlineCutoff = now - MachineService.OnlineThreshold;
        var failedCutoff = now - FailedWindow;

        var activeAlerts = await _db.Alerts
            .CountAsync(a => !a.IsResolved && a.MachineName == machineName, ct);
        var failedCommands = await _db.Commands
            .CountAsync(c => c.Status == CommandStatuses.Failed
                             && c.CreatedAt >= failedCutoff
                             && c.MachineName == machineName, ct);
        var logsCount = await _db.Logs
            .CountAsync(l => l.MachineName == machineName
                             && l.Timestamp >= failedCutoff, ct);

        return new KioskOverview
        {
            MachineName = kiosk.MachineName,
            IpAddress = kiosk.IpAddress,
            Status = kiosk.LastSeen >= onlineCutoff ? "Online" : "Offline",
            LastSeen = kiosk.LastSeen,
            SiteId = kiosk.SiteId,
            SiteName = kiosk.SiteName,
            DepartmentId = kiosk.DepartmentId,
            DepartmentName = kiosk.DepartmentName,
            ActiveAlertsCount = activeAlerts,
            FailedCommandsLast24h = failedCommands,
            LogsCountLast24h = logsCount
        };
    }

    public async Task<List<IssueAlert>> GetKioskRecentAlertsAsync(string machineName, int limit = 20, CancellationToken ct = default)
    {
        if (limit <= 0) limit = 20;
        if (limit > 100) limit = 100;

        return await _db.Alerts
            .AsNoTracking()
            .Where(a => a.MachineName == machineName)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new IssueAlert
            {
                Id = a.Id,
                MachineName = a.MachineName,
                Type = a.Type,
                Message = a.Message,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(ct);
    }

    private async Task<IssuesResponse> BuildIssuesAsync(List<string> machineNames, CancellationToken ct)
    {
        var response = new IssuesResponse();
        if (machineNames.Count == 0) return response;

        var now = DateTime.UtcNow;
        var onlineCutoff = now - MachineService.OnlineThreshold;
        var failedCutoff = now - FailedWindow;

        response.RecentAlerts = await _db.Alerts
            .AsNoTracking()
            .Where(a => !a.IsResolved && machineNames.Contains(a.MachineName))
            .OrderByDescending(a => a.CreatedAt)
            .Take(RecentAlertsLimit)
            .Select(a => new IssueAlert
            {
                Id = a.Id,
                MachineName = a.MachineName,
                Type = a.Type,
                Message = a.Message,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(ct);

        response.FailedCommands = await _db.Commands
            .AsNoTracking()
            .Where(c => c.Status == CommandStatuses.Failed
                        && c.CreatedAt >= failedCutoff
                        && machineNames.Contains(c.MachineName))
            .OrderByDescending(c => c.CreatedAt)
            .Take(FailedCommandsLimit)
            .Select(c => new IssueCommand
            {
                Id = c.Id,
                MachineName = c.MachineName,
                Type = c.Type,
                CreatedAt = c.CreatedAt,
                CompletedAt = c.CompletedAt
            })
            .ToListAsync(ct);

        var kiosks = await _db.Kiosks
            .AsNoTracking()
            .Where(k => machineNames.Contains(k.MachineName))
            .Select(k => new { k.MachineName, k.LastSeen })
            .ToListAsync(ct);

        var alertCounts = await _db.Alerts
            .AsNoTracking()
            .Where(a => !a.IsResolved && machineNames.Contains(a.MachineName))
            .GroupBy(a => a.MachineName)
            .Select(g => new { MachineName = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var alertMap = alertCounts.ToDictionary(x => x.MachineName, x => x.Count);

        var problematic = new List<ProblematicKiosk>();
        foreach (var k in kiosks)
        {
            var offline = k.LastSeen < onlineCutoff;
            var alerts = alertMap.TryGetValue(k.MachineName, out var c) ? c : 0;
            if (!offline && alerts == 0) continue;

            var reasons = new List<string>();
            if (offline) reasons.Add("offline");
            if (alerts > 0) reasons.Add($"{alerts} active alert(s)");

            problematic.Add(new ProblematicKiosk
            {
                MachineName = k.MachineName,
                Status = offline ? "Offline" : "Online",
                LastSeen = k.LastSeen,
                ActiveAlerts = alerts,
                Reason = string.Join(", ", reasons)
            });
        }

        response.ProblematicKiosks = problematic
            .OrderByDescending(p => p.ActiveAlerts)
            .ThenBy(p => p.LastSeen)
            .Take(ProblematicKiosksLimit)
            .ToList();

        return response;
    }
}
