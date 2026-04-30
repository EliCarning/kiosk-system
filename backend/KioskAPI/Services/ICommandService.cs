using KioskAPI.Models;

namespace KioskAPI.Services;

public interface ICommandService
{
    Task<Command> EnqueueAsync(CreateCommandRequest request, CommandIssuer? issuer = null, CancellationToken ct = default);
    Task<IEnumerable<Command>> GetPendingAsync(string machineName, CancellationToken ct = default);
    Task<IEnumerable<Command>> GetByMachineAsync(string machineName, CancellationToken ct = default);
    Task<Command?> MarkRunningAsync(Guid id, CancellationToken ct = default);
    Task<Command?> CompleteAsync(Guid id, bool success, CancellationToken ct = default);
    Task<Command?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Command>> GetRecentAsync(int limit = 100, string? status = null, CancellationToken ct = default);
}
