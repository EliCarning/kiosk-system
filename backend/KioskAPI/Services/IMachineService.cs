using KioskAPI.Models;

namespace KioskAPI.Services;

public interface IMachineService
{
    Task<IEnumerable<MachineStatus>> GetAllAsync(CancellationToken ct = default);
    Task<MachineStatus> UpsertAsync(HeartbeatRequest request, CancellationToken ct = default);
}
