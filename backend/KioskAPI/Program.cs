using KioskAPI.Auth;
using KioskAPI.Data;
using KioskAPI.Hubs;
using KioskAPI.Models;
using KioskAPI.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IMachineService, MachineService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddScoped<ICommandService, CommandService>();
builder.Services.AddScoped<IAlertService, AlertService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddSingleton<IRealtimeNotifier, RealtimeNotifier>();
builder.Services.AddSignalR();
builder.Services.AddHostedService<OfflineAlertWorker>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:3000",
                  "http://127.0.0.1:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var isDevelopment = builder.Environment.IsDevelopment();

if (isDevelopment)
{
    var devUser = builder.Configuration.GetSection("DevUser").Get<DevUserOptions>()
                  ?? new DevUserOptions();
    builder.Services.AddSingleton(devUser);

    builder.Services
        .AddAuthentication(DevAuthenticationHandler.SchemeName)
        .AddScheme<DevAuthenticationOptions, DevAuthenticationHandler>(
            DevAuthenticationHandler.SchemeName, _ => { });
}
else
{
    builder.Services
        .AddAuthentication(NegotiateDefaults.AuthenticationScheme)
        .AddNegotiate();
}

var roleGroups = builder.Configuration
    .GetSection("Auth:RoleGroups")
    .Get<RoleGroupOptions>() ?? new RoleGroupOptions();
builder.Services.AddSingleton(roleGroups);

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy(KioskPolicies.RequireAdmin, p =>
        p.RequireAssertion(ctx => RoleResolver.HasAdminAccess(ctx.User, roleGroups)));

    options.AddPolicy(KioskPolicies.RequireOperator, p =>
        p.RequireAssertion(ctx => RoleResolver.HasOperatorAccess(ctx.User, roleGroups)));

    options.AddPolicy(KioskPolicies.RequireViewer, p =>
        p.RequireAssertion(ctx => RoleResolver.HasViewerAccess(ctx.User, roleGroups)));
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

const string AgentKeyHeader = "X-Agent-Key";
var expectedAgentKey = app.Configuration["Agent:ApiKey"];

IResult? RequireAgentKey(HttpContext ctx)
{
    if (string.IsNullOrWhiteSpace(expectedAgentKey))
    {
        return Results.Problem(
            "Agent API key is not configured on the server.",
            statusCode: StatusCodes.Status500InternalServerError);
    }

    if (!ctx.Request.Headers.TryGetValue(AgentKeyHeader, out var provided)
        || !string.Equals(provided.ToString(), expectedAgentKey, StringComparison.Ordinal))
    {
        return Results.Unauthorized();
    }

    return null;
}

app.MapGet("/api/me", (HttpContext ctx) =>
{
    var info = CurrentUser.From(ctx.User);
    return Results.Ok(new
    {
        username = info.Username,
        domain = info.Domain,
        groups = info.Groups
    });
}).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/me/permissions", (HttpContext ctx) =>
{
    var info = CurrentUser.From(ctx.User);
    var roles = RoleResolver.ResolveRoles(ctx.User, roleGroups);
    var isAdmin = roles.Contains(KioskRoles.Admin);
    var isOperator = isAdmin || roles.Contains(KioskRoles.Operator);
    var isViewer = isOperator || roles.Contains(KioskRoles.Viewer);

    return Results.Ok(new
    {
        username = info.Username,
        roles,
        canReboot = isOperator,
        canOperate = isOperator,
        canView = isViewer
    });
}).RequireAuthorization();

app.MapPost("/api/heartbeat", async (HttpContext ctx, HeartbeatRequest request, IMachineService service) =>
{
    var denied = RequireAgentKey(ctx);
    if (denied is not null) return denied;

    if (string.IsNullOrWhiteSpace(request.MachineName))
    {
        return Results.BadRequest("machineName is required");
    }

    var machine = await service.UpsertAsync(request);
    return Results.Ok(machine);
}).AllowAnonymous();

app.MapGet("/api/machines", async (IMachineService service, CancellationToken ct) =>
    Results.Ok(await service.GetAllAsync(ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/kiosks", async (IMachineService service, CancellationToken ct) =>
    Results.Ok(await service.GetAllAsync(ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapPost("/api/logs", async (HttpContext ctx, Log log, ILogService service) =>
{
    var denied = RequireAgentKey(ctx);
    if (denied is not null) return denied;

    if (string.IsNullOrWhiteSpace(log.MachineName))
    {
        return Results.BadRequest("machineName is required");
    }

    var saved = await service.AddAsync(log);
    return Results.Ok(saved);
}).AllowAnonymous();

app.MapGet("/api/machines/{machineName}/logs",
    async (string machineName, ILogService service, CancellationToken ct) =>
        Results.Ok(await service.GetByMachineAsync(machineName, ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/kiosks/{machineName}/logs",
    async (string machineName, ILogService service, CancellationToken ct) =>
        Results.Ok(await service.GetByMachineAsync(machineName, ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapPost("/api/commands", async (CreateCommandRequest request, ICommandService service) =>
{
    if (string.IsNullOrWhiteSpace(request.MachineName))
    {
        return Results.BadRequest("machineName is required");
    }

    if (string.IsNullOrWhiteSpace(request.Type))
    {
        return Results.BadRequest("type is required");
    }

    var command = await service.EnqueueAsync(request);
    return Results.Created($"/api/commands/{command.Id}", command);
}).RequireAuthorization(KioskPolicies.RequireOperator);

app.MapGet("/api/commands/pending/{machineName}",
    async (HttpContext ctx, string machineName, ICommandService service) =>
    {
        var denied = RequireAgentKey(ctx);
        if (denied is not null) return denied;
        return Results.Ok(await service.GetPendingAsync(machineName));
    }).AllowAnonymous();

app.MapGet("/api/commands/{machineName}/pending",
    async (HttpContext ctx, string machineName, ICommandService service) =>
    {
        var denied = RequireAgentKey(ctx);
        if (denied is not null) return denied;
        return Results.Ok(await service.GetPendingAsync(machineName));
    }).AllowAnonymous();

app.MapPost("/api/commands/{id:guid}/start",
    async (HttpContext ctx, Guid id, ICommandService service) =>
    {
        var denied = RequireAgentKey(ctx);
        if (denied is not null) return denied;

        var command = await service.MarkRunningAsync(id);
        return command is null ? Results.NotFound() : Results.Ok(command);
    }).AllowAnonymous();

app.MapPost("/api/commands/{id:guid}/complete",
    async (HttpContext ctx, Guid id, CompleteCommandRequest? request, ICommandService service) =>
    {
        var denied = RequireAgentKey(ctx);
        if (denied is not null) return denied;

        var success = request?.Success ?? true;
        var command = await service.CompleteAsync(id, success);
        return command is null ? Results.NotFound() : Results.Ok(command);
    }).AllowAnonymous();

app.MapGet("/api/commands/{machineName}", async (string machineName, ICommandService service) =>
    Results.Ok(await service.GetByMachineAsync(machineName)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/commands",
    async (ICommandService service, string? status, int? limit, CancellationToken ct) =>
        Results.Ok(await service.GetRecentAsync(limit ?? 100, status, ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/alerts", async (IAlertService service, CancellationToken ct) =>
    Results.Ok(await service.GetActiveAsync(ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/alerts/history", async (IAlertService service, CancellationToken ct) =>
    Results.Ok(await service.GetHistoryAsync(ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapPost("/api/alerts/{id:guid}/resolve",
    async (Guid id, IAlertService service, CancellationToken ct) =>
    {
        var alert = await service.ResolveAsync(id, ct);
        return alert is null ? Results.NotFound() : Results.Ok(alert);
    }).RequireAuthorization(KioskPolicies.RequireOperator);

app.MapGet("/api/sites", async (AppDbContext db, CancellationToken ct) =>
{
    var sites = await db.Sites
        .AsNoTracking()
        .OrderBy(s => s.Name)
        .Select(s => new { id = s.Id, name = s.Name })
        .ToListAsync(ct);
    return Results.Ok(sites);
}).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/sites/{siteId:guid}/departments",
    async (Guid siteId, AppDbContext db, CancellationToken ct) =>
    {
        var siteExists = await db.Sites.AnyAsync(s => s.Id == siteId, ct);
        if (!siteExists) return Results.NotFound();

        var depts = await db.Departments
            .AsNoTracking()
            .Where(d => d.SiteId == siteId)
            .OrderBy(d => d.Name)
            .Select(d => new { id = d.Id, name = d.Name, siteId = d.SiteId })
            .ToListAsync(ct);
        return Results.Ok(depts);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/sites/{siteId:guid}/kiosks",
    async (Guid siteId, AppDbContext db, CancellationToken ct) =>
    {
        var now = DateTime.UtcNow;
        var online = MachineService.OnlineThreshold;
        var kiosks = await db.Kiosks
            .AsNoTracking()
            .Where(k => k.SiteId == siteId)
            .OrderBy(k => k.MachineName)
            .ToListAsync(ct);
        return Results.Ok(kiosks.Select(k => new MachineStatus
        {
            MachineName = k.MachineName,
            IpAddress = k.IpAddress,
            LastSeen = k.LastSeen,
            Status = (now - k.LastSeen) <= online ? "Online" : "Offline",
            SiteId = k.SiteId,
            DepartmentId = k.DepartmentId
        }));
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/departments/{departmentId:guid}/kiosks",
    async (Guid departmentId, AppDbContext db, CancellationToken ct) =>
    {
        var now = DateTime.UtcNow;
        var online = MachineService.OnlineThreshold;
        var kiosks = await db.Kiosks
            .AsNoTracking()
            .Where(k => k.DepartmentId == departmentId)
            .OrderBy(k => k.MachineName)
            .ToListAsync(ct);
        return Results.Ok(kiosks.Select(k => new MachineStatus
        {
            MachineName = k.MachineName,
            IpAddress = k.IpAddress,
            LastSeen = k.LastSeen,
            Status = (now - k.LastSeen) <= online ? "Online" : "Offline",
            SiteId = k.SiteId,
            DepartmentId = k.DepartmentId
        }));
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapPost("/api/kiosks/{machineName}/assign",
    async (string machineName, AssignKioskRequest request, AppDbContext db,
           IRealtimeNotifier realtime, CancellationToken ct) =>
    {
        var kiosk = await db.Kiosks.FirstOrDefaultAsync(k => k.MachineName == machineName, ct);
        if (kiosk is null) return Results.NotFound();

        if (request.SiteId is Guid siteId)
        {
            var siteExists = await db.Sites.AnyAsync(s => s.Id == siteId, ct);
            if (!siteExists) return Results.BadRequest("Unknown siteId");
            kiosk.SiteId = siteId;
        }
        else
        {
            kiosk.SiteId = null;
        }

        if (request.DepartmentId is Guid deptId)
        {
            var dept = await db.Departments.FirstOrDefaultAsync(d => d.Id == deptId, ct);
            if (dept is null) return Results.BadRequest("Unknown departmentId");
            if (kiosk.SiteId is Guid s && dept.SiteId != s)
            {
                return Results.BadRequest("Department does not belong to the provided site");
            }
            kiosk.DepartmentId = deptId;
            if (kiosk.SiteId is null) kiosk.SiteId = dept.SiteId;
        }
        else
        {
            kiosk.DepartmentId = null;
        }

        await db.SaveChangesAsync(ct);
        await realtime.MachineUpdatedAsync(kiosk.MachineName, kiosk.Status, kiosk.LastSeen, ct);

        return Results.Ok(new MachineStatus
        {
            MachineName = kiosk.MachineName,
            IpAddress = kiosk.IpAddress,
            LastSeen = kiosk.LastSeen,
            Status = kiosk.Status,
            SiteId = kiosk.SiteId,
            DepartmentId = kiosk.DepartmentId
        });
    }).RequireAuthorization(KioskPolicies.RequireOperator);

app.MapGet("/api/dashboard/summary",
    async (IDashboardService svc, CancellationToken ct) =>
        Results.Ok(await svc.GetGlobalSummaryAsync(ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/sites/{siteId:guid}/summary",
    async (Guid siteId, IDashboardService svc, CancellationToken ct) =>
    {
        var result = await svc.GetSiteSummaryAsync(siteId, ct);
        return result is null ? Results.NotFound() : Results.Ok(result);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/departments/{departmentId:guid}/summary",
    async (Guid departmentId, IDashboardService svc, CancellationToken ct) =>
    {
        var result = await svc.GetDepartmentSummaryAsync(departmentId, ct);
        return result is null ? Results.NotFound() : Results.Ok(result);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/sites/{siteId:guid}/issues",
    async (Guid siteId, IDashboardService svc, CancellationToken ct) =>
    {
        var result = await svc.GetSiteIssuesAsync(siteId, ct);
        return result is null ? Results.NotFound() : Results.Ok(result);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/departments/{departmentId:guid}/issues",
    async (Guid departmentId, IDashboardService svc, CancellationToken ct) =>
    {
        var result = await svc.GetDepartmentIssuesAsync(departmentId, ct);
        return result is null ? Results.NotFound() : Results.Ok(result);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/kiosks/{machineName}/overview",
    async (string machineName, IDashboardService svc, CancellationToken ct) =>
    {
        var result = await svc.GetKioskOverviewAsync(machineName, ct);
        return result is null ? Results.NotFound() : Results.Ok(result);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/kiosks/{machineName}/recent-alerts",
    async (string machineName, IDashboardService svc, CancellationToken ct) =>
        Results.Ok(await svc.GetKioskRecentAlertsAsync(machineName, 20, ct)))
    .RequireAuthorization(KioskPolicies.RequireViewer);

// ── System Info ──────────────────────────────────────────────────────────────

app.MapPost("/api/system-info", async (HttpContext ctx, SystemInfo payload, AppDbContext db, CancellationToken ct) =>
{
    var denied = RequireAgentKey(ctx);
    if (denied is not null) return denied;

    if (string.IsNullOrWhiteSpace(payload.MachineName))
        return Results.BadRequest("machineName is required");

    payload.Id = Guid.NewGuid();
    payload.CollectedAt = DateTime.UtcNow;

    db.SystemInfoSnapshots.Add(payload);
    await db.SaveChangesAsync(ct);

    return Results.Ok(payload);
}).AllowAnonymous();

app.MapGet("/api/kiosks/{machineName}/system-info/latest",
    async (string machineName, AppDbContext db, CancellationToken ct) =>
    {
        var snapshot = await db.SystemInfoSnapshots
            .AsNoTracking()
            .Where(s => s.MachineName == machineName)
            .OrderByDescending(s => s.CollectedAt)
            .FirstOrDefaultAsync(ct);

        return snapshot is null ? Results.NotFound() : Results.Ok(snapshot);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

// ── Event Logs ───────────────────────────────────────────────────────────────

app.MapPost("/api/event-logs", async (HttpContext ctx, EventLogBatch batch, AppDbContext db, CancellationToken ct) =>
{
    var denied = RequireAgentKey(ctx);
    if (denied is not null) return denied;

    if (string.IsNullOrWhiteSpace(batch.MachineName))
        return Results.BadRequest("machineName is required");

    if (batch.Entries is null || batch.Entries.Count == 0)
        return Results.Ok(new { saved = 0 });

    var collectedAt = DateTime.UtcNow;
    var entries = batch.Entries.Select(e => new EventLogEntry
    {
        Id = Guid.NewGuid(),
        MachineName = batch.MachineName,
        LogName = e.LogName,
        Source = e.Source,
        EventId = e.EventId,
        Level = e.Level,
        Message = e.Message,
        Timestamp = e.Timestamp,
        CollectedAt = collectedAt
    }).ToList();

    db.EventLogEntries.AddRange(entries);
    await db.SaveChangesAsync(ct);

    return Results.Ok(new { saved = entries.Count });
}).AllowAnonymous();

app.MapGet("/api/kiosks/{machineName}/event-logs",
    async (string machineName, int? limit, AppDbContext db, CancellationToken ct) =>
    {
        var take = Math.Clamp(limit ?? 50, 1, 200);
        var entries = await db.EventLogEntries
            .AsNoTracking()
            .Where(e => e.MachineName == machineName)
            .OrderByDescending(e => e.Timestamp)
            .Take(take)
            .ToListAsync(ct);

        return Results.Ok(entries);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

// ── RDP Sessions ─────────────────────────────────────────────────────────────

app.MapPost("/api/rdp-sessions", async (HttpContext ctx, RdpSessionBatch batch, AppDbContext db, CancellationToken ct) =>
{
    var denied = RequireAgentKey(ctx);
    if (denied is not null) return denied;

    if (string.IsNullOrWhiteSpace(batch.MachineName))
        return Results.BadRequest("machineName is required");

    var collectedAt = DateTime.UtcNow;

    var existing = db.RdpSessions.Where(r => r.MachineName == batch.MachineName);
    db.RdpSessions.RemoveRange(existing);

    if (batch.Sessions is { Count: > 0 })
    {
        var sessions = batch.Sessions.Select(s => new RdpSession
        {
            Id = Guid.NewGuid(),
            MachineName = batch.MachineName,
            Username = s.Username,
            SessionName = s.SessionName ?? string.Empty,
            State = s.State,
            LoginTime = s.LoginTime,
            CollectedAt = collectedAt
        }).ToList();
        db.RdpSessions.AddRange(sessions);
    }

    await db.SaveChangesAsync(ct);
    return Results.Ok(new { saved = batch.Sessions?.Count ?? 0 });
}).AllowAnonymous();

app.MapGet("/api/kiosks/{machineName}/rdp-sessions",
    async (string machineName, AppDbContext db, CancellationToken ct) =>
    {
        var sessions = await db.RdpSessions
            .AsNoTracking()
            .Where(r => r.MachineName == machineName)
            .OrderBy(r => r.Username)
            .ToListAsync(ct);
        return Results.Ok(sessions);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapGet("/api/kiosks/{machineName}/rdp-events",
    async (string machineName, int? limit, AppDbContext db, CancellationToken ct) =>
    {
        var take = Math.Clamp(limit ?? 100, 1, 500);
        var rdpEventIds = new[] { 4624, 4634, 4778, 4779 };
        var entries = await db.EventLogEntries
            .AsNoTracking()
            .Where(e => e.MachineName == machineName
                     && e.LogName == "Security"
                     && rdpEventIds.Contains(e.EventId))
            .OrderByDescending(e => e.Timestamp)
            .Take(take)
            .ToListAsync(ct);
        return Results.Ok(entries);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

// ── Windows Services ──────────────────────────────────────────────────────────

app.MapPost("/api/services", async (HttpContext ctx, WindowsServiceBatch batch, AppDbContext db, CancellationToken ct) =>
{
    var denied = RequireAgentKey(ctx);
    if (denied is not null) return denied;

    if (string.IsNullOrWhiteSpace(batch.MachineName))
        return Results.BadRequest("machineName is required");

    var collectedAt = DateTime.UtcNow;

    var existing = db.WindowsServices.Where(s => s.MachineName == batch.MachineName);
    db.WindowsServices.RemoveRange(existing);

    if (batch.Services is { Count: > 0 })
    {
        var services = batch.Services.Select(s => new WindowsService
        {
            Id = Guid.NewGuid(),
            MachineName = batch.MachineName,
            ServiceName = s.ServiceName,
            DisplayName = s.DisplayName,
            Status = s.Status,
            StartType = s.StartType,
            CollectedAt = collectedAt
        }).ToList();
        db.WindowsServices.AddRange(services);
    }

    await db.SaveChangesAsync(ct);
    return Results.Ok(new { saved = batch.Services?.Count ?? 0 });
}).AllowAnonymous();

app.MapGet("/api/kiosks/{machineName}/services",
    async (string machineName, AppDbContext db, CancellationToken ct) =>
    {
        var services = await db.WindowsServices
            .AsNoTracking()
            .Where(s => s.MachineName == machineName)
            .OrderBy(s => s.ServiceName)
            .ToListAsync(ct);
        return Results.Ok(services);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

// ── Windows Processes ─────────────────────────────────────────────────────────

app.MapPost("/api/processes", async (HttpContext ctx, WindowsProcessBatch batch, AppDbContext db, CancellationToken ct) =>
{
    var denied = RequireAgentKey(ctx);
    if (denied is not null) return denied;

    if (string.IsNullOrWhiteSpace(batch.MachineName))
        return Results.BadRequest("machineName is required");

    var collectedAt = DateTime.UtcNow;

    var existing = db.WindowsProcesses.Where(p => p.MachineName == batch.MachineName);
    db.WindowsProcesses.RemoveRange(existing);

    if (batch.Processes is { Count: > 0 })
    {
        var processes = batch.Processes.Select(p => new WindowsProcess
        {
            Id = Guid.NewGuid(),
            MachineName = batch.MachineName,
            ProcessName = p.ProcessName,
            Pid = p.Pid,
            MemoryMb = p.MemoryMb,
            CollectedAt = collectedAt
        }).ToList();
        db.WindowsProcesses.AddRange(processes);
    }

    await db.SaveChangesAsync(ct);
    return Results.Ok(new { saved = batch.Processes?.Count ?? 0 });
}).AllowAnonymous();

app.MapGet("/api/kiosks/{machineName}/processes",
    async (string machineName, AppDbContext db, CancellationToken ct) =>
    {
        var processes = await db.WindowsProcesses
            .AsNoTracking()
            .Where(p => p.MachineName == machineName)
            .OrderByDescending(p => p.MemoryMb)
            .ToListAsync(ct);
        return Results.Ok(processes);
    }).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapHub<KioskHub>("/hubs/kiosk");

// Dashboard layout persistence (file-based per user)
var layoutDir = Path.Combine(AppContext.BaseDirectory, "dashboard-layouts");
Directory.CreateDirectory(layoutDir);

app.MapGet("/api/dashboard/layout", (HttpContext ctx) =>
{
    var username = CurrentUser.From(ctx.User).Username ?? "default";
    var safe = string.Concat(username.Select(c => char.IsLetterOrDigit(c) ? c : '_'));
    var path = Path.Combine(layoutDir, $"{safe}.json");
    if (!File.Exists(path)) return Results.Ok(new { layout = (string?)null });
    var layout = File.ReadAllText(path);
    return Results.Ok(new { layout });
}).RequireAuthorization(KioskPolicies.RequireViewer);

app.MapPost("/api/dashboard/layout", async (SaveLayoutRequest req, HttpContext ctx) =>
{
    var username = CurrentUser.From(ctx.User).Username ?? "default";
    var safe = string.Concat(username.Select(c => char.IsLetterOrDigit(c) ? c : '_'));
    var path = Path.Combine(layoutDir, $"{safe}.json");
    await File.WriteAllTextAsync(path, req.Layout ?? string.Empty);
    return Results.Ok();
}).RequireAuthorization(KioskPolicies.RequireViewer);

app.Run();

public record AssignKioskRequest(Guid? SiteId, Guid? DepartmentId);

public record EventLogEntryDto(
    string LogName,
    string Source,
    int EventId,
    string Level,
    string Message,
    DateTime Timestamp);

public record EventLogBatch(string MachineName, List<EventLogEntryDto> Entries);

public record RdpSessionDto(string Username, string? SessionName, string State, DateTime? LoginTime);
public record RdpSessionBatch(string MachineName, List<RdpSessionDto>? Sessions);

public record WindowsServiceDto(string ServiceName, string DisplayName, string Status, string StartType);
public record WindowsServiceBatch(string MachineName, List<WindowsServiceDto>? Services);

public record WindowsProcessDto(string ProcessName, int Pid, long MemoryMb);
public record WindowsProcessBatch(string MachineName, List<WindowsProcessDto>? Processes);

public record SaveLayoutRequest(string? Layout);
