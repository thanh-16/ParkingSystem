using System;

namespace PBMS.Payment.API.Models
{
    public class PaymentTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentGateway { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public DateTime TimestampUtc { get; set; }
        public string IdempotencyKey { get; set; } = string.Empty;
    }
}