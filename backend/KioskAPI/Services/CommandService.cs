using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class CommandService : ICommandService
{
    private readonly AppDbContext _db;

    public CommandService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Command> EnqueueAsync(CreateCommandRequest request, CancellationToken ct = default)
    {
        var command = new Command
        {
            Id = Guid.NewGuid(),
            MachineName = request.MachineName,
            Type = request.Type,
            Payload = request.Payload,
            Status = CommandStatuses.Pending,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = null
        };

        _db.Commands.Add(command);
        await _db.SaveChangesAsync(ct);
        return command;
    }

    public async Task<IEnumerable<Command>> GetPendingAsync(string machineName, CancellationToken ct = default)
    {
        return await _db.Commands
            .AsNoTracking()
            .Where(c => c.MachineName == machineName && c.Status == CommandStatuses.Pending)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Command>> GetByMachineAsync(string machineName, CancellationToken ct = default)
    {
        return await _db.Commands
            .AsNoTracking()
            .Where(c => c.MachineName == machineName)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<Command?> CompleteAsync(Guid id, bool success, CancellationToken ct = default)
    {
        var command = await _db.Commands.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (command is null)
        {
            return null;
        }

        command.Status = success ? CommandStatuses.Completed : CommandStatuses.Failed;
        command.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return command;
    }

    public async Task<Command?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Commands
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);
    }
}
