using System;
using MassTransit;

namespace PBMS.Transaction.API.Models
{
    public class ParkingSession : SagaStateMachineInstance, ISagaVersion
    {

        public Guid CorrelationId { get; set; } = Guid.NewGuid();
        public string CurrentState { get; set; } = string.Empty;
        public int Version { get; set; }

        public string CardNumber { get; set; } = string.Empty;
        public string LicensePlate { get; set; } = string.Empty;
        public int VehicleTypeId { get; set; }
        public Guid? AllocatedSlotId { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public decimal? TotalFee { get; set; }
        public string Status { get; set; } = "Pending";
        public string? Notes { get; set; }
    }
}