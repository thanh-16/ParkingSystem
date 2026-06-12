using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PBMS.Transaction.API.CQRS.Commands;
using PBMS.Transaction.API.CQRS.Queries;

namespace PBMS.Transaction.API.Controllers
{
    [ApiController]
    [Route("api/v1/transaction")]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly IMediator _mediator;

        public TransactionController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("check-in")]
        [Authorize(Roles = "Staff,Driver")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInRequest request)
        {
            var command = new CheckInCommand(request.CardNumber, request.LicensePlate, request.VehicleTypeId);
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPost("check-out")]
        [Authorize(Roles = "Staff,Driver")]
        public async Task<IActionResult> CheckOut([FromBody] CheckOutRequest request)
        {
            if (string.IsNullOrEmpty(request.CardNumber) && string.IsNullOrEmpty(request.LicensePlate))
            {
                return BadRequest(new { Message = "Vui lòng cung cấp mã thẻ hoặc biển số xe!" });
            }

            try
            {
                var command = new CheckOutCommand(request.CardNumber, request.LicensePlate);
                var result = await _mediator.Send(command);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("sessions/active")]
        [Authorize(Roles = "Manager,Staff")]
        public async Task<IActionResult> GetActiveSessions()
        {
            var query = new GetActiveSessionsQuery();
            var result = await _mediator.Send(query);
            return Ok(result);
        }
    }

    public record CheckInRequest(string CardNumber, string LicensePlate, int VehicleTypeId);
    public record CheckOutRequest(string? CardNumber, string? LicensePlate);
}