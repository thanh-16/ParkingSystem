using System;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PBMS.Payment.API.Models;
using PBMS.Payment.API.Persistence;
using PBMS.Shared;

namespace PBMS.Payment.API.Controllers
{
    [ApiController]
    [Route("api/v1/payment")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly PaymentDbContext _dbContext;

        public PaymentController(IPublishEndpoint publishEndpoint, PaymentDbContext dbContext)
        {
            _publishEndpoint = publishEndpoint;
            _dbContext = dbContext;
        }

        [HttpPost("checkout-momo")]
        public async Task<IActionResult> ProcessMomoPayment([FromBody] PaymentRequest request, [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey)
        {
            if (string.IsNullOrEmpty(idempotencyKey))
            {
                return BadRequest(new { Message = "Thiếu X-Idempotency-Key header phục vụ chống trùng lặp giao dịch!" });
            }


            var existingTx = await _dbContext.PaymentTransactions
                .FirstOrDefaultAsync(t => t.IdempotencyKey == idempotencyKey);
            if (existingTx != null)
            {
                return Ok(new PaymentResponse(
                    "Success",
                    existingTx.TransactionId,
                    existingTx.Amount,
                    existingTx.PaymentGateway,
                    $"Thanh toán qua {existingTx.PaymentGateway} thành công (idempotent)."
                ));
            }


            await Task.Delay(500);

            var transactionId = "MOMO-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
            var timestamp = DateTime.UtcNow;

            var tx = new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = request.SessionId,
                Amount = request.Amount,
                PaymentGateway = "MoMo",
                TransactionId = transactionId,
                TimestampUtc = timestamp,
                IdempotencyKey = idempotencyKey
            };

            _dbContext.PaymentTransactions.Add(tx);


            await _publishEndpoint.Publish(new PaymentCompletedEvent
            {
                SessionId = request.SessionId,
                Amount = request.Amount,
                PaymentGateway = "MoMo",
                TransactionId = transactionId,
                TimestampUtc = timestamp
            });

            await _dbContext.SaveChangesAsync();

            var response = new PaymentResponse(
                "Success",
                transactionId,
                request.Amount,
                "MoMo",
                "Thanh toán qua MoMo thành công. Cổng chắn barrier sẽ tự động mở."
            );

            return Ok(response);
        }

        [HttpPost("checkout-vnpay")]
        public async Task<IActionResult> ProcessVnPayPayment([FromBody] PaymentRequest request, [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey)
        {
            if (string.IsNullOrEmpty(idempotencyKey))
            {
                return BadRequest(new { Message = "Thiếu X-Idempotency-Key header phục vụ chống trùng lặp giao dịch!" });
            }

            var existingTx = await _dbContext.PaymentTransactions
                .FirstOrDefaultAsync(t => t.IdempotencyKey == idempotencyKey);
            if (existingTx != null)
            {
                return Ok(new PaymentResponse(
                    "Success",
                    existingTx.TransactionId,
                    existingTx.Amount,
                    existingTx.PaymentGateway,
                    $"Thanh toán qua {existingTx.PaymentGateway} thành công (idempotent)."
                ));
            }

            await Task.Delay(500);

            var transactionId = "VNPAY-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
            var timestamp = DateTime.UtcNow;

            var tx = new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = request.SessionId,
                Amount = request.Amount,
                PaymentGateway = "VNPay",
                TransactionId = transactionId,
                TimestampUtc = timestamp,
                IdempotencyKey = idempotencyKey
            };

            _dbContext.PaymentTransactions.Add(tx);

            await _publishEndpoint.Publish(new PaymentCompletedEvent
            {
                SessionId = request.SessionId,
                Amount = request.Amount,
                PaymentGateway = "VNPay",
                TransactionId = transactionId,
                TimestampUtc = timestamp
            });

            await _dbContext.SaveChangesAsync();

            var response = new PaymentResponse(
                "Success",
                transactionId,
                request.Amount,
                "VNPay",
                "Thanh toán qua VNPay thành công. Cổng chắn barrier sẽ tự động mở."
            );

            return Ok(response);
        }


        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> PaymentWebhook([FromBody] PaymentWebhookPayload payload)
        {
            if (payload.Status != "Success")
            {
                return BadRequest(new { Message = "Giao dịch không hợp lệ hoặc thất bại!" });
            }

            var idempotencyKey = $"webhook-{payload.PartnerRefId}";
            var existingTx = await _dbContext.PaymentTransactions
                .FirstOrDefaultAsync(t => t.IdempotencyKey == idempotencyKey);
            if (existingTx != null)
            {
                return Ok(new { Message = "Webhook đã được xử lý trước đó!" });
            }

            var tx = new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = payload.SessionId,
                Amount = payload.Amount,
                PaymentGateway = payload.Gateway,
                TransactionId = payload.TransactionId,
                TimestampUtc = DateTime.UtcNow,
                IdempotencyKey = idempotencyKey
            };

            _dbContext.PaymentTransactions.Add(tx);

            await _publishEndpoint.Publish(new PaymentCompletedEvent
            {
                SessionId = payload.SessionId,
                Amount = payload.Amount,
                PaymentGateway = payload.Gateway,
                TransactionId = payload.TransactionId,
                TimestampUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            return Ok(new { Message = "Webhook processed successfully", TransactionId = payload.TransactionId });
        }
    }

    public record PaymentRequest(Guid SessionId, decimal Amount);
    public record PaymentResponse(string Status, string TransactionId, decimal Amount, string Gateway, string Message);
    public record PaymentWebhookPayload(Guid SessionId, decimal Amount, string Gateway, string TransactionId, string PartnerRefId, string Status);
}