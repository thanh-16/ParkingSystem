using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PBMS.Transaction.API.Models;
using PBMS.Transaction.API.Persistence;

namespace PBMS.Transaction.API.Controllers
{
    [ApiController]
    [Route("api/v1/driver")]
    [Authorize]
    public class DriverController : ControllerBase
    {
        private readonly TransactionDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _registryBaseUrl;

        public DriverController(TransactionDbContext context, IHttpClientFactory httpClientFactory, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _registryBaseUrl = configuration["Services:RegistryUrl"] ?? "http://localhost:5020";
        }

        [HttpGet("sessions/current")]
        public async Task<IActionResult> GetCurrentSession([FromQuery] string licensePlate)
        {
            var session = await _context.ParkingSessions
                .FirstOrDefaultAsync(s => s.LicensePlate == licensePlate && s.Status == "Active");

            if (session == null)
            {
                return NotFound(new { Message = "Không tìm thấy phiên gửi xe hoạt động nào cho biển số này!" });
            }

            var nowUtc = DateTime.UtcNow;
            var duration = nowUtc - session.CheckInTime;
            double hours = Math.Ceiling(duration.TotalHours);
            if (hours < 1) hours = 1;

            var pricingRule = await _context.PricingRules
                .FirstOrDefaultAsync(r => r.VehicleTypeId == session.VehicleTypeId);
            decimal ratePerHour = pricingRule?.RatePerHour ?? 20000m;
            decimal tempFee = (decimal)hours * ratePerHour;

            return Ok(new
            {
                session.CorrelationId,
                session.LicensePlate,
                session.CheckInTime,
                session.AllocatedSlotId,
                DurationMinutes = Math.Round(duration.TotalMinutes, 1),
                TemporaryFee = tempFee,
                Status = session.Status
            });
        }

        [HttpPost("bookings")]
        [Authorize(Roles = "Driver,Manager")]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        {
            // Check if there is already an active booking or active session
            var activeSession = await _context.ParkingSessions
                .AnyAsync(s => s.LicensePlate == request.LicensePlate && s.Status == "Active");
            if (activeSession)
            {
                return BadRequest(new { Message = "Xe của bạn hiện đang đỗ trong bãi!" });
            }

            var activeBooking = await _context.Bookings
                .FirstOrDefaultAsync(b => b.LicensePlate == request.LicensePlate && b.Status == "Confirmed" && b.ExpiryTimeUtc > DateTime.UtcNow);
            if (activeBooking != null)
            {
                return Ok(new { Message = "Bạn đã có một lịch đặt chỗ đang hoạt động!", Booking = activeBooking });
            }

            // Fetch available slots from Registry
            var client = _httpClientFactory.CreateClient();
            List<ParkingSlotDto>? availableSlots = null;
            try
            {
                var url = $"{_registryBaseUrl.TrimEnd('/')}/api/v1/registry/slots/available?vehicleTypeId={request.VehicleTypeId}";
                availableSlots = await client.GetFromJsonAsync<List<ParkingSlotDto>>(url);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Không thể kết nối đến Registry Service: {ex.Message}" });
            }

            if (availableSlots == null || availableSlots.Count == 0)
            {
                return BadRequest(new { Message = "Hệ thống hết vị trí trống cho loại xe này!" });
            }

            // Select the first slot as optimal (Registry returns available slots sorted by floor allowed)
            var slot = availableSlots[0];

            // Update slot status in Registry to Reserved (2)
            try
            {
                var updateUrl = $"{_registryBaseUrl.TrimEnd('/')}/api/v1/registry/slots/update-status";
                var response = await client.PostAsJsonAsync(updateUrl, new { SlotId = slot.Id, Status = 2 });
                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode(500, new { Message = "Không thể cập nhật trạng thái ô đỗ trong Registry Service." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Không thể cập nhật trạng thái ô đỗ: {ex.Message}" });
            }

            // Create Booking
            var nowUtc = DateTime.UtcNow;
            var booking = new Booking
            {
                LicensePlate = request.LicensePlate,
                VehicleTypeId = request.VehicleTypeId,
                SlotId = slot.Id,
                SlotNumber = slot.SlotNumber,
                BookingTimeUtc = nowUtc,
                ExpiryTimeUtc = nowUtc.AddMinutes(30), // Valid for 30 minutes
                Status = "Confirmed"
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đặt chỗ thành công! Ô đỗ được giữ trong 30 phút.", Booking = booking });
        }
    }

    public record CreateBookingRequest(string LicensePlate, int VehicleTypeId);

    public class ParkingSlotDto
    {
        public Guid Id { get; set; }
        public Guid FloorId { get; set; }
        public string SlotNumber { get; set; } = string.Empty;
        public int DistanceMetric { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
