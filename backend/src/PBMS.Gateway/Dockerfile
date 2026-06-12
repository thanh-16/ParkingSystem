FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/PBMS.Gateway/PBMS.Gateway.csproj", "src/PBMS.Gateway/"]
COPY ["src/PBMS.Shared/PBMS.Shared.csproj", "src/PBMS.Shared/"]
RUN dotnet restore "src/PBMS.Gateway/PBMS.Gateway.csproj"
COPY . .
WORKDIR "/src/src/PBMS.Gateway"
RUN dotnet build "PBMS.Gateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PBMS.Gateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PBMS.Gateway.dll"]
