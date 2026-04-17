using KioskAPI.Models;
using KioskAPI.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<IMachineService, MachineService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/api/machines", (IMachineService service) =>
{
    return Results.Ok(service.GetAll());
});

app.MapPost("/api/heartbeat", (HeartbeatRequest request, IMachineService service) =>
{
    if (string.IsNullOrWhiteSpace(request.MachineName))
    {
        return Results.BadRequest("MachineName is required.");
    }

    service.Upsert(request);

    return Results.Ok(new
    {
        message = "Heartbeat received",
        machine = request.MachineName,
        receivedAt = DateTime.UtcNow
    });
});

app.Run();
