FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Services/AI/PBMS.AI.API/PBMS.AI.API.csproj", "src/Services/AI/PBMS.AI.API/"]
COPY ["src/PBMS.Shared/PBMS.Shared.csproj", "src/PBMS.Shared/"]
RUN dotnet restore "src/Services/AI/PBMS.AI.API/PBMS.AI.API.csproj"
COPY . .
WORKDIR "/src/src/Services/AI/PBMS.AI.API"
RUN dotnet build "PBMS.AI.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PBMS.AI.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PBMS.AI.API.dll"]
