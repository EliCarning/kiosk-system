using KioskAPI.Models;

namespace KioskAPI.Services;

public interface IDashboardService
{
    Task<GlobalSummary> GetGlobalSummaryAsync(CancellationToken ct = default);
    Task<SiteSummary?> GetSiteSummaryAsync(Guid siteId, CancellationToken ct = default);
    Task<DepartmentSummary?> GetDepartmentSummaryAsync(Guid departmentId, CancellationToken ct = default);
    Task<IssuesResponse?> GetSiteIssuesAsync(Guid siteId, CancellationToken ct = default);
    Task<IssuesResponse?> GetDepartmentIssuesAsync(Guid departmentId, CancellationToken ct = default);
    Task<KioskOverview?> GetKioskOverviewAsync(string machineName, CancellationToken ct = default);
    Task<List<IssueAlert>> GetKioskRecentAlertsAsync(string machineName, int limit = 20, CancellationToken ct = default);
}
