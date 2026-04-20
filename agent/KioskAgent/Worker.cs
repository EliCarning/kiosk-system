using System.Net;
using System.Net.Http.Json;
using System.Runtime.InteropServices;

namespace KioskAgent;

public class Worker : BackgroundService
{
    private const string AgentKeyHeader = "X-Agent-Key";

    private readonly ILogger<Worker> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public Worker(ILogger<Worker> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClient = new HttpClient();

        var apiKey = _configuration["Agent:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Remove(AgentKeyHeader);
            _httpClient.DefaultRequestHeaders.Add(AgentKeyHeader, apiKey);
        }
        else
        {
            _logger.LogWarning(
                "Agent:ApiKey is not configured. Authenticated endpoints will fail.");
        }
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
        await MarkCommandRunningAsync(backendBaseUrl, command.Id, logsUrl, stoppingToken);

        var type = command.Type?.Trim() ?? string.Empty;
        var success = true;
        string level;
        string message;

        try
        {
            switch (type.ToLowerInvariant())
            {
                case "ping":
                    level = "Info";
                    message = "Ping received";
                    break;
                case "refresh_cache":
                    level = "Info";
                    message = "Refresh cache simulated";
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
                case "collect_system_info":
                    (success, message) = await CollectAndSendSystemInfoAsync(
                        backendBaseUrl, logsUrl, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;
                case "collect_event_logs":
                    (success, message) = await CollectAndSendEventLogsAsync(
                        backendBaseUrl, logsUrl, stoppingToken);
                    level = success ? "Info" : "Error";
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
        }
        catch (Exception ex)
        {
            level = "Error";
            message = $"Command execution failed: {ex.Message}";
            success = false;
            _logger.LogError(ex, "Error executing command {Id}", command.Id);
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

    private async Task MarkCommandRunningAsync(
        string backendBaseUrl,
        Guid commandId,
        string logsUrl,
        CancellationToken stoppingToken)
    {
        var startUrl = $"{backendBaseUrl}/api/commands/{commandId}/start";
        try
        {
            var response = await _httpClient.PostAsync(startUrl, content: null, stoppingToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Failed to mark command {Id} running: status {Status}",
                    commandId, response.StatusCode);
                await SendLogAsync(
                    logsUrl, "Warning",
                    $"Mark running {commandId} failed with status {(int)response.StatusCode}",
                    stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking command {Id} running", commandId);
            await SendLogAsync(
                logsUrl, "Error",
                $"Mark running {commandId} exception: {ex.Message}",
                stoppingToken);
        }
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

    private async Task<(bool success, string message)> CollectAndSendSystemInfoAsync(
        string backendBaseUrl,
        string logsUrl,
        CancellationToken ct)
    {
        try
        {
            var uptimeSpan = TimeSpan.FromMilliseconds(Environment.TickCount64);
            var uptimeStr = $"{(int)uptimeSpan.TotalDays}d {uptimeSpan.Hours}h {uptimeSpan.Minutes}m";

            var payload = new
            {
                machineName = Environment.MachineName,
                hostname = Dns.GetHostName(),
                osVersion = RuntimeInformation.OSDescription,
                ipAddress = GetLocalIpAddress(),
                uptime = uptimeStr,
                currentUser = Environment.UserName
            };

            _logger.LogInformation(
                "Collecting system info for {MachineName}: OS={OS}, IP={IP}",
                payload.machineName, payload.osVersion, payload.ipAddress);

            var url = $"{backendBaseUrl}/api/system-info";
            var response = await _httpClient.PostAsJsonAsync(url, payload, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning(
                    "System info POST failed: {Status} {Body}",
                    response.StatusCode, body);
                return (false, $"System info upload failed: HTTP {(int)response.StatusCode}");
            }

            return (true, $"System info collected and sent for {payload.machineName}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting system info");
            return (false, $"System info collection failed: {ex.Message}");
        }
    }

    private async Task<(bool success, string message)> CollectAndSendEventLogsAsync(
        string backendBaseUrl,
        string logsUrl,
        CancellationToken ct)
    {
        try
        {
            var entries = CollectWindowsEventLogs();

            _logger.LogInformation(
                "Collected {Count} event log entries for {MachineName}",
                entries.Count, Environment.MachineName);

            var batch = new
            {
                machineName = Environment.MachineName,
                entries
            };

            var url = $"{backendBaseUrl}/api/event-logs";
            var response = await _httpClient.PostAsJsonAsync(url, batch, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning(
                    "Event logs POST failed: {Status} {Body}",
                    response.StatusCode, body);
                return (false, $"Event log upload failed: HTTP {(int)response.StatusCode}");
            }

            return (true, $"Collected and sent {entries.Count} event log entries");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting event logs");
            return (false, $"Event log collection failed: {ex.Message}");
        }
    }

    private static List<CollectedEventLogEntry> CollectWindowsEventLogs()
    {
        var result = new List<CollectedEventLogEntry>();

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return result;
        }

#pragma warning disable CA1416
        foreach (var logName in new[] { "Application", "System" })
        {
            try
            {
                using var eventLog = new System.Diagnostics.EventLog(logName);
                var count = eventLog.Entries.Count;
                var start = Math.Max(0, count - 25);

                for (var i = count - 1; i >= start && result.Count < 50; i--)
                {
                    var e = eventLog.Entries[i];
                    var msg = e.Message;
                    if (msg.Length > 512) msg = msg[..512] + "…";

                    result.Add(new CollectedEventLogEntry
                    {
                        LogName = logName,
                        Source = e.Source,
                        EventId = (int)(e.InstanceId & 0xFFFF),
                        Level = e.EntryType.ToString(),
                        Message = msg,
                        Timestamp = e.TimeGenerated.ToUniversalTime()
                    });
                }
            }
            catch (Exception)
            {
                // Log not accessible — skip silently
            }
        }
#pragma warning restore CA1416

        return result;
    }

    private sealed class PendingCommand
    {
        public Guid Id { get; set; }
        public string MachineName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Payload { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    private sealed class CollectedEventLogEntry
    {
        public string LogName { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public int EventId { get; set; }
        public string Level { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
