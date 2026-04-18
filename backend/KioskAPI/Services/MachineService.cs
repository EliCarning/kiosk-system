using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class MachineService : IMachineService
{
    public static readonly TimeSpan OnlineThreshold = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan OfflineAlertThreshold = TimeSpan.FromMinutes(2);

    private readonly AppDbContext _db;
    private readonly IAlertService _alerts;

    public MachineService(AppDbContext db, IAlertService alerts)
    {
        _db = db;
        _alerts = alerts;
    }

    public async Task<IEnumerable<MachineStatus>> GetAllAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var kiosks = await _db.Kiosks
            .AsNoTracking()
            .OrderBy(k => k.MachineName)
            .ToListAsync(ct);

        foreach (var k in kiosks)
        {
            if ((now - k.LastSeen) > OfflineAlertThreshold)
            {
                await _alerts.RaiseAsync(
                    k.MachineName,
                    AlertTypes.Offline,
                    $"{k.MachineName} has not reported in over {(int)OfflineAlertThreshold.TotalMinutes} minute(s).",
                    dedupeActive: true,
                    ct: ct);
            }
        }

        return kiosks.Select(k => new MachineStatus
        {
            MachineName = k.MachineName,
            IpAddress = k.IpAddress,
            LastSeen = k.LastSeen,
            Status = (now - k.LastSeen) <= OnlineThreshold ? "Online" : "Offline"
        });
    }

    public async Task<MachineStatus> UpsertAsync(HeartbeatRequest request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var kiosk = await _db.Kiosks
            .FirstOrDefaultAsync(k => k.MachineName == request.MachineName, ct);

        if (kiosk is null)
        {
            kiosk = new Kiosk
            {
                MachineName = request.MachineName,
                IpAddress = request.IpAddress,
                LastSeen = now,
                Status = "Online"
            };
            _db.Kiosks.Add(kiosk);
        }
        else
        {
            kiosk.IpAddress = request.IpAddress;
            kiosk.LastSeen = now;
            kiosk.Status = "Online";
        }

        await _db.SaveChangesAsync(ct);

        var activeOffline = await _db.Alerts
            .Where(a => a.MachineName == request.MachineName
                        && a.Type == AlertTypes.Offline
                        && !a.IsResolved)
            .ToListAsync(ct);
        if (activeOffline.Count > 0)
        {
            foreach (var a in activeOffline)
            {
                a.IsResolved = true;
                a.ResolvedAt = now;
            }
            await _db.SaveChangesAsync(ct);
        }

        return new MachineStatus
        {
            MachineName = kiosk.MachineName,
            IpAddress = kiosk.IpAddress,
            LastSeen = kiosk.LastSeen,
            Status = "Online"
        };
    }
}
