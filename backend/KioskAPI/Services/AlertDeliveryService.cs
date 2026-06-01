using KioskAPI.Models;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace KioskAPI.Services;

public interface IAlertDeliveryService
{
    Task<bool> SendAsync(Alert alert, CancellationToken ct = default);
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

    public async Task<bool> SendAsync(Alert alert, CancellationToken ct = default)
    {
        var delivered = false;
        var webhookUrl = _configuration["AlertDelivery:TeamsWebhookUrl"];
        if (!string.IsNullOrWhiteSpace(webhookUrl))
        {
            try
            {
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
                                        text = $"Kiosk Alert: {alert.Type}",
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
                                            new { title = "Reason", value = alert.FailureReason },
                                            new { title = "Time", value = alert.CreatedAt.ToString("u") }
                                        }
                                    }
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
                else
                {
                    delivered = true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deliver alert {AlertId} via Teams webhook", alert.Id);
            }
        }

        if (_configuration.GetValue("EmailNotifications:EnableEmailNotifications", false))
        {
            delivered = await SendEmailAsync(alert, ct) || delivered;
        }

        return delivered;
    }

    private async Task<bool> SendEmailAsync(Alert alert, CancellationToken ct)
    {
        var host = _configuration["EmailNotifications:SmtpHost"];
        var from = _configuration["EmailNotifications:FromAddress"];
        var recipients = _configuration
            .GetSection("EmailNotifications:Recipients")
            .Get<string[]>()
            ?? Array.Empty<string>();

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from) || recipients.Length == 0)
        {
            _logger.LogWarning("Email notifications are enabled but SMTP host, from address, or recipients are missing.");
            return false;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(from),
                Subject = $"Kiosk alert: {alert.Type} on {alert.MachineName}",
                Body = BuildEmailBody(alert),
                IsBodyHtml = false
            };

            foreach (var recipient in recipients.Where(r => !string.IsNullOrWhiteSpace(r)))
            {
                message.To.Add(recipient.Trim());
            }

            if (message.To.Count == 0) return false;

            using var client = new SmtpClient(host, _configuration.GetValue("EmailNotifications:SmtpPort", 25))
            {
                EnableSsl = _configuration.GetValue("EmailNotifications:EnableSsl", true)
            };

            var username = _configuration["EmailNotifications:SmtpUsername"];
            var password = _configuration["EmailNotifications:SmtpPassword"];
            if (!string.IsNullOrWhiteSpace(username))
            {
                client.Credentials = new NetworkCredential(username, password);
            }

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(15));
            await client.SendMailAsync(message, cts.Token);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send email notification for alert {AlertId}", alert.Id);
            return false;
        }
    }

    private string BuildEmailBody(Alert alert)
    {
        var dashboardUrl = _configuration["EmailNotifications:DashboardUrl"] ?? "https://kiosk-dashboard.example.local";
        var detailsUrl = $"{dashboardUrl.TrimEnd('/')}/kiosks/{Uri.EscapeDataString(alert.MachineName)}";

        return $"""
        Kiosk alert

        Alert type: {alert.Type}
        Machine: {alert.MachineName}
        Failure reason: {alert.FailureReason}
        Message: {alert.Message}
        Created: {alert.CreatedAt:u}
        Dashboard: {dashboardUrl}
        Kiosk details: {detailsUrl}

        Notification was generated by Kiosk Ops.
        """;
    }
}
