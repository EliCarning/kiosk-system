using System.Collections.Concurrent;
using KioskAPI.Models;

namespace KioskAPI.Services;

public class MachineService : IMachineService
{
    private readonly ConcurrentDictionary<string, MachineStatus> _machines = new();

    public IEnumerable<MachineStatus> GetAll()
    {
        return _machines.Values.OrderBy(x => x.MachineName);
    }

    public MachineStatus Upsert(HeartbeatRequest request)
    {
        var machine = new MachineStatus
        {
            MachineName = request.MachineName,
            IpAddress = request.IpAddress,
            LastSeen = DateTime.UtcNow,
            Status = "Online"
        };

        _machines.AddOrUpdate(request.MachineName, machine, (_, _) => machine);
        return machine;
    }
}
