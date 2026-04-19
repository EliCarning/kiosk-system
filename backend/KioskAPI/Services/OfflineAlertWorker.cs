using KioskAPI.Data;
using KioskAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace KioskAPI.Services;

public class OfflineAlertWorker : BackgroundService
{
    public static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(30);

    private readonly IServiceProvider _services;
    private readonly ILogger<OfflineAlertWorker> _logger;

    public OfflineAlertWorker(
        IServiceProvider services,
        ILogger<OfflineAlertWorker> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "OfflineAlertWorker started; checking every {Seconds}s.",
            CheckInterval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCheckAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OfflineAlertWorker check failed.");
            }

            try
            {
                await Task.Delay(CheckInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task RunCheckAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var alerts = scope.ServiceProvider.GetRequiredService<IAlertService>();

        var now = DateTime.UtcNow;
        var cutoff = now - MachineService.OfflineAlertThreshold;

        var stale = await db.Kiosks
            .AsNoTracking()
            .Where(k => k.LastSeen < cutoff)
            .ToListAsync(ct);

        foreach (var kiosk in stale)
        {
            await alerts.RaiseAsync(
                kiosk.MachineName,
                AlertTypes.Offline,
                $"{kiosk.MachineName} has not reported in over " +
                    $"{(int)MachineService.OfflineAlertThreshold.TotalMinutes} minute(s).",
                dedupeActive: true,
                ct: ct);
        }

        if (stale.Count > 0)
        {
            _logger.LogDebug(
                "OfflineAlertWorker evaluated {Count} stale kiosk(s).",
                stale.Count);
        }
    }
}
