namespace PBMS.Registry.API.Models
{
    public class VehicleType
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}