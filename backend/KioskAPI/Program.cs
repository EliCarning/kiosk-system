using KioskAPI.Data;
using KioskAPI.Models;
using KioskAPI.Services;
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:3000",
                  "http://127.0.0.1:3000")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
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

app.MapPost("/api/heartbeat", async (HeartbeatRequest request, IMachineService service) =>
{
    if (string.IsNullOrWhiteSpace(request.MachineName))
    {
        return Results.BadRequest("machineName is required");
    }

    var machine = await service.UpsertAsync(request);
    return Results.Ok(machine);
});

app.MapGet("/api/machines", async (IMachineService service) =>
    Results.Ok(await service.GetAllAsync()));

app.MapGet("/api/kiosks", async (IMachineService service) =>
    Results.Ok(await service.GetAllAsync()));

app.MapPost("/api/logs", async (Log log, ILogService service) =>
{
    if (string.IsNullOrWhiteSpace(log.MachineName))
    {
        return Results.BadRequest("machineName is required");
    }

    var saved = await service.AddAsync(log);
    return Results.Ok(saved);
});

app.MapGet("/api/machines/{machineName}/logs", async (string machineName, ILogService service) =>
    Results.Ok(await service.GetByMachineAsync(machineName)));

app.MapGet("/api/kiosks/{machineName}/logs", async (string machineName, ILogService service) =>
    Results.Ok(await service.GetByMachineAsync(machineName)));

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
});

app.MapGet("/api/commands/pending/{machineName}", async (string machineName, ICommandService service) =>
    Results.Ok(await service.GetPendingAsync(machineName)));

app.MapGet("/api/commands/{machineName}/pending", async (string machineName, ICommandService service) =>
    Results.Ok(await service.GetPendingAsync(machineName)));

app.MapPost("/api/commands/{id:guid}/complete",
    async (Guid id, CompleteCommandRequest? request, ICommandService service) =>
    {
        var success = request?.Success ?? true;
        var command = await service.CompleteAsync(id, success);
        return command is null ? Results.NotFound() : Results.Ok(command);
    });

app.MapGet("/api/commands/{machineName}", async (string machineName, ICommandService service) =>
    Results.Ok(await service.GetByMachineAsync(machineName)));

app.Run();
