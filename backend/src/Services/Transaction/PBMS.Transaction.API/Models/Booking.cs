using System;

namespace PBMS.Transaction.API.Models
{
    public class Booking
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string LicensePlate { get; set; } = string.Empty;
        public int VehicleTypeId { get; set; }
        public Guid SlotId { get; set; }
        public string SlotNumber { get; set; } = string.Empty;
        public DateTime BookingTimeUtc { get; set; } = DateTime.UtcNow;
        public DateTime ExpiryTimeUtc { get; set; }
        public string Status { get; set; } = "Confirmed";
    }
}