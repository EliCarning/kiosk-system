using System.Security.Claims;
using System.Security.Principal;

namespace KioskAPI.Auth;

public sealed record CurrentUserInfo(
    string Username,
    string Domain,
    IReadOnlyList<string> Groups);

public static class CurrentUser
{
    public static CurrentUserInfo From(ClaimsPrincipal principal)
    {
        var name = principal.Identity?.Name ?? string.Empty;

        string domain = string.Empty;
        string username = name;
        if (!string.IsNullOrWhiteSpace(name))
        {
            var slash = name.IndexOf('\\');
            if (slash > 0)
            {
                domain = name.Substring(0, slash);
                username = name.Substring(slash + 1);
            }
            else
            {
                var at = name.IndexOf('@');
                if (at > 0)
                {
                    username = name.Substring(0, at);
                    domain = name.Substring(at + 1);
                }
            }
        }

        var groups = ResolveGroups(principal);

        return new CurrentUserInfo(username, domain, groups);
    }

    private static IReadOnlyList<string> ResolveGroups(ClaimsPrincipal principal)
    {
        var result = new List<string>();

        foreach (var claim in principal.FindAll(ClaimTypes.Role))
        {
            if (!string.IsNullOrWhiteSpace(claim.Value))
            {
                result.Add(claim.Value);
            }
        }

        foreach (var claim in principal.FindAll(ClaimTypes.GroupSid))
        {
            var translated = TryTranslateSid(claim.Value);
            if (!string.IsNullOrWhiteSpace(translated) && !result.Contains(translated))
            {
                result.Add(translated);
            }
        }

        return result;
    }

    private static string? TryTranslateSid(string sidValue)
    {
        try
        {
            var sid = new SecurityIdentifier(sidValue);
            var account = (NTAccount)sid.Translate(typeof(NTAccount));
            return account.Value;
        }
        catch
        {
            return sidValue;
        }
    }
}
