using KioskAPI.Models;

namespace KioskAPI.Services;

public interface IMachineService
{
    IEnumerable<MachineStatus> GetAll();
    MachineStatus Upsert(HeartbeatRequest request);
}
