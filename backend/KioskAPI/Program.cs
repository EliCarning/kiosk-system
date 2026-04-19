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
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IMachineService, MachineService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddScoped<ICommandService, CommandService>();
builder.Services.AddScoped<IAlertService, AlertService>();
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

app.MapHub<KioskHub>("/hubs/kiosk");

app.Run();
