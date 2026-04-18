using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace KioskAPI.Auth;

public class DevUserOptions
{
    public string Username { get; set; } = "dev-user";
    public string Domain { get; set; } = "DEV";
    public string[] Roles { get; set; } = new[] { KioskRoles.Admin };
}

public class DevAuthenticationOptions : AuthenticationSchemeOptions
{
}

public class DevAuthenticationHandler : AuthenticationHandler<DevAuthenticationOptions>
{
    public const string SchemeName = "Development";

    private readonly DevUserOptions _devUser;

    public DevAuthenticationHandler(
        IOptionsMonitor<DevAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        DevUserOptions devUser)
        : base(options, logger, encoder)
    {
        _devUser = devUser;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var username = string.IsNullOrWhiteSpace(_devUser.Username)
            ? "dev-user"
            : _devUser.Username;
        var domain = string.IsNullOrWhiteSpace(_devUser.Domain)
            ? "DEV"
            : _devUser.Domain;

        var displayName = username.Contains('\\') || username.Contains('@')
            ? username
            : $"{domain}\\{username}";

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, displayName),
            new(ClaimTypes.NameIdentifier, displayName)
        };

        foreach (var role in _devUser.Roles ?? Array.Empty<string>())
        {
            if (!string.IsNullOrWhiteSpace(role))
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }
        }

        var identity = new ClaimsIdentity(claims, SchemeName, ClaimTypes.Name, ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
