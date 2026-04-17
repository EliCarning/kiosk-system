using System.Net;
using System.Net.Http.Json;

namespace KioskAgent;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly HttpClient _httpClient;

    public Worker(ILogger<Worker> logger)
    {
        _logger = logger;
        _httpClient = new HttpClient();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Agent started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var ip = GetLocalIpAddress();

                var payload = new
                {
                    machineName = Environment.MachineName,
                    ipAddress = ip
                };

                var response = await _httpClient.PostAsJsonAsync(
                    "http://localhost:5226/api/heartbeat",
                    payload,
                    stoppingToken
                );

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Heartbeat sent successfully");
                }
                else
                {
                    _logger.LogWarning("Heartbeat failed: {Status}", response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending heartbeat");
            }

            await Task.Delay(30000, stoppingToken);
        }
    }

    private string GetLocalIpAddress()
    {
        var host = Dns.GetHostEntry(Dns.GetHostName());
        var ip = host.AddressList.FirstOrDefault(ip =>
            ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);

        return ip?.ToString() ?? "unknown";
    }
}