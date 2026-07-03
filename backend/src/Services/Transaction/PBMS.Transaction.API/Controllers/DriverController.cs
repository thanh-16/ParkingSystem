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

        [HttpGet("wallet")]
        public async Task<IActionResult> GetWallet()
        {
            var username = User.Identity?.Name ?? "guest";
            var wallet = await _context.DriverWallets.FirstOrDefaultAsync(w => w.Username == username);
            if (wallet == null)
            {
                wallet = new DriverWallet { Username = username, Balance = 0m };
                _context.DriverWallets.Add(wallet);
                await _context.SaveChangesAsync();
            }
            return Ok(wallet);
        }

        [HttpPost("wallet/deposit")]
        public async Task<IActionResult> Deposit([FromBody] DepositRequest request)
        {
            if (request.Amount <= 0)
            {
                return BadRequest(new { Message = "Số tiền nạp phải lớn hơn 0!" });
            }

            var username = User.Identity?.Name ?? "guest";
            var wallet = await _context.DriverWallets.FirstOrDefaultAsync(w => w.Username == username);
            if (wallet == null)
            {
                wallet = new DriverWallet { Username = username, Balance = 0m };
                _context.DriverWallets.Add(wallet);
            }

            wallet.Balance += request.Amount;
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Nạp thành công {request.Amount:N0} đ vào ví!", Wallet = wallet });
        }

        [HttpGet("bookings")]
        [Authorize(Roles = "Driver,Manager,Staff")]
        public async Task<IActionResult> GetActiveBookings()
        {
            var bookings = await _context.Bookings
                .Where(b => b.Status == "Confirmed" && b.ExpiryTimeUtc > DateTime.UtcNow)
                .ToListAsync();
            return Ok(bookings);
        }

        [HttpGet("bookings/active-plate/{licensePlate}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActiveBookingByPlate(string licensePlate)
        {
            var booking = await _context.Bookings
                .FirstOrDefaultAsync(b => b.LicensePlate == licensePlate && b.Status == "Confirmed" && b.ExpiryTimeUtc > DateTime.UtcNow);
            if (booking == null)
            {
                return NotFound(new { Message = "Không tìm thấy đặt chỗ cho biển số này." });
            }
            return Ok(booking);
        }

        [HttpPost("bookings")]
        [Authorize(Roles = "Driver,Manager")]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        {
            var activeSession = await _context.ParkingSessions
                .AnyAsync(s => s.LicensePlate == request.LicensePlate && s.Status == "Active");
            if (activeSession)
            {
                return BadRequest(new { Message = "Xe của bạn hiện đang đỗ trong bãi!" });
            }

            // Chống spam: không cho đặt trùng biển số xe
            var activeBooking = await _context.Bookings
                .FirstOrDefaultAsync(b => b.LicensePlate == request.LicensePlate && b.Status == "Confirmed" && b.ExpiryTimeUtc > DateTime.UtcNow);
            if (activeBooking != null)
            {
                return BadRequest(new { Message = "Biển số xe này đã được đặt giữ chỗ trước đó!" });
            }

            // Kiểm tra ví điện tử và số dư tối thiểu (20.000đ)
            var username = User.Identity?.Name ?? "guest";
            var wallet = await _context.DriverWallets.FirstOrDefaultAsync(w => w.Username == username);
            if (wallet == null || wallet.Balance < 20000m)
            {
                return BadRequest(new { Message = "Số dư tài khoản không đủ để đặt chỗ! Vui lòng nạp tối thiểu 20.000 đ vào ví." });
            }

            var client = _httpClientFactory.CreateClient();
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var tokenVal = authHeader.Substring("Bearer ".Length).Trim();
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenVal);
            }
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

            var slot = availableSlots[0];

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

            // Trừ tiền cọc giữ chỗ trong ví của Driver
            wallet.Balance -= 20000m;

            var nowUtc = DateTime.UtcNow;
            var booking = new Booking
            {
                LicensePlate = request.LicensePlate,
                VehicleTypeId = request.VehicleTypeId,
                SlotId = slot.Id,
                SlotNumber = slot.SlotNumber,
                BookingTimeUtc = nowUtc,
                ExpiryTimeUtc = nowUtc.AddMinutes(30),
                Status = "Confirmed"
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đặt chỗ thành công! Ô đỗ được giữ trong 30 phút. Đã khấu trừ 20.000đ tiền cọc.", Booking = booking, Balance = wallet.Balance });
        }
    }

    public record CreateBookingRequest(string LicensePlate, int VehicleTypeId);
    public record DepositRequest(decimal Amount);

    public class ParkingSlotDto
    {
        public Guid Id { get; set; }
        public Guid FloorId { get; set; }
        public string SlotNumber { get; set; } = string.Empty;
        public int DistanceMetric { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}