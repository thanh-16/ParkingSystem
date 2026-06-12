using System;

namespace PBMS.Transaction.API.Models
{
    public class PricingRule
    {
        public int Id { get; set; }
        public int VehicleTypeId { get; set; }
        public decimal RatePerHour { get; set; }
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
