using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class LogService : ILogService
{
    private readonly AppDbContext _db;

    public LogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Log> AddAsync(Log log, CancellationToken ct = default)
    {
        log.Id = Guid.NewGuid();
        if (log.Timestamp == default)
        {
            log.Timestamp = DateTime.UtcNow;
        }

        _db.Logs.Add(log);
        await _db.SaveChangesAsync(ct);
        return log;
    }

    public async Task<IEnumerable<Log>> GetByMachineAsync(string machineName, CancellationToken ct = default)
    {
        return await _db.Logs
            .AsNoTracking()
            .Where(l => l.MachineName == machineName)
            .OrderByDescending(l => l.Timestamp)
            .ToListAsync(ct);
    }
}
