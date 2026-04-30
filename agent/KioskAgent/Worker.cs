using System.Net;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace KioskAgent;

public class Worker : BackgroundService
{
    private const string AgentKeyHeader = "X-Agent-Key";

    private readonly ILogger<Worker> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHostApplicationLifetime _applicationLifetime;
    private readonly HttpClient _httpClient;

    public Worker(
        ILogger<Worker> logger,
        IConfiguration configuration,
        IHostApplicationLifetime applicationLifetime)
    {
        _logger = logger;
        _configuration = configuration;
        _applicationLifetime = applicationLifetime;
        _httpClient = new HttpClient();

        var apiKey = _configuration["Agent:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Remove(AgentKeyHeader);
            _httpClient.DefaultRequestHeaders.Add(AgentKeyHeader, apiKey);
        }
        else
        {
            _logger.LogWarning("Agent:ApiKey is not configured. Authenticated endpoints will fail.");
        }
    }

    private static readonly string AgentVersion =
        System.Reflection.Assembly.GetExecutingAssembly()
            .GetName().Version?.ToString() ?? "1.0.0";

    private static readonly string StatusFilePath =
        Path.Combine(Path.GetTempPath(), "kiosk-agent-status.json");

    private DateTime _startedAt = DateTime.UtcNow;
    private DateTime _lastHeartbeatAt;
    private DateTime _lastCommandAt;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var backendBaseUrl = _configuration["Backend:BaseUrl"]?.TrimEnd('/')
                             ?? "http://localhost:5226";
        var machineName = Environment.MachineName;

        var heartbeatUrl = $"{backendBaseUrl}/api/heartbeat";
        var logsUrl = $"{backendBaseUrl}/api/logs";
        var pendingCommandsUrl = $"{backendBaseUrl}/api/commands/{Uri.EscapeDataString(machineName)}/pending";

        _startedAt = DateTime.UtcNow;

        _logger.LogInformation(
            "Kiosk agent started. Backend: {Url}, Machine: {Machine}",
            backendBaseUrl, machineName);

        await SendLogAsync(logsUrl, "Info", "Agent started", stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await SendHeartbeatAsync(heartbeatUrl, logsUrl, stoppingToken);
            await ProcessPendingCommandsAsync(pendingCommandsUrl, backendBaseUrl, logsUrl, stoppingToken);
            WriteStatusFile(machineName);

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

    private void WriteStatusFile(string machineName)
    {
        try
        {
            var status = new
            {
                machineName,
                agentVersion = AgentVersion,
                startedAt = _startedAt,
                lastHeartbeatAt = _lastHeartbeatAt == default ? (DateTime?)null : _lastHeartbeatAt,
                lastCommandAt = _lastCommandAt == default ? (DateTime?)null : _lastCommandAt,
                writtenAt = DateTime.UtcNow
            };
            var json = System.Text.Json.JsonSerializer.Serialize(status,
                new System.Text.Json.JsonSerializerOptions { WriteIndented = false });
            File.WriteAllText(StatusFilePath, json);
        }
        catch
        {
            // Status file is best-effort; never fail the main loop
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

            var response = await _httpClient.PostAsJsonAsync(heartbeatUrl, payload, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                _lastHeartbeatAt = DateTime.UtcNow;
            }
            else
            {
                _logger.LogWarning("Heartbeat failed with status {Status}", response.StatusCode);
                await SendLogAsync(logsUrl, "Error",
                    $"Heartbeat failed with status {(int)response.StatusCode}", stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending heartbeat");
            await SendLogAsync(logsUrl, "Error", $"Heartbeat exception: {ex.Message}", stoppingToken);
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
            await SendLogAsync(logsUrl, "Error", $"Fetch commands exception: {ex.Message}", stoppingToken);
            return;
        }

        if (commands is null || commands.Count == 0) return;

        _lastCommandAt = DateTime.UtcNow;
        _logger.LogInformation("Received {Count} pending command(s)", commands.Count);

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
        var shouldRestart = false;
        string level;
        string message;

        try
        {
            switch (type.ToLowerInvariant())
            {
                case "ping":
                    (success, message) = await ExecutePingAsync(command.Payload, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "refresh_cache":
                    (success, message) = ExecuteRefreshCache(command.Payload);
                    level = success ? "Info" : "Warning";
                    break;

                case "restart_service":
                    (success, message) = await ExecuteRestartServiceAsync(command.Payload, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "restart_browser":
                    (success, message) = await ExecuteRestartBrowserAsync(command.Payload, stoppingToken);
                    level = success ? "Info" : "Warning";
                    break;

                case "gpupdate":
                    (success, message) = await ExecuteGpUpdateAsync(stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "reboot":
                    // ExecuteRebootAsync completes the command itself (before machine goes down)
                    (success, message) = await ExecuteRebootAsync(command.Payload, backendBaseUrl, command.Id, logsUrl, stoppingToken);
                    level = success ? "Warning" : "Error";
                    if (success)
                    {
                        // Command already completed inside ExecuteRebootAsync
                        await SendLogAsync(logsUrl, level, message, stoppingToken);
                        _applicationLifetime.StopApplication();
                        return;
                    }
                    break;

                case "collect_system_info":
                    (success, message) = await CollectAndSendSystemInfoAsync(
                        backendBaseUrl, logsUrl, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "collect_event_logs":
                    var filter = ParseEventLogFilter(command.Payload);
                    (success, message) = await CollectAndSendEventLogsAsync(
                        backendBaseUrl, logsUrl, filter, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "collect_rdp_sessions":
                    (success, message) = await CollectAndSendRdpSessionsAsync(
                        backendBaseUrl, logsUrl, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "collect_rdp_events":
                    (success, message) = await CollectAndSendRdpEventsAsync(
                        backendBaseUrl, logsUrl, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "collect_services":
                    (success, message) = await CollectAndSendServicesAsync(
                        backendBaseUrl, logsUrl, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "collect_processes":
                    (success, message) = await CollectAndSendProcessesAsync(
                        backendBaseUrl, logsUrl, stoppingToken);
                    level = success ? "Info" : "Error";
                    break;

                case "restart_agent":
                    level = "Info";
                    message = "Agent restart requested — initiating graceful shutdown";
                    shouldRestart = true;
                    break;

                default:
                    level = "Warning";
                    message = $"Unknown command type: {type}";
                    success = false;
                    _logger.LogWarning("Unknown command type {Type} for command {Id}", type, command.Id);
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
            _logger.LogInformation("Command {Id} ({Type}): {Message}", command.Id, type, message);
        }

        await SendLogAsync(logsUrl, level, message, stoppingToken);
        await CompleteCommandAsync(backendBaseUrl, command.Id, success, logsUrl, stoppingToken);

        if (shouldRestart)
        {
            _logger.LogInformation("Stopping agent service after restart_agent command");
            await Task.Delay(TimeSpan.FromSeconds(2), CancellationToken.None);
            _applicationLifetime.StopApplication();
        }
    }

    // ── Real command execution ────────────────────────────────────────────────

    private async Task<(bool, string)> ExecutePingAsync(string? payload, CancellationToken ct)
    {
        var target = "127.0.0.1";
        if (!string.IsNullOrWhiteSpace(payload))
        {
            try
            {
                var opts = JsonSerializer.Deserialize<Dictionary<string, string>>(payload,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (opts is not null && opts.TryGetValue("target", out var t) && !string.IsNullOrWhiteSpace(t))
                    target = t;
            }
            catch { }
        }

        // Reject anything that looks like command injection
        if (target.Any(c => c is '&' or '|' or ';' or '\n' or '\r' or '`' or '$'))
            return (false, "Invalid ping target");

        var args = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? $"-n 1 {target}"
            : $"-c 1 {target}";

        var (exit, stdout, stderr) = await RunProcessAsync("ping", args,
            _configuration.GetValue("Commands:CommandTimeoutSeconds", 15), ct);

        var output = (stdout + stderr).Trim();
        return (exit == 0, $"Ping {target}: {(exit == 0 ? "reachable" : "unreachable")}. {TruncateOutput(output)}");
    }

    private (bool, string) ExecuteRefreshCache(string? payload)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return (true, "Cache clear skipped on non-Windows");

        var paths = _configuration.GetSection("Commands:CachePaths").Get<string[]>()
            ?? new[] { "%TEMP%", "%LOCALAPPDATA%\\Temp" };

        var deleted = 0;
        var skipped = 0;
        var errors = new List<string>();

        foreach (var rawPath in paths)
        {
            var expanded = Environment.ExpandEnvironmentVariables(rawPath);
            if (!Directory.Exists(expanded)) continue;

            try
            {
                foreach (var file in Directory.EnumerateFiles(expanded, "*", SearchOption.TopDirectoryOnly))
                {
                    try { File.Delete(file); deleted++; }
                    catch { skipped++; }
                }
                foreach (var dir in Directory.EnumerateDirectories(expanded))
                {
                    try { Directory.Delete(dir, recursive: true); deleted++; }
                    catch { skipped++; }
                }
            }
            catch (Exception ex)
            {
                errors.Add($"{expanded}: {ex.Message}");
            }
        }

        var summary = $"Cache cleared: {deleted} item(s) removed, {skipped} locked/skipped.";
        if (errors.Count > 0) summary += $" Errors: {string.Join("; ", errors)}";
        return (true, summary);
    }

    private async Task<(bool, string)> ExecuteRestartServiceAsync(string? payload, CancellationToken ct)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return (false, "Service restart not supported on non-Windows");

        string? serviceName = null;
        if (!string.IsNullOrWhiteSpace(payload))
        {
            try
            {
                var opts = JsonSerializer.Deserialize<Dictionary<string, string>>(payload,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                opts?.TryGetValue("serviceName", out serviceName);
            }
            catch { }
        }

        if (string.IsNullOrWhiteSpace(serviceName))
            return (false, "payload.serviceName is required");

        var allowed = _configuration.GetSection("Commands:AllowedServices").Get<string[]>() ?? Array.Empty<string>();
        if (!allowed.Any(a => string.Equals(a, serviceName, StringComparison.OrdinalIgnoreCase)))
            return (false, $"Service '{serviceName}' is not in the AllowedServices list");

        var timeout = _configuration.GetValue("Commands:CommandTimeoutSeconds", 60);

#pragma warning disable CA1416
        try
        {
            using var svc = new System.ServiceProcess.ServiceController(serviceName);

            if (svc.Status != System.ServiceProcess.ServiceControllerStatus.Stopped)
            {
                svc.Stop();
                svc.WaitForStatus(System.ServiceProcess.ServiceControllerStatus.Stopped,
                    TimeSpan.FromSeconds(timeout / 2));
            }

            svc.Start();
            svc.WaitForStatus(System.ServiceProcess.ServiceControllerStatus.Running,
                TimeSpan.FromSeconds(timeout / 2));

            return (true, $"Service '{serviceName}' restarted successfully (status: {svc.Status})");
        }
        catch (Exception ex)
        {
            return (false, $"Service '{serviceName}' restart failed: {ex.Message}");
        }
#pragma warning restore CA1416
    }

    private async Task<(bool, string)> ExecuteRestartBrowserAsync(string? payload, CancellationToken ct)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return (false, "Browser restart not supported on non-Windows");

        var allowedProcesses = _configuration.GetSection("Commands:AllowedBrowserProcesses").Get<string[]>()
            ?? new[] { "chrome", "msedge", "firefox" };

        string[]? targets = null;
        if (!string.IsNullOrWhiteSpace(payload))
        {
            try
            {
                var opts = JsonSerializer.Deserialize<Dictionary<string, string>>(payload,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (opts?.TryGetValue("processName", out var pn) == true && !string.IsNullOrWhiteSpace(pn))
                    targets = new[] { pn };
            }
            catch { }
        }

        targets ??= allowedProcesses;

        var killed = 0;
        var denied = new List<string>();

        foreach (var target in targets)
        {
            if (!allowedProcesses.Any(a => string.Equals(a, target, StringComparison.OrdinalIgnoreCase)))
            {
                denied.Add(target);
                continue;
            }

            try
            {
                var procs = System.Diagnostics.Process.GetProcessesByName(target);
                foreach (var p in procs)
                {
                    try { p.Kill(entireProcessTree: true); killed++; }
                    catch { }
                    finally { p.Dispose(); }
                }
            }
            catch { }
        }

        if (denied.Count > 0)
            return (false, $"Process(es) not in AllowedBrowserProcesses: {string.Join(", ", denied)}");

        // Optionally restart if BrowserRestartPath is configured
        var restartPath = _configuration["Commands:BrowserRestartPath"];
        var restarted = false;
        if (!string.IsNullOrWhiteSpace(restartPath) && File.Exists(restartPath))
        {
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = restartPath,
                    UseShellExecute = true
                });
                restarted = true;
            }
            catch { }
        }

        return (true, $"Browser processes killed: {killed}. {(restarted ? "Browser restarted." : "No restart path configured.")}");
    }

    private async Task<(bool, string)> ExecuteGpUpdateAsync(CancellationToken ct)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return (false, "gpupdate not supported on non-Windows");

        var timeout = _configuration.GetValue("Commands:CommandTimeoutSeconds", 60);
        var (exit, stdout, stderr) = await RunProcessAsync("gpupdate", "/force /wait:0", timeout, ct);
        var output = TruncateOutput((stdout + "\n" + stderr).Trim());
        return (exit == 0, $"gpupdate /force: {(exit == 0 ? "succeeded" : $"exit {exit}")}. {output}");
    }

    private async Task<(bool, string)> ExecuteRebootAsync(
        string? payload, string backendBaseUrl, Guid commandId, string logsUrl, CancellationToken ct)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return (false, "Reboot not supported on non-Windows");

        var defaultDelay = _configuration.GetValue("Commands:RebootDelaySeconds", 30);
        var delay = defaultDelay;
        if (!string.IsNullOrWhiteSpace(payload))
        {
            try
            {
                var opts = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(payload,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (opts?.TryGetValue("delaySeconds", out var ds) == true && ds.TryGetInt32(out var d))
                    delay = Math.Max(5, d);
            }
            catch { }
        }

        // Complete the command before the machine goes down
        await CompleteCommandAsync(backendBaseUrl, commandId, true, logsUrl, CancellationToken.None);
        await SendLogAsync(logsUrl, "Warning", $"REBOOT initiated with {delay}s delay on {Environment.MachineName}", CancellationToken.None);

        var (exit, _, stderr) = await RunProcessAsync("shutdown", $"/r /t {delay} /c \"KioskAgent reboot command\"", 10, ct);
        if (exit != 0)
            return (false, $"shutdown /r failed (exit {exit}): {stderr.Trim()}");

        // Return special sentinel; HandleCommandAsync checks shouldRestart to avoid double-complete
        return (true, $"Reboot scheduled in {delay}s");
    }

    // ── Process runner ────────────────────────────────────────────────────────

    private static async Task<(int exitCode, string stdout, string stderr)> RunProcessAsync(
        string fileName, string arguments, int timeoutSeconds, CancellationToken ct)
    {
        using var proc = new System.Diagnostics.Process();
        proc.StartInfo = new System.Diagnostics.ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        proc.Start();

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        string stdout, stderr;
        try
        {
            var stdoutTask = proc.StandardOutput.ReadToEndAsync(cts.Token);
            var stderrTask = proc.StandardError.ReadToEndAsync(cts.Token);
            await proc.WaitForExitAsync(cts.Token);
            stdout = await stdoutTask;
            stderr = await stderrTask;
        }
        catch (OperationCanceledException)
        {
            try { proc.Kill(entireProcessTree: true); } catch { }
            return (-1, string.Empty, $"Process timed out after {timeoutSeconds}s");
        }

        return (proc.ExitCode, stdout, stderr);
    }

    private static string TruncateOutput(string s, int max = 300) =>
        s.Length <= max ? s : s[..max] + "…";

    // ── System Info ──────────────────────────────────────────────────────────

    private async Task<(bool success, string message)> CollectAndSendSystemInfoAsync(
        string backendBaseUrl, string logsUrl, CancellationToken ct)
    {
        try
        {
            var uptimeSpan = TimeSpan.FromMilliseconds(Environment.TickCount64);
            var uptimeStr = $"{(int)uptimeSpan.TotalDays}d {uptimeSpan.Hours}h {uptimeSpan.Minutes}m";
            var lastBoot = DateTime.UtcNow - uptimeSpan;

            long? totalRamMb = null;
            long? freeRamMb = null;
            GetRamInfo(out totalRamMb, out freeRamMb);

            var diskSummary = BuildDiskSummary();

            // Health metrics
            var cpuUsagePct = await MeasureCpuUsageAsync(ct);

            double? ramUsagePct = null;
            if (totalRamMb.HasValue && freeRamMb.HasValue && totalRamMb.Value > 0)
                ramUsagePct = Math.Round(100.0 * (totalRamMb.Value - freeRamMb.Value) / totalRamMb.Value, 1);

            double? diskUsagePct = null;
            try
            {
                var primary = DriveInfo.GetDrives()
                    .Where(d => d.IsReady && d.DriveType == DriveType.Fixed)
                    .OrderByDescending(d => d.TotalSize)
                    .FirstOrDefault();
                if (primary != null && primary.TotalSize > 0)
                    diskUsagePct = Math.Round(100.0 * (primary.TotalSize - primary.AvailableFreeSpace) / primary.TotalSize, 1);
            }
            catch { }

            var payload = new
            {
                machineName = Environment.MachineName,
                hostname = Dns.GetHostName(),
                osVersion = RuntimeInformation.OSDescription,
                ipAddress = GetLocalIpAddress(),
                uptime = uptimeStr,
                currentUser = Environment.UserName,
                cpuCores = Environment.ProcessorCount,
                totalRamMb,
                freeRamMb,
                diskSummary,
                lastBoot,
                cpuUsagePct,
                ramUsagePct,
                diskUsagePct
            };

            _logger.LogInformation(
                "Collecting system info for {MachineName}: OS={OS}, CPU={Cpu}%, RAM={Ram}%, Disk={Disk}%",
                payload.machineName, payload.osVersion,
                cpuUsagePct?.ToString("F1") ?? "n/a",
                ramUsagePct?.ToString("F1") ?? "n/a",
                diskUsagePct?.ToString("F1") ?? "n/a");

            var url = $"{backendBaseUrl}/api/system-info";
            var response = await _httpClient.PostAsJsonAsync(url, payload, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("System info POST failed: {Status} {Body}", response.StatusCode, body);
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

    private static async Task<double?> MeasureCpuUsageAsync(CancellationToken ct)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return null;

#pragma warning disable CA1416
        try
        {
            GetSystemTimes(out var idle1, out var kernel1, out var user1);
            await Task.Delay(500, ct);
            GetSystemTimes(out var idle2, out var kernel2, out var user2);

            var idleDelta = (double)(idle2 - idle1);
            var totalDelta = (double)((kernel2 + user2) - (kernel1 + user1));
            if (totalDelta <= 0) return null;

            return Math.Round(100.0 * (1.0 - idleDelta / totalDelta), 1);
        }
        catch
        {
            return null;
        }
#pragma warning restore CA1416
    }

    private static string? BuildDiskSummary()
    {
        try
        {
            var parts = DriveInfo.GetDrives()
                .Where(d => d.IsReady && (d.DriveType == DriveType.Fixed || d.DriveType == DriveType.Network))
                .Select(d =>
                {
                    var totalGb = d.TotalSize / (1024.0 * 1024 * 1024);
                    var freeGb = d.AvailableFreeSpace / (1024.0 * 1024 * 1024);
                    return $"{d.Name.TrimEnd('\\', '/')} {freeGb:F0}GB free / {totalGb:F0}GB";
                })
                .ToList();
            return parts.Count > 0 ? string.Join(" · ", parts) : null;
        }
        catch
        {
            return null;
        }
    }

    private static void GetRamInfo(out long? totalMb, out long? freeMb)
    {
        totalMb = null;
        freeMb = null;

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return;

#pragma warning disable CA1416
        try
        {
            var status = new MemoryStatusEx { dwLength = (uint)Marshal.SizeOf<MemoryStatusEx>() };
            if (GlobalMemoryStatusEx(ref status))
            {
                totalMb = (long)(status.ullTotalPhys / (1024 * 1024));
                freeMb = (long)(status.ullAvailPhys / (1024 * 1024));
            }
        }
        catch
        {
            // P/Invoke unavailable — skip silently
        }
#pragma warning restore CA1416
    }

    // ── Event Logs ───────────────────────────────────────────────────────────

    private static EventLogFilter? ParseEventLogFilter(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return null;
        try
        {
            return JsonSerializer.Deserialize<EventLogFilter>(payload,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return null;
        }
    }

    private async Task<(bool success, string message)> CollectAndSendEventLogsAsync(
        string backendBaseUrl, string logsUrl, EventLogFilter? filter, CancellationToken ct)
    {
        try
        {
            var entries = CollectWindowsEventLogs(filter);

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
                _logger.LogWarning("Event logs POST failed: {Status} {Body}", response.StatusCode, body);
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

    private static List<CollectedEventLogEntry> CollectWindowsEventLogs(EventLogFilter? filter = null)
    {
        var result = new List<CollectedEventLogEntry>();

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        var logNames = !string.IsNullOrWhiteSpace(filter?.LogName) && filter.LogName != "all"
            ? new[] { filter.LogName }
            : new[] { "Application", "System" };

        var maxPerLog = (filter?.MaxResults ?? 50) / logNames.Length;
        maxPerLog = Math.Max(maxPerLog, 10);

        var hoursBack = filter?.HoursBack ?? 24;
        var cutoff = DateTime.Now.AddHours(-hoursBack);

        var levelFilter = filter?.Level?.ToLowerInvariant();

#pragma warning disable CA1416
        foreach (var logName in logNames)
        {
            try
            {
                using var eventLog = new System.Diagnostics.EventLog(logName);
                var count = eventLog.Entries.Count;

                for (var i = count - 1; i >= 0 && result.Count < (filter?.MaxResults ?? 50); i--)
                {
                    var e = eventLog.Entries[i];

                    if (e.TimeGenerated < cutoff) break;

                    var entryLevel = e.EntryType.ToString();
                    if (!string.IsNullOrEmpty(levelFilter) && levelFilter != "all")
                    {
                        if (!entryLevel.Equals(levelFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    }

                    var msg = e.Message;
                    if (msg.Length > 512) msg = msg[..512] + "…";

                    result.Add(new CollectedEventLogEntry
                    {
                        LogName = logName,
                        Source = e.Source,
                        EventId = (int)(e.InstanceId & 0xFFFF),
                        Level = entryLevel,
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

    // ── RDP Sessions ─────────────────────────────────────────────────────────

    private async Task<(bool success, string message)> CollectAndSendRdpSessionsAsync(
        string backendBaseUrl, string logsUrl, CancellationToken ct)
    {
        try
        {
            var sessions = RunQueryUser();
            _logger.LogInformation(
                "Collected {Count} RDP session(s) for {MachineName}",
                sessions.Count, Environment.MachineName);

            var batch = new { machineName = Environment.MachineName, sessions };
            var url = $"{backendBaseUrl}/api/rdp-sessions";
            var response = await _httpClient.PostAsJsonAsync(url, batch, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                return (false, $"RDP sessions upload failed: HTTP {(int)response.StatusCode}");
            }

            return (true, $"Collected {sessions.Count} RDP session(s)");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting RDP sessions");
            return (false, $"RDP sessions collection failed: {ex.Message}");
        }
    }

    private static List<CollectedRdpSession> RunQueryUser()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return new List<CollectedRdpSession>();

        try
        {
            using var proc = new System.Diagnostics.Process();
            proc.StartInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "query",
                Arguments = "user",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            proc.Start();
            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(5000);
            return ParseQueryUserOutput(output);
        }
        catch
        {
            return new List<CollectedRdpSession>();
        }
    }

    private static List<CollectedRdpSession> ParseQueryUserOutput(string output)
    {
        var result = new List<CollectedRdpSession>();
        if (string.IsNullOrWhiteSpace(output)) return result;

        var lines = output.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // Locate header line
        var headerIdx = -1;
        for (var i = 0; i < lines.Length; i++)
        {
            if (lines[i].IndexOf("USERNAME", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                headerIdx = i;
                break;
            }
        }
        if (headerIdx < 0) return result;

        var header = lines[headerIdx];
        var sessionCol = header.IndexOf("SESSIONNAME", StringComparison.OrdinalIgnoreCase);
        var idCol = header.IndexOf(" ID", StringComparison.OrdinalIgnoreCase);
        if (idCol < 0) idCol = header.IndexOf("ID ", StringComparison.OrdinalIgnoreCase);
        var stateCol = header.IndexOf("STATE", StringComparison.OrdinalIgnoreCase);
        var idleCol = header.IndexOf("IDLE", StringComparison.OrdinalIgnoreCase);
        var logonCol = header.IndexOf("LOGON", StringComparison.OrdinalIgnoreCase);

        for (var i = headerIdx + 1; i < lines.Length; i++)
        {
            var line = lines[i].TrimEnd('\r');
            if (line.Length < 5) continue;

            // Strip leading '>' (active session marker) or space
            var raw = line.Length > 0 && (line[0] == '>' || line[0] == ' ') ? line[1..] : line;

            var usernameEnd = sessionCol > 1 ? sessionCol - 1 : raw.Length;
            var username = raw.Length >= usernameEnd
                ? raw[0..Math.Min(usernameEnd, raw.Length)].Trim()
                : raw.Trim();

            var sessionName = sessionCol >= 0 && idCol > sessionCol && raw.Length > sessionCol
                ? raw[sessionCol..Math.Min(idCol, raw.Length)].Trim()
                : string.Empty;

            var state = stateCol >= 0 && idleCol > stateCol && raw.Length > stateCol
                ? raw[stateCol..Math.Min(idleCol, raw.Length)].Trim()
                : string.Empty;

            var logon = logonCol >= 0 && raw.Length > logonCol
                ? raw[logonCol..].Trim()
                : string.Empty;

            if (string.IsNullOrEmpty(username)) continue;

            var normalizedState = state.Equals("Active", StringComparison.OrdinalIgnoreCase) ? "Active"
                : state.Equals("Disc", StringComparison.OrdinalIgnoreCase) ? "Disconnected"
                : state;

            DateTime? loginTime = null;
            if (!string.IsNullOrEmpty(logon) && DateTime.TryParse(logon, out var dt))
                loginTime = dt.ToUniversalTime();

            result.Add(new CollectedRdpSession
            {
                Username = username,
                SessionName = sessionName,
                State = normalizedState,
                LoginTime = loginTime
            });
        }

        return result;
    }

    // ── RDP Login/Logout Events ───────────────────────────────────────────────

    private async Task<(bool success, string message)> CollectAndSendRdpEventsAsync(
        string backendBaseUrl, string logsUrl, CancellationToken ct)
    {
        try
        {
            var entries = CollectRdpSecurityEvents();
            _logger.LogInformation(
                "Collected {Count} RDP event(s) for {MachineName}",
                entries.Count, Environment.MachineName);

            var batch = new { machineName = Environment.MachineName, entries };
            var url = $"{backendBaseUrl}/api/event-logs";
            var response = await _httpClient.PostAsJsonAsync(url, batch, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                return (false, $"RDP events upload failed: HTTP {(int)response.StatusCode}");
            }

            return (true, $"Collected {entries.Count} RDP login/logout events");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting RDP events");
            return (false, $"RDP events collection failed: {ex.Message}");
        }
    }

    private static List<CollectedEventLogEntry> CollectRdpSecurityEvents()
    {
        var result = new List<CollectedEventLogEntry>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        var rdpEventIds = new HashSet<int> { 4624, 4634, 4778, 4779 };
        var cutoff = DateTime.Now.AddHours(-72);

#pragma warning disable CA1416
        try
        {
            using var eventLog = new System.Diagnostics.EventLog("Security");
            var count = eventLog.Entries.Count;

            for (var i = count - 1; i >= 0 && result.Count < 200; i--)
            {
                var e = eventLog.Entries[i];
                if (e.TimeGenerated < cutoff) break;

                var eventId = (int)(e.InstanceId & 0xFFFF);
                if (!rdpEventIds.Contains(eventId)) continue;

                var msg = e.Message;
                if (msg.Length > 512) msg = msg[..512] + "…";

                result.Add(new CollectedEventLogEntry
                {
                    LogName = "Security",
                    Source = e.Source,
                    EventId = eventId,
                    Level = e.EntryType.ToString(),
                    Message = msg,
                    Timestamp = e.TimeGenerated.ToUniversalTime()
                });
            }
        }
        catch
        {
            // Security log requires admin — skip silently if not accessible
        }
#pragma warning restore CA1416

        return result;
    }

    // ── Windows Services ──────────────────────────────────────────────────────

    private async Task<(bool success, string message)> CollectAndSendServicesAsync(
        string backendBaseUrl, string logsUrl, CancellationToken ct)
    {
        try
        {
            var services = CollectWindowsServices();
            _logger.LogInformation(
                "Collected {Count} service(s) for {MachineName}",
                services.Count, Environment.MachineName);

            var batch = new { machineName = Environment.MachineName, services };
            var url = $"{backendBaseUrl}/api/services";
            var response = await _httpClient.PostAsJsonAsync(url, batch, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                return (false, $"Services upload failed: HTTP {(int)response.StatusCode}");
            }

            return (true, $"Collected {services.Count} Windows services");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting services");
            return (false, $"Services collection failed: {ex.Message}");
        }
    }

    private static List<CollectedWindowsService> CollectWindowsServices()
    {
        var result = new List<CollectedWindowsService>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

#pragma warning disable CA1416
        try
        {
            var controllers = System.ServiceProcess.ServiceController.GetServices();
            foreach (var svc in controllers.OrderBy(s => s.ServiceName))
            {
                var startType = "Unknown";
                try { startType = svc.StartType.ToString(); } catch { }

                result.Add(new CollectedWindowsService
                {
                    ServiceName = svc.ServiceName,
                    DisplayName = svc.DisplayName,
                    Status = svc.Status.ToString(),
                    StartType = startType
                });
            }
        }
        catch { }
#pragma warning restore CA1416

        return result;
    }

    // ── Windows Processes ─────────────────────────────────────────────────────

    private async Task<(bool success, string message)> CollectAndSendProcessesAsync(
        string backendBaseUrl, string logsUrl, CancellationToken ct)
    {
        try
        {
            var processes = CollectTopProcesses();
            _logger.LogInformation(
                "Collected {Count} process(es) for {MachineName}",
                processes.Count, Environment.MachineName);

            var batch = new { machineName = Environment.MachineName, processes };
            var url = $"{backendBaseUrl}/api/processes";
            var response = await _httpClient.PostAsJsonAsync(url, batch, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                return (false, $"Processes upload failed: HTTP {(int)response.StatusCode}");
            }

            return (true, $"Collected top {processes.Count} processes by memory");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting processes");
            return (false, $"Processes collection failed: {ex.Message}");
        }
    }

    private static List<CollectedWindowsProcess> CollectTopProcesses()
    {
        var result = new List<CollectedWindowsProcess>();
        try
        {
            var procs = System.Diagnostics.Process.GetProcesses();
            foreach (var p in procs.OrderByDescending(GetWorkingSet).Take(30))
            {
                long memMb = 0;
                try { memMb = p.WorkingSet64 / (1024 * 1024); } catch { }

                result.Add(new CollectedWindowsProcess
                {
                    ProcessName = p.ProcessName,
                    Pid = p.Id,
                    MemoryMb = memMb
                });
            }
        }
        catch { }
        return result;
    }

    private static long GetWorkingSet(System.Diagnostics.Process p)
    {
        try { return p.WorkingSet64; } catch { return 0; }
    }

    // ── HTTP helpers ─────────────────────────────────────────────────────────

    private async Task MarkCommandRunningAsync(
        string backendBaseUrl, Guid commandId, string logsUrl, CancellationToken stoppingToken)
    {
        var startUrl = $"{backendBaseUrl}/api/commands/{commandId}/start";
        try
        {
            var response = await _httpClient.PostAsync(startUrl, content: null, stoppingToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to mark command {Id} running: status {Status}",
                    commandId, response.StatusCode);
                await SendLogAsync(logsUrl, "Warning",
                    $"Mark running {commandId} failed with status {(int)response.StatusCode}", stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking command {Id} running", commandId);
            await SendLogAsync(logsUrl, "Error",
                $"Mark running {commandId} exception: {ex.Message}", stoppingToken);
        }
    }

    private async Task CompleteCommandAsync(
        string backendBaseUrl, Guid commandId, bool success, string logsUrl, CancellationToken stoppingToken)
    {
        var completeUrl = $"{backendBaseUrl}/api/commands/{commandId}/complete";
        try
        {
            var payload = new { success };
            var response = await _httpClient.PostAsJsonAsync(completeUrl, payload, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Command {Id} marked {Status}",
                    commandId, success ? "completed" : "failed");
            }
            else
            {
                _logger.LogWarning("Failed to complete command {Id}: status {Status}",
                    commandId, response.StatusCode);
                await SendLogAsync(logsUrl, "Error",
                    $"Complete command {commandId} failed with status {(int)response.StatusCode}", stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing command {Id}", commandId);
            await SendLogAsync(logsUrl, "Error",
                $"Complete command {commandId} exception: {ex.Message}", stoppingToken);
        }
    }

    private async Task SendLogAsync(string logsUrl, string level, string message, CancellationToken ct)
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

    // ── Windows P/Invoke ─────────────────────────────────────────────────────

    [StructLayout(LayoutKind.Sequential)]
    private struct MemoryStatusEx
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GlobalMemoryStatusEx(ref MemoryStatusEx lpBuffer);

    // FILETIME values (100ns intervals) marshaled as 8-byte longs
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetSystemTimes(out long lpIdleTime, out long lpKernelTime, out long lpUserTime);

    // ── Inner types ──────────────────────────────────────────────────────────

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

    private sealed record EventLogFilter(
        string? LogName,
        string? Level,
        int? HoursBack,
        int? MaxResults);

    private sealed class CollectedEventLogEntry
    {
        public string LogName { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public int EventId { get; set; }
        public string Level { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    private sealed class CollectedRdpSession
    {
        public string Username { get; set; } = string.Empty;
        public string SessionName { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public DateTime? LoginTime { get; set; }
    }

    private sealed class CollectedWindowsService
    {
        public string ServiceName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string StartType { get; set; } = string.Empty;
    }

    private sealed class CollectedWindowsProcess
    {
        public string ProcessName { get; set; } = string.Empty;
        public int Pid { get; set; }
        public long MemoryMb { get; set; }
    }
}
