namespace KioskAPI.Models;

public class GlobalSummary
{
    public int TotalSites { get; set; }
    public int TotalDepartments { get; set; }
    public int TotalKiosks { get; set; }
    public int OnlineKiosks { get; set; }
    public int OfflineKiosks { get; set; }
    public int ActiveAlerts { get; set; }
    public int FailedCommandsLast24h { get; set; }
}

public class SiteSummary
{
    public Guid SiteId { get; set; }
    public string SiteName { get; set; } = string.Empty;
    public int TotalDepartments { get; set; }
    public int TotalKiosks { get; set; }
    public int OnlineKiosks { get; set; }
    public int OfflineKiosks { get; set; }
    public int ActiveAlerts { get; set; }
    public int FailedCommandsLast24h { get; set; }
}

public class DepartmentSummary
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public Guid SiteId { get; set; }
    public int TotalKiosks { get; set; }
    public int OnlineKiosks { get; set; }
    public int OfflineKiosks { get; set; }
    public int ActiveAlerts { get; set; }
    public int FailedCommandsLast24h { get; set; }
}

public class IssueAlert
{
    public Guid Id { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class IssueCommand
{
    public Guid Id { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class ProblematicKiosk
{
    public string MachineName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime LastSeen { get; set; }
    public int ActiveAlerts { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class IssuesResponse
{
    public List<IssueAlert> RecentAlerts { get; set; } = new();
    public List<IssueCommand> FailedCommands { get; set; } = new();
    public List<ProblematicKiosk> ProblematicKiosks { get; set; } = new();
}

public class KioskOverview
{
    public string MachineName { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime LastSeen { get; set; }
    public Guid? SiteId { get; set; }
    public string? SiteName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int ActiveAlertsCount { get; set; }
    public int FailedCommandsLast24h { get; set; }
    public int LogsCountLast24h { get; set; }
}
