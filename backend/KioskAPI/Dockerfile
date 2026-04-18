FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY KioskAPI.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://+:5226
ENV ASPNETCORE_ENVIRONMENT=Development
EXPOSE 5226
ENTRYPOINT ["dotnet", "KioskAPI.dll"]
