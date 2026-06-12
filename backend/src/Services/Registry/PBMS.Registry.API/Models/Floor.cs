using System;

namespace PBMS.Registry.API.Models
{
    public class Floor
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public int FloorNumber { get; set; }
        public int AllowedVehicleTypeId { get; set; }
        public int TotalSlots { get; set; }

        public VehicleType? AllowedVehicleType { get; set; }
    }
}
