using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class CommandService : ICommandService
{
    private readonly AppDbContext _db;
    private readonly IAlertService _alerts;
    private readonly IRealtimeNotifier _realtime;
    private readonly ICommandSafetyValidator _commandSafety;
    private readonly ILogger<CommandService> _logger;

    public CommandService(
        AppDbContext db,
        IAlertService alerts,
        IRealtimeNotifier realtime,
        ICommandSafetyValidator commandSafety,
        ILogger<CommandService> logger)
    {
        _db = db;
        _alerts = alerts;
        _realtime = realtime;
        _commandSafety = commandSafety;
        _logger = logger;
    }

    public async Task<Command> EnqueueAsync(CreateCommandRequest request, CommandIssuer? issuer = null, CancellationToken ct = default)
    {
        var validation = _commandSafety.Validate(request.Type, request.Payload);
        if (!validation.IsValid)
        {
            throw new ArgumentException(validation.Error, nameof(request));
        }

        var command = new Command
        {
            Id = Guid.NewGuid(),
            MachineName = request.MachineName.Trim(),
            Type = validation.NormalizedType,
            Payload = validation.NormalizedPayload,
            Status = CommandStatuses.Pending,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = null,
            IssuedByUsername = issuer?.Username,
            IssuedByDisplayName = issuer?.DisplayName,
            IssuedFromIp = issuer?.IpAddress
        };

        _db.Commands.Add(command);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "Command queued: type={Type}, kiosk={Kiosk}, timestamp={Timestamp:o}, result={Result}",
            command.Type, command.MachineName, command.CreatedAt, command.Status);
        await _realtime.CommandUpdatedAsync(command, ct);
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

    public async Task<Command?> MarkRunningAsync(Guid id, CancellationToken ct = default)
    {
        var command = await _db.Commands.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (command is null)
        {
            return null;
        }

        if (command.Status == CommandStatuses.Pending)
        {
            command.Status = CommandStatuses.Running;
            await _db.SaveChangesAsync(ct);
            await _realtime.CommandUpdatedAsync(command, ct);
        }

        return command;
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
        _logger.LogInformation(
            "Command completed: type={Type}, kiosk={Kiosk}, timestamp={Timestamp:o}, result={Result}",
            command.Type, command.MachineName, command.CompletedAt, command.Status);
        await _realtime.CommandUpdatedAsync(command, ct);

        if (!success)
        {
            await _alerts.RaiseAsync(
                command.MachineName,
                AlertTypes.CommandFailed,
                $"Command '{command.Type}' failed on {command.MachineName}",
                dedupeActive: false,
                ct: ct);
        }

        return command;
    }

    public async Task<Command?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Commands
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    public async Task<IEnumerable<Command>> GetRecentAsync(int limit = 100, string? status = null, CancellationToken ct = default)
    {
        if (limit <= 0) limit = 100;
        if (limit > 500) limit = 500;

        var query = _db.Commands.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(c => c.Status == status);
        }

        return await query
            .OrderByDescending(c => c.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }
}
