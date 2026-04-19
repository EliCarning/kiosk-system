using KioskAPI.Hubs;
using KioskAPI.Models;
using Microsoft.AspNetCore.SignalR;

namespace KioskAPI.Services;

public class RealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<KioskHub> _hub;

    public RealtimeNotifier(IHubContext<KioskHub> hub)
    {
        _hub = hub;
    }

    public Task MachineUpdatedAsync(string machineName, string status, DateTime lastSeen, CancellationToken ct = default)
    {
        return _hub.Clients.All.SendAsync(
            "MachineUpdated",
            new { machineName, status, lastSeen },
            ct);
    }

    public Task AlertCreatedAsync(Alert alert, CancellationToken ct = default)
    {
        return _hub.Clients.All.SendAsync(
            "AlertCreated",
            new
            {
                id = alert.Id,
                machineName = alert.MachineName,
                type = alert.Type,
                message = alert.Message,
                createdAt = alert.CreatedAt,
                isResolved = alert.IsResolved
            },
            ct);
    }

    public Task CommandUpdatedAsync(Command command, CancellationToken ct = default)
    {
        return _hub.Clients.All.SendAsync(
            "CommandUpdated",
            new
            {
                id = command.Id,
                machineName = command.MachineName,
                type = command.Type,
                status = command.Status,
                createdAt = command.CreatedAt,
                completedAt = command.CompletedAt
            },
            ct);
    }
}
