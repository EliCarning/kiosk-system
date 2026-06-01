using System.Text.Json;

namespace KioskAPI.Services;

public interface ICommandSafetyValidator
{
    CommandValidationResult Validate(string type, string? payload);
}

public sealed record CommandValidationResult(bool IsValid, string? Error, string NormalizedType, string? NormalizedPayload)
{
    public static CommandValidationResult Valid(string type, string? payload) =>
        new(true, null, type, payload);

    public static CommandValidationResult Invalid(string error, string type = "", string? payload = null) =>
        new(false, error, type, payload);
}

public sealed class CommandSafetyValidator : ICommandSafetyValidator
{
    private static readonly HashSet<string> AllowedCommands = new(StringComparer.OrdinalIgnoreCase)
    {
        "ping",
        "refresh_cache",
        "restart_service",
        "restart_browser",
        "gpupdate",
        "reboot",
        "restart_machine",
        "restart_agent",
        "open_url",
        "lock_workstation",
        "run_powershell",
        "kill_process",
        "start_process",
        "refresh_policies",
        "collect_screenshot",
        "explorer_open",
    };

    private readonly IConfiguration _configuration;

    public CommandSafetyValidator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public CommandValidationResult Validate(string type, string? payload)
    {
        if (string.IsNullOrWhiteSpace(type))
            return CommandValidationResult.Invalid("type is required");

        var normalizedType = type.Trim().ToLowerInvariant();
        var normalizedPayload = string.IsNullOrWhiteSpace(payload) ? null : payload.Trim();

        if (!AllowedCommands.Contains(normalizedType))
            return CommandValidationResult.Invalid($"Command '{type}' is not allowed", normalizedType, normalizedPayload);

        return normalizedType switch
        {
            "restart_service"     => ValidateRestartService(normalizedType, normalizedPayload),
            "restart_browser"     => ValidateRestartBrowser(normalizedType, normalizedPayload),
            "open_url"            => ValidateStringProperty(normalizedType, normalizedPayload, "url", maxLength: 2048, requireUrl: true),
            "run_powershell"      => ValidateStringProperty(normalizedType, normalizedPayload, "script", maxLength: 16_000),
            "kill_process"        => ValidateStringProperty(normalizedType, normalizedPayload, "processName", maxLength: 128),
            "start_process"       => ValidateStartProcess(normalizedType, normalizedPayload),
            "explorer_open"       => ValidateStringProperty(normalizedType, normalizedPayload, "path", maxLength: 1024),
            "ping" or "refresh_cache" or "reboot" or "gpupdate"
                or "restart_machine" or "restart_agent"
                or "lock_workstation" or "refresh_policies" or "collect_screenshot"
                                  => ValidateNoPayload(normalizedType, normalizedPayload),
            _ => CommandValidationResult.Invalid($"Command '{type}' is not allowed", normalizedType, normalizedPayload),
        };
    }

    private CommandValidationResult ValidateRestartService(string type, string? payload)
    {
        var allowedServices = _configuration.GetSection("Commands:AllowedServices").Get<string[]>()
            ?? Array.Empty<string>();

        if (string.IsNullOrWhiteSpace(payload))
        {
            var defaultService = _configuration["Commands:DefaultServiceName"];
            if (string.IsNullOrWhiteSpace(defaultService))
                return CommandValidationResult.Invalid("restart_service requires payload.serviceName or Commands:DefaultServiceName", type, payload);

            if (!allowedServices.Any(v => string.Equals(v, defaultService, StringComparison.OrdinalIgnoreCase)))
                return CommandValidationResult.Invalid($"service '{defaultService}' is not allowed", type, payload);

            var normalizedDefault = JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["serviceName"] = defaultService
            });
            return CommandValidationResult.Valid(type, normalizedDefault);
        }

        return ValidateSingleStringProperty(type, payload, "serviceName", allowedServices, "service");
    }

    private CommandValidationResult ValidateRestartBrowser(string type, string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
            return CommandValidationResult.Valid(type, null);

        var allowedProcesses = _configuration.GetSection("Commands:AllowedBrowserProcesses").Get<string[]>()
            ?? new[] { "chrome", "msedge", "firefox", "iexplore" };

        return ValidateSingleStringProperty(type, payload, "processName", allowedProcesses, "process");
    }

    private static CommandValidationResult ValidateStartProcess(string type, string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
            return CommandValidationResult.Invalid("start_process requires payload.path", type, payload);

        try
        {
            using var doc = JsonDocument.Parse(payload);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return CommandValidationResult.Invalid("start_process payload must be a JSON object", type, payload);

            string? path = null;
            string? args = null;
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (prop.NameEquals("path") && prop.Value.ValueKind == JsonValueKind.String)
                    path = prop.Value.GetString();
                else if (prop.NameEquals("args") && prop.Value.ValueKind == JsonValueKind.String)
                    args = prop.Value.GetString();
                else
                    return CommandValidationResult.Invalid(
                        "start_process only accepts payload.path and optional payload.args", type, payload);
            }

            if (string.IsNullOrWhiteSpace(path))
                return CommandValidationResult.Invalid("start_process requires payload.path", type, payload);
            if (path.Length > 1024)
                return CommandValidationResult.Invalid("start_process payload.path is too long", type, payload);
            if (args is { Length: > 1024 })
                return CommandValidationResult.Invalid("start_process payload.args is too long", type, payload);

            var normalized = JsonSerializer.Serialize(new Dictionary<string, string?>
            {
                ["path"] = path,
                ["args"] = args
            });
            return CommandValidationResult.Valid(type, normalized);
        }
        catch (JsonException)
        {
            return CommandValidationResult.Invalid("start_process payload must be valid JSON", type, payload);
        }
    }

    private static CommandValidationResult ValidateStringProperty(
        string type, string? payload, string propertyName, int maxLength, bool requireUrl = false)
    {
        if (string.IsNullOrWhiteSpace(payload))
            return CommandValidationResult.Invalid($"{type} requires payload.{propertyName}", type, payload);

        try
        {
            using var doc = JsonDocument.Parse(payload);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return CommandValidationResult.Invalid($"{type} payload must be a JSON object", type, payload);

            var properties = doc.RootElement.EnumerateObject().ToList();
            if (properties.Count != 1 || !properties[0].NameEquals(propertyName))
                return CommandValidationResult.Invalid($"{type} only accepts payload.{propertyName}", type, payload);

            if (properties[0].Value.ValueKind != JsonValueKind.String)
                return CommandValidationResult.Invalid($"{type} payload.{propertyName} must be a string", type, payload);

            var value = properties[0].Value.GetString();
            if (string.IsNullOrWhiteSpace(value))
                return CommandValidationResult.Invalid($"{type} payload.{propertyName} is required", type, payload);
            if (value.Length > maxLength)
                return CommandValidationResult.Invalid($"{type} payload.{propertyName} is too long", type, payload);

            if (requireUrl)
            {
                if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
                    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                {
                    return CommandValidationResult.Invalid($"{type} payload.{propertyName} must be an http(s) URL", type, payload);
                }
            }

            var normalized = JsonSerializer.Serialize(new Dictionary<string, string> { [propertyName] = value });
            return CommandValidationResult.Valid(type, normalized);
        }
        catch (JsonException)
        {
            return CommandValidationResult.Invalid($"{type} payload must be valid JSON", type, payload);
        }
    }

    private static CommandValidationResult ValidateNoPayload(string type, string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload) || payload == "{}")
            return CommandValidationResult.Valid(type, null);

        return CommandValidationResult.Invalid($"{type} does not accept parameters", type, payload);
    }

    private static CommandValidationResult ValidateSingleStringProperty(
        string type,
        string payload,
        string propertyName,
        IEnumerable<string> allowedValues,
        string valueLabel)
    {
        try
        {
            using var doc = JsonDocument.Parse(payload);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return CommandValidationResult.Invalid($"{type} payload must be a JSON object", type, payload);

            var properties = doc.RootElement.EnumerateObject().ToList();
            if (properties.Count != 1 || !properties[0].NameEquals(propertyName))
                return CommandValidationResult.Invalid($"{type} only accepts payload.{propertyName}", type, payload);

            if (properties[0].Value.ValueKind != JsonValueKind.String)
                return CommandValidationResult.Invalid($"{type} payload.{propertyName} must be a string", type, payload);

            var value = properties[0].Value.GetString();
            if (string.IsNullOrWhiteSpace(value))
                return CommandValidationResult.Invalid($"{type} payload.{propertyName} is required", type, payload);

            if (!allowedValues.Any(v => string.Equals(v, value, StringComparison.OrdinalIgnoreCase)))
                return CommandValidationResult.Invalid($"{valueLabel} '{value}' is not allowed", type, payload);

            var normalizedPayload = JsonSerializer.Serialize(new Dictionary<string, string> { [propertyName] = value });
            return CommandValidationResult.Valid(type, normalizedPayload);
        }
        catch (JsonException)
        {
            return CommandValidationResult.Invalid($"{type} payload must be valid JSON", type, payload);
        }
    }
}
