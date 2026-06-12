using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PBMS.Transaction.API.Models;
using PBMS.Transaction.API.Persistence;

namespace PBMS.Transaction.API.Controllers
{
    [ApiController]
    [Route("api/v1/manager/pricing-rules")]
    [Authorize(Roles = "Manager")]
    public class PricingController : ControllerBase
    {
        private readonly TransactionDbContext _context;

        public PricingController(TransactionDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetPricingRules()
        {
            var rules = await _context.PricingRules.ToListAsync();
            return Ok(rules);
        }

        [HttpPost]
        public async Task<IActionResult> UpdatePricingRule([FromBody] UpdatePricingRequest request)
        {
            if (request.RatePerHour < 0)
            {
                return BadRequest(new { Message = "Đơn giá không được âm!" });
            }

            var rule = await _context.PricingRules.FirstOrDefaultAsync(r => r.VehicleTypeId == request.VehicleTypeId);
            if (rule == null)
            {
                rule = new PricingRule
                {
                    VehicleTypeId = request.VehicleTypeId,
                    RatePerHour = request.RatePerHour,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                _context.PricingRules.Add(rule);
            }
            else
            {
                rule.RatePerHour = request.RatePerHour;
                rule.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Cập nhật bảng giá thành công!", Rule = rule });
        }
    }

    public record UpdatePricingRequest(int VehicleTypeId, decimal RatePerHour);
}