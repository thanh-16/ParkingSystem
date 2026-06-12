using System;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PBMS.Shared;
using PBMS.Transaction.API.Persistence;

namespace PBMS.Transaction.API.Controllers
{
    [ApiController]
    [Route("api/v1/staff/sessions")]
    [Authorize(Roles = "Manager,Staff")]
    public class ExceptionController : ControllerBase
    {
        private readonly TransactionDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public ExceptionController(TransactionDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        [HttpPut("{id}/exceptions")]
        public async Task<IActionResult> HandleSessionException(Guid id, [FromBody] HandleExceptionRequest request)
        {
            var session = await _context.ParkingSessions.FirstOrDefaultAsync(s => s.CorrelationId == id);
            if (session == null)
            {
                return NotFound(new { Message = "Không tìm thấy phiên gửi xe!" });
            }

            if (session.Status == "Completed")
            {
                return BadRequest(new { Message = "Phiên gửi xe này đã hoàn thành trước đó!" });
            }

            var nowUtc = DateTime.UtcNow;
            session.Status = "Exception";
            session.CheckOutTime = nowUtc;
            session.Notes = request.Notes;
            session.TotalFee = request.CustomFee ?? 0m;

            await _context.SaveChangesAsync();


            if (session.AllocatedSlotId.HasValue)
            {
                await _publishEndpoint.Publish(new SlotReleasedEvent
                {
                    SlotId = session.AllocatedSlotId.Value,
                    TimestampUtc = nowUtc
                });
            }

            return Ok(new { Message = "Xử lý ngoại lệ thành công! Ô đỗ xe đã được giải phóng.", Session = session });
        }
    }

    public record HandleExceptionRequest(string Notes, decimal? CustomFee);
}