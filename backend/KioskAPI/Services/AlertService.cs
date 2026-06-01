using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class AlertService : IAlertService
{
    private readonly AppDbContext _db;
    private readonly IRealtimeNotifier _realtime;
    private readonly IAlertDeliveryService _delivery;

    public AlertService(AppDbContext db, IRealtimeNotifier realtime, IAlertDeliveryService delivery)
    {
        _db = db;
        _realtime = realtime;
        _delivery = delivery;
    }

    public async Task<IEnumerable<Alert>> GetActiveAsync(CancellationToken ct = default)
    {
        return await _db.Alerts
            .AsNoTracking()
            .Where(a => !a.IsResolved)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Alert>> GetHistoryAsync(CancellationToken ct = default)
    {
        return await _db.Alerts
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<Alert?> ResolveAsync(Guid id, CancellationToken ct = default)
    {
        var alert = await _db.Alerts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (alert is null) return null;

        if (!alert.IsResolved)
        {
            alert.IsResolved = true;
            alert.ResolvedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return alert;
    }

    public async Task<Alert?> RaiseAsync(
        string machineName,
        string type,
        string message,
        string? failureReason = null,
        bool dedupeActive = true,
        CancellationToken ct = default)
    {
        if (dedupeActive)
        {
            var existing = await _db.Alerts
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    a => a.MachineName == machineName
                         && a.Type == type
                         && !a.IsResolved,
                    ct);
            if (existing is not null) return existing;
        }

        var alert = new Alert
        {
            Id = Guid.NewGuid(),
            MachineName = machineName,
            Type = type,
            Message = message,
            FailureReason = string.IsNullOrWhiteSpace(failureReason)
                ? InferFailureReason(type, message)
                : failureReason.Trim(),
            CreatedAt = DateTime.UtcNow,
            IsResolved = false,
            ResolvedAt = null,
            NotificationSentAt = null
        };

        _db.Alerts.Add(alert);
        await _db.SaveChangesAsync(ct);
        await _realtime.AlertCreatedAsync(alert, ct);

        var sent = await _delivery.SendAsync(alert, ct);
        if (sent)
        {
            alert.NotificationSentAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return alert;
    }

    private static string InferFailureReason(string type, string message)
    {
        if (string.Equals(type, AlertTypes.Offline, StringComparison.OrdinalIgnoreCase))
        {
            return "No heartbeat received";
        }

        if (string.Equals(type, AlertTypes.CommandFailed, StringComparison.OrdinalIgnoreCase))
        {
            return message.Contains("browser", StringComparison.OrdinalIgnoreCase)
                   || message.Contains("service", StringComparison.OrdinalIgnoreCase)
                ? "Browser/service command failed"
                : "Last command failed";
        }

        return "Unknown";
    }
}
