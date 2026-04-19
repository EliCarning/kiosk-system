using KioskAPI.Models;

namespace KioskAPI.Services;

public interface IRealtimeNotifier
{
    Task MachineUpdatedAsync(string machineName, string status, DateTime lastSeen, CancellationToken ct = default);
    Task AlertCreatedAsync(Alert alert, CancellationToken ct = default);
    Task CommandUpdatedAsync(Command command, CancellationToken ct = default);
}
