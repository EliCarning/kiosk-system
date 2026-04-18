using System.Security.Claims;

namespace KioskAPI.Auth;

public static class KioskRoles
{
    public const string Admin = "Admin";
    public const string Operator = "Operator";
    public const string Viewer = "Viewer";
}

public static class KioskPolicies
{
    public const string RequireAdmin = "RequireAdmin";
    public const string RequireOperator = "RequireOperator";
    public const string RequireViewer = "RequireViewer";
}

public class RoleGroupOptions
{
    public string[] Admin { get; set; } = Array.Empty<string>();
    public string[] Operator { get; set; } = Array.Empty<string>();
    public string[] Viewer { get; set; } = Array.Empty<string>();
}

public static class RoleResolver
{
    public static IReadOnlyList<string> ResolveRoles(
        ClaimsPrincipal user, RoleGroupOptions options)
    {
        var roles = new List<string>();
        if (HasAdminAccess(user, options)) roles.Add(KioskRoles.Admin);
        if (HasOperatorAccess(user, options) && !roles.Contains(KioskRoles.Operator))
        {
            roles.Add(KioskRoles.Operator);
        }
        if (HasViewerAccess(user, options) && !roles.Contains(KioskRoles.Viewer))
        {
            roles.Add(KioskRoles.Viewer);
        }
        return roles;
    }

    public static bool UserIsInAnyGroup(ClaimsPrincipal user, string[] groups)
    {
        if (groups is null || groups.Length == 0) return false;

        var info = CurrentUser.From(user);
        foreach (var g in groups)
        {
            if (string.IsNullOrWhiteSpace(g)) continue;
            if (user.IsInRole(g)) return true;
            foreach (var resolved in info.Groups)
            {
                if (string.Equals(resolved, g, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }
        return false;
    }

    private static bool HasAppRole(ClaimsPrincipal user, string role) =>
        user.IsInRole(role);

    public static bool HasViewerAccess(ClaimsPrincipal user, RoleGroupOptions options) =>
        HasAppRole(user, KioskRoles.Admin) ||
        HasAppRole(user, KioskRoles.Operator) ||
        HasAppRole(user, KioskRoles.Viewer) ||
        UserIsInAnyGroup(user, options.Admin) ||
        UserIsInAnyGroup(user, options.Operator) ||
        UserIsInAnyGroup(user, options.Viewer);

    public static bool HasOperatorAccess(ClaimsPrincipal user, RoleGroupOptions options) =>
        HasAppRole(user, KioskRoles.Admin) ||
        HasAppRole(user, KioskRoles.Operator) ||
        UserIsInAnyGroup(user, options.Admin) ||
        UserIsInAnyGroup(user, options.Operator);

    public static bool HasAdminAccess(ClaimsPrincipal user, RoleGroupOptions options) =>
        HasAppRole(user, KioskRoles.Admin) ||
        UserIsInAnyGroup(user, options.Admin);
}
