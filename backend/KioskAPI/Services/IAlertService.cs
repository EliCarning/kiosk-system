using KioskAPI.Models;

namespace KioskAPI.Services;

public interface IAlertService
{
    Task<IEnumerable<Alert>> GetActiveAsync(CancellationToken ct = default);
    Task<IEnumerable<Alert>> GetHistoryAsync(CancellationToken ct = default);
    Task<Alert?> ResolveAsync(Guid id, CancellationToken ct = default);
    Task<Alert?> RaiseAsync(
        string machineName,
        string type,
        string message,
        string? failureReason = null,
        bool dedupeActive = true,
        CancellationToken ct = default);
}
