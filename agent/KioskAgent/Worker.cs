using System.Net;
using System.Net.Http.Json;

namespace KioskAgent;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public Worker(ILogger<Worker> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClient = new HttpClient();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var backendBaseUrl = _configuration["Backend:BaseUrl"]?.TrimEnd('/')
                             ?? "http://localhost:5226";
        var machineName = Environment.MachineName;

        var heartbeatUrl = $"{backendBaseUrl}/api/heartbeat";
        var logsUrl = $"{backendBaseUrl}/api/logs";
        var pendingCommandsUrl = $"{backendBaseUrl}/api/commands/{Uri.EscapeDataString(machineName)}/pending";

        _logger.LogInformation(
            "Kiosk agent started. Backend: {Url}, Machine: {Machine}",
            backendBaseUrl, machineName);

        await SendLogAsync(logsUrl, "Info", "Agent started", stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await SendHeartbeatAsync(heartbeatUrl, logsUrl, stoppingToken);
            await ProcessPendingCommandsAsync(
                pendingCommandsUrl, backendBaseUrl, logsUrl, stoppingToken);

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task SendHeartbeatAsync(
        string heartbeatUrl, string logsUrl, CancellationToken stoppingToken)
    {
        try
        {
            var payload = new
            {
                machineName = Environment.MachineName,
                ipAddress = GetLocalIpAddress()
            };

            _logger.LogInformation(
                "Sending heartbeat: {MachineName} @ {IpAddress}",
                payload.machineName, payload.ipAddress);

            var response = await _httpClient.PostAsJsonAsync(
                heartbeatUrl, payload, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Heartbeat sent successfully");
            }
            else
            {
                _logger.LogWarning(
                    "Heartbeat failed with status {Status}",
                    response.StatusCode);
                await SendLogAsync(
                    logsUrl, "Error",
                    $"Heartbeat failed with status {(int)response.StatusCode}",
                    stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending heartbeat");
            await SendLogAsync(
                logsUrl, "Error",
                $"Heartbeat exception: {ex.Message}",
                stoppingToken);
        }
    }

    private async Task ProcessPendingCommandsAsync(
        string pendingCommandsUrl,
        string backendBaseUrl,
        string logsUrl,
        CancellationToken stoppingToken)
    {
        List<PendingCommand>? commands;
        try
        {
            commands = await _httpClient.GetFromJsonAsync<List<PendingCommand>>(
                pendingCommandsUrl, stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending commands");
            await SendLogAsync(
                logsUrl, "Error",
                $"Fetch commands exception: {ex.Message}",
                stoppingToken);
            return;
        }

        if (commands is null || commands.Count == 0)
        {
            return;
        }

        _logger.LogInformation(
            "Received {Count} pending command(s)", commands.Count);

        foreach (var command in commands)
        {
            if (stoppingToken.IsCancellationRequested) break;
            await HandleCommandAsync(command, backendBaseUrl, logsUrl, stoppingToken);
        }
    }

    private async Task HandleCommandAsync(
        PendingCommand command,
        string backendBaseUrl,
        string logsUrl,
        CancellationToken stoppingToken)
    {
        var type = command.Type?.Trim() ?? string.Empty;
        var success = true;
        string level;
        string message;

        switch (type.ToLowerInvariant())
        {
            case "ping":
                level = "Info";
                message = "Ping received";
                break;
            case "restart_service":
                level = "Info";
                message = "Restart service simulated";
                break;
            case "restart_browser":
                level = "Info";
                message = "Restart browser simulated";
                break;
            case "gpupdate":
                level = "Info";
                message = "GPUpdate simulated";
                break;
            case "reboot":
                level = "Info";
                message = "Reboot simulated";
                break;
            default:
                level = "Warning";
                message = $"Unknown command type: {type}";
                success = false;
                _logger.LogWarning(
                    "Unknown command type {Type} for command {Id}",
                    type, command.Id);
                break;
        }

        if (success)
        {
            _logger.LogInformation(
                "Executing command {Id} ({Type}): {Message}",
                command.Id, type, message);
        }

        await SendLogAsync(logsUrl, level, message, stoppingToken);
        await CompleteCommandAsync(
            backendBaseUrl, command.Id, success, logsUrl, stoppingToken);
    }

    private async Task CompleteCommandAsync(
        string backendBaseUrl,
        Guid commandId,
        bool success,
        string logsUrl,
        CancellationToken stoppingToken)
    {
        var completeUrl = $"{backendBaseUrl}/api/commands/{commandId}/complete";

        try
        {
            var payload = new { success };
            var response = await _httpClient.PostAsJsonAsync(
                completeUrl, payload, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation(
                    "Command {Id} marked {Status}",
                    commandId, success ? "completed" : "failed");
            }
            else
            {
                _logger.LogWarning(
                    "Failed to complete command {Id}: status {Status}",
                    commandId, response.StatusCode);
                await SendLogAsync(
                    logsUrl, "Error",
                    $"Complete command {commandId} failed with status {(int)response.StatusCode}",
                    stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing command {Id}", commandId);
            await SendLogAsync(
                logsUrl, "Error",
                $"Complete command {commandId} exception: {ex.Message}",
                stoppingToken);
        }
    }

    private async Task SendLogAsync(
        string logsUrl, string level, string message, CancellationToken ct)
    {
        try
        {
            var payload = new
            {
                machineName = Environment.MachineName,
                level,
                message,
                timestamp = DateTime.UtcNow
            };

            await _httpClient.PostAsJsonAsync(logsUrl, payload, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send log entry");
        }
    }

    private static string GetLocalIpAddress()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            var ip = host.AddressList.FirstOrDefault(a =>
                a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
            return ip?.ToString() ?? "127.0.0.1";
        }
        catch
        {
            return "127.0.0.1";
        }
    }

    private sealed class PendingCommand
    {
        public Guid Id { get; set; }
        public string MachineName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Payload { get; set; }
        public int Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}
