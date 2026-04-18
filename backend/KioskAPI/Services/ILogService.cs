using KioskAPI.Models;

namespace KioskAPI.Services;

public interface ILogService
{
    Task<Log> AddAsync(Log log, CancellationToken ct = default);
    Task<IEnumerable<Log>> GetByMachineAsync(string machineName, CancellationToken ct = default);
}
