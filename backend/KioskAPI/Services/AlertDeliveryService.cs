using KioskAPI.Models;
using System.Text;
using System.Text.Json;

namespace KioskAPI.Services;

public interface IAlertDeliveryService
{
    Task SendAsync(Alert alert, CancellationToken ct = default);
}

public class AlertDeliveryService : IAlertDeliveryService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AlertDeliveryService> _logger;
    private readonly HttpClient _httpClient;

    public AlertDeliveryService(IConfiguration configuration, ILogger<AlertDeliveryService> logger, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("alert-delivery");
    }

    public async Task SendAsync(Alert alert, CancellationToken ct = default)
    {
        var webhookUrl = _configuration["AlertDelivery:TeamsWebhookUrl"];
        if (string.IsNullOrWhiteSpace(webhookUrl)) return;

        try
        {
            var color = alert.Type switch
            {
                AlertTypes.Offline => "FF0000",
                AlertTypes.CommandFailed => "FF8C00",
                _ => "FFC300"
            };

            var card = new
            {
                type = "message",
                attachments = new[]
                {
                    new
                    {
                        contentType = "application/vnd.microsoft.card.adaptive",
                        content = new
                        {
                            type = "AdaptiveCard",
                            version = "1.4",
                            body = new object[]
                            {
                                new
                                {
                                    type = "TextBlock",
                                    text = $"🔴 Kiosk Alert: {alert.Type}",
                                    weight = "Bolder",
                                    size = "Medium"
                                },
                                new
                                {
                                    type = "FactSet",
                                    facts = new[]
                                    {
                                        new { title = "Machine", value = alert.MachineName },
                                        new { title = "Type", value = alert.Type },
                                        new { title = "Message", value = alert.Message },
                                        new { title = "Time", value = alert.CreatedAt.ToString("u") }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            var json = JsonSerializer.Serialize(card);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(10));

            var response = await _httpClient.PostAsync(webhookUrl, content, cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(CancellationToken.None);
                _logger.LogWarning("Teams webhook returned {Status}: {Body}", response.StatusCode, body[..Math.Min(200, body.Length)]);
            }
        }
        catch (Exception ex)
        {
            // Non-blocking — delivery failure must never affect the alert creation path
            _logger.LogWarning(ex, "Failed to deliver alert {AlertId} via Teams webhook", alert.Id);
        }
    }
}
