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
            CreatedAt = DateTime.UtcNow,
            IsResolved = false,
            ResolvedAt = null
        };

        _db.Alerts.Add(alert);
        await _db.SaveChangesAsync(ct);
        await _realtime.AlertCreatedAsync(alert, ct);

        // Fire-and-forget delivery — never await, never throw into caller
        _ = Task.Run(() => _delivery.SendAsync(alert, CancellationToken.None), CancellationToken.None);

        return alert;
    }
}
