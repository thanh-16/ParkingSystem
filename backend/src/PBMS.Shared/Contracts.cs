using System;

namespace PBMS.Shared
{


    public record CheckInInitiatedEvent
    {
        public Guid SessionId { get; init; }
        public string CardNumber { get; init; } = string.Empty;
        public string LicensePlate { get; init; } = string.Empty;
        public int VehicleTypeId { get; init; }
        public DateTime TimestampUtc { get; init; }
    }

    public record SlotAllocatedEvent
    {
        public Guid SessionId { get; init; }
        public Guid SlotId { get; init; }
        public string SlotNumber { get; init; } = string.Empty;
        public DateTime TimestampUtc { get; init; }
    }

    public record PaymentCompletedEvent
    {
        public Guid SessionId { get; init; }
        public decimal Amount { get; init; }
        public string PaymentGateway { get; init; } = string.Empty;
        public string TransactionId { get; init; } = string.Empty;
        public DateTime TimestampUtc { get; init; }
    }

    public record SlotReleasedEvent
    {
        public Guid SlotId { get; init; }
        public DateTime TimestampUtc { get; init; }
    }

    public record CheckInFailedEvent
    {
        public Guid SessionId { get; init; }
        public string Reason { get; init; } = string.Empty;
        public DateTime TimestampUtc { get; init; }
    }

    public record SlotDeletedEvent
    {
        public Guid SlotId { get; init; }
        public int VehicleTypeId { get; init; }
    }
}