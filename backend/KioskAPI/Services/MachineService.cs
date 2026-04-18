using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class MachineService : IMachineService
{
    private static readonly TimeSpan OnlineThreshold = TimeSpan.FromSeconds(30);

    private readonly AppDbContext _db;

    public MachineService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<MachineStatus>> GetAllAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var kiosks = await _db.Kiosks
            .AsNoTracking()
            .OrderBy(k => k.MachineName)
            .ToListAsync(ct);

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

        return new MachineStatus
        {
            MachineName = kiosk.MachineName,
            IpAddress = kiosk.IpAddress,
            LastSeen = kiosk.LastSeen,
            Status = "Online"
        };
    }
}
