using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Net.Http.Json;

namespace KioskAgent;

public class Worker(ILogger<Worker> logger) : BackgroundService
{
    private const string HeartbeatUrl = "http://localhost:5226/api/heartbeat";
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    private readonly HttpClient _httpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(10)
    };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var machineName = Environment.MachineName;

        while (!stoppingToken.IsCancellationRequested)
        {
            await SendHeartbeatAsync(machineName, stoppingToken);
            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    public override void Dispose()
    {
        _httpClient.Dispose();
        base.Dispose();
        GC.SuppressFinalize(this);
    }

    private async Task SendHeartbeatAsync(string machineName, CancellationToken stoppingToken)
    {
        try
        {
            var payload = new
            {
                machineName,
                ipAddress = GetLocalIPv4Address()
            };

            var response = await _httpClient.PostAsJsonAsync(HeartbeatUrl, payload, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("Heartbeat sent for {MachineName} at {Time}", machineName, DateTimeOffset.Now);
            }
            else
            {
                logger.LogWarning("Heartbeat failed for {MachineName}: {StatusCode}", machineName, response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error sending heartbeat for {MachineName}", machineName);
        }
    }

    private static string GetLocalIPv4Address()
    {
        foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (ni.OperationalStatus != OperationalStatus.Up) continue;
            if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

            foreach (var addr in ni.GetIPProperties().UnicastAddresses)
            {
                if (addr.Address.AddressFamily == AddressFamily.InterNetwork)
                {
                    return addr.Address.ToString();
                }
            }
        }

        return IPAddress.Loopback.ToString();
    }
}
