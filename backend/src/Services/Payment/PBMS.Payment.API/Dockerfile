FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Services/Payment/PBMS.Payment.API/PBMS.Payment.API.csproj", "src/Services/Payment/PBMS.Payment.API/"]
COPY ["src/PBMS.Shared/PBMS.Shared.csproj", "src/PBMS.Shared/"]
RUN dotnet restore "src/Services/Payment/PBMS.Payment.API/PBMS.Payment.API.csproj"
COPY . .
WORKDIR "/src/src/Services/Payment/PBMS.Payment.API"
RUN dotnet build "PBMS.Payment.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PBMS.Payment.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PBMS.Payment.API.dll"]
