using System;

namespace PBMS.Registry.API.Models
{
    public enum SlotStatus
    {
        Available,
        Occupied,
        Reserved,
        Maintenance,
        Locked
    }

    public class ParkingSlot
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid FloorId { get; set; }
        public string SlotNumber { get; set; } = string.Empty;
        public SlotStatus Status { get; set; } = SlotStatus.Available;
        public int DistanceMetric { get; set; }
        public DateTime? ReservationTimestampUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

        public Floor? Floor { get; set; }
    }
}