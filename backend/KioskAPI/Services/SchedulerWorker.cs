using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class SchedulerWorker : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SchedulerWorker> _logger;

    public SchedulerWorker(IServiceScopeFactory scopeFactory, ILogger<SchedulerWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SchedulerWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TickAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SchedulerWorker tick failed");
            }

            await Task.Delay(TickInterval, stoppingToken).ConfigureAwait(false);
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var commands = scope.ServiceProvider.GetRequiredService<ICommandService>();

        var now = DateTime.UtcNow;

        var due = await db.AgentSchedules
            .Where(s => s.IsEnabled && (s.NextRunAt == null || s.NextRunAt <= now))
            .ToListAsync(ct);

        if (due.Count == 0) return;

        _logger.LogInformation("Scheduler: {Count} schedule(s) due", due.Count);

        foreach (var schedule in due)
        {
            // Skip if there's already a Pending or Running command for this machine/type
            var alreadyQueued = await db.Commands.AnyAsync(
                c => c.MachineName == schedule.MachineName
                     && c.Type == schedule.CommandType
                     && (c.Status == CommandStatuses.Pending || c.Status == CommandStatuses.Running),
                ct);

            if (!alreadyQueued)
            {
                try
                {
                    var issuer = new CommandIssuer("scheduler", "Scheduler (automatic)", null);
                    await commands.EnqueueAsync(new CreateCommandRequest
                    {
                        MachineName = schedule.MachineName,
                        Type = schedule.CommandType,
                        Payload = schedule.Payload
                    }, issuer, ct);

                    _logger.LogInformation(
                        "Scheduler: queued {Type} for {Machine}",
                        schedule.CommandType, schedule.MachineName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Scheduler: failed to enqueue {Type} for {Machine}",
                        schedule.CommandType, schedule.MachineName);
                }
            }

            schedule.LastRunAt = now;
            schedule.NextRunAt = now.AddSeconds(schedule.IntervalSeconds);
        }

        await db.SaveChangesAsync(ct);
    }
}
