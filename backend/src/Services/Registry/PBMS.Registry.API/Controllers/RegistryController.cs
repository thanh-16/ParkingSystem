using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PBMS.Registry.API.Models;
using PBMS.Registry.API.Persistence;
using MassTransit;
using PBMS.Shared;

namespace PBMS.Registry.API.Controllers
{
    [ApiController]
    [Route("api/v1/registry")]
    [Authorize]
    public class RegistryController : ControllerBase
    {
        private readonly RegistryDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public RegistryController(RegistryDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        [HttpGet("floors")]
        public async Task<IActionResult> GetFloors()
        {
            var floors = await _context.Floors.Include(f => f.AllowedVehicleType).ToListAsync();
            return Ok(floors);
        }

        [HttpGet("slots")]
        public async Task<IActionResult> GetSlots()
        {
            var slots = await _context.ParkingSlots.Include(s => s.Floor).ToListAsync();
            return Ok(slots);
        }

        [HttpGet("floors/occupancy")]
        public async Task<IActionResult> GetFloorsOccupancy()
        {
            var occupancy = await _context.Floors
                .Select(f => new FloorOccupancyDto(
                    f.Id,
                    f.FloorNumber,
                    _context.ParkingSlots.Count(s => s.FloorId == f.Id && s.Status != SlotStatus.Available),
                    f.TotalSlots
                ))
                .ToListAsync();

            return Ok(occupancy);
        }

        [HttpGet("slots/available")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailableSlots([FromQuery] int vehicleTypeId)
        {
            // 1. Ưu tiên tìm ô đỗ còn trống trên các tầng được thiết kế đúng cho loại xe này
            var allowedFloors = await _context.Floors
                .Where(f => f.AllowedVehicleTypeId == vehicleTypeId)
                .Select(f => f.Id)
                .ToListAsync();

            var slots = await _context.ParkingSlots
                .Include(s => s.Floor)
                .Where(s => allowedFloors.Contains(s.FloorId) && s.Status == SlotStatus.Available)
                .ToListAsync();

            // 2. Nếu tầng ưu tiên đã đầy và đây là xe ô tô (loại 2 - Sedan, 3 - SUV, 4 - EV), cho phép đỗ ở tầng ô tô khác còn trống
            if ((slots == null || slots.Count == 0) && (vehicleTypeId == 2 || vehicleTypeId == 3 || vehicleTypeId == 4))
            {
                var carFloors = await _context.Floors
                    .Where(f => f.AllowedVehicleTypeId == 2 || f.AllowedVehicleTypeId == 3 || f.AllowedVehicleTypeId == 4)
                    .Select(f => f.Id)
                    .ToListAsync();

                slots = await _context.ParkingSlots
                    .Include(s => s.Floor)
                    .Where(s => carFloors.Contains(s.FloorId) && s.Status == SlotStatus.Available)
                    .ToListAsync();
            }

            return Ok(slots);
        }

        [HttpPost("slots/update-status")]
        [Authorize(Roles = "Driver,Staff,Manager")]
        public async Task<IActionResult> UpdateSlotStatus([FromBody] UpdateSlotStatusRequest request)
        {
            var slot = await _context.ParkingSlots.FindAsync(request.SlotId);
            if (slot == null) return NotFound(new { Message = "Không tìm thấy ô đỗ!" });

            var oldStatus = slot.Status;
            slot.Status = request.Status;
            if (request.Status == SlotStatus.Reserved)
            {
                slot.ReservationTimestampUtc = DateTime.UtcNow;
            }
            else
            {
                slot.ReservationTimestampUtc = null;
            }

            try
            {
                await _context.SaveChangesAsync();


                if (request.Status != SlotStatus.Available && oldStatus == SlotStatus.Available)
                {

                    var floor = await _context.Floors.FindAsync(slot.FloorId);
                    int vehicleTypeId = floor?.AllowedVehicleTypeId ?? 1;
                    await _publishEndpoint.Publish(new SlotDeletedEvent
                    {
                        SlotId = slot.Id,
                        VehicleTypeId = vehicleTypeId
                    });
                }
                else if (request.Status == SlotStatus.Available && oldStatus != SlotStatus.Available)
                {

                    await _publishEndpoint.Publish(new SlotReleasedEvent
                    {
                        SlotId = slot.Id,
                        TimestampUtc = DateTime.UtcNow
                    });
                }
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { Message = "Xung đột đồng thời khi cập nhật trạng thái ô đỗ!" });
            }

            return Ok(new { Message = "Cập nhật trạng thái thành công!", SlotId = slot.Id, Status = slot.Status.ToString() });
        }

        [HttpPost("slots/batch-update-status")]
        [Authorize(Policy = "StaffOrManager")]
        public async Task<IActionResult> BatchUpdateSlotStatus([FromBody] BatchUpdateSlotStatusRequest request)
        {
            var slots = await _context.ParkingSlots.Where(s => request.SlotIds.Contains(s.Id)).ToListAsync();
            if (!slots.Any()) return NotFound(new { Message = "Không tìm thấy ô đỗ nào!" });

            try
            {
                foreach (var slot in slots)
                {
                    var oldStatus = slot.Status;
                    slot.Status = request.Status;
                    if (request.Status == SlotStatus.Reserved)
                    {
                        slot.ReservationTimestampUtc = DateTime.UtcNow;
                    }
                    else
                    {
                        slot.ReservationTimestampUtc = null;
                    }

                    if (request.Status != SlotStatus.Available && oldStatus == SlotStatus.Available)
                    {
                        var floor = await _context.Floors.FindAsync(slot.FloorId);
                        int vehicleTypeId = floor?.AllowedVehicleTypeId ?? 1;
                        await _publishEndpoint.Publish(new SlotDeletedEvent
                        {
                            SlotId = slot.Id,
                            VehicleTypeId = vehicleTypeId
                        });
                    }
                    else if (request.Status == SlotStatus.Available && oldStatus != SlotStatus.Available)
                    {
                        await _publishEndpoint.Publish(new SlotReleasedEvent
                        {
                            SlotId = slot.Id,
                            TimestampUtc = DateTime.UtcNow
                        });
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { Message = "Xung đột đồng thời khi cập nhật hàng loạt trạng thái ô đỗ!" });
            }

            return Ok(new { Message = "Cập nhật hàng loạt trạng thái thành công!", Count = slots.Count });
        }

        [HttpPost("setup")]
        [Authorize(Policy = "ManagerOnly")]
        public async Task<IActionResult> SetupRegistryData()
        {
            _context.ParkingSlots.RemoveRange(_context.ParkingSlots);
            _context.Floors.RemoveRange(_context.Floors);
            await _context.SaveChangesAsync();


            var floor1 = new Floor { FloorNumber = 1, AllowedVehicleTypeId = 2, TotalSlots = 15 };
            var floor2 = new Floor { FloorNumber = 2, AllowedVehicleTypeId = 3, TotalSlots = 10 };
            var floor3 = new Floor { FloorNumber = 3, AllowedVehicleTypeId = 4, TotalSlots = 10 };

            _context.Floors.AddRange(floor1, floor2, floor3);
            await _context.SaveChangesAsync();


            for (int i = 1; i <= 15; i++)
            {
                _context.ParkingSlots.Add(new ParkingSlot
                {
                    FloorId = floor1.Id,
                    SlotNumber = $"F1-C{i:00}",
                    Status = SlotStatus.Available,
                    DistanceMetric = i * 4
                });
            }


            for (int i = 1; i <= 10; i++)
            {
                _context.ParkingSlots.Add(new ParkingSlot
                {
                    FloorId = floor2.Id,
                    SlotNumber = $"F2-S{i:00}",
                    Status = SlotStatus.Available,
                    DistanceMetric = i * 5
                });
            }


            for (int i = 1; i <= 10; i++)
            {
                _context.ParkingSlots.Add(new ParkingSlot
                {
                    FloorId = floor3.Id,
                    SlotNumber = $"F3-E{i:00}",
                    Status = SlotStatus.Available,
                    DistanceMetric = i * 6
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Mock Registry data seeded. 3 floors, 35 slots created." });
        }

        [HttpPost("floors")]
        [Authorize(Policy = "ManagerOnly")]
        public async Task<IActionResult> CreateFloor([FromBody] CreateFloorRequest request)
        {
            var floor = new Floor
            {
                Id = Guid.NewGuid(),
                FloorNumber = request.FloorNumber,
                AllowedVehicleTypeId = request.AllowedVehicleTypeId,
                TotalSlots = request.TotalSlots
            };

            _context.Floors.Add(floor);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetFloors), new { id = floor.Id }, floor);
        }

        [HttpPut("floors/{id}")]
        [Authorize(Policy = "ManagerOnly")]
        public async Task<IActionResult> UpdateFloor(Guid id, [FromBody] UpdateFloorRequest request)
        {
            var floor = await _context.Floors.FindAsync(id);
            if (floor == null) return NotFound(new { Message = "Không tìm thấy tầng!" });

            floor.FloorNumber = request.FloorNumber;
            floor.AllowedVehicleTypeId = request.AllowedVehicleTypeId;
            floor.TotalSlots = request.TotalSlots;

            await _context.SaveChangesAsync();
            return Ok(floor);
        }

        [HttpDelete("floors/{id}")]
        [Authorize(Policy = "ManagerOnly")]
        public async Task<IActionResult> DeleteFloor(Guid id)
        {
            var floor = await _context.Floors.FindAsync(id);
            if (floor == null) return NotFound(new { Message = "Không tìm thấy tầng!" });

            _context.Floors.Remove(floor);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Xóa tầng thành công!" });
        }

        [HttpPost("slots")]
        [Authorize(Policy = "ManagerOnly")]
        public async Task<IActionResult> CreateSlot([FromBody] CreateSlotRequest request)
        {
            var slot = new ParkingSlot
            {
                Id = Guid.NewGuid(),
                FloorId = request.FloorId,
                SlotNumber = request.SlotNumber,
                DistanceMetric = request.DistanceMetric,
                Status = SlotStatus.Available
            };

            _context.ParkingSlots.Add(slot);
            await _context.SaveChangesAsync();
            return Ok(slot);
        }

        [HttpPut("slots/{id}")]
        [Authorize(Policy = "ManagerOnly")]
        public async Task<IActionResult> UpdateSlot(Guid id, [FromBody] UpdateSlotRequest request)
        {
            var slot = await _context.ParkingSlots.FindAsync(id);
            if (slot == null) return NotFound(new { Message = "Không tìm thấy ô đỗ!" });

            slot.FloorId = request.FloorId;
            slot.SlotNumber = request.SlotNumber;
            slot.DistanceMetric = request.DistanceMetric;

            await _context.SaveChangesAsync();
            return Ok(slot);
        }

        [HttpDelete("slots/{id}")]
        [Authorize(Policy = "ManagerOnly")]
        public async Task<IActionResult> DeleteSlot(Guid id)
        {
            var slot = await _context.ParkingSlots.Include(s => s.Floor).FirstOrDefaultAsync(s => s.Id == id);
            if (slot == null) return NotFound(new { Message = "Không tìm thấy ô đỗ!" });

            int vehicleTypeId = slot.Floor?.AllowedVehicleTypeId ?? 1;

            _context.ParkingSlots.Remove(slot);
            await _context.SaveChangesAsync();


            await _publishEndpoint.Publish(new SlotDeletedEvent
            {
                SlotId = slot.Id,
                VehicleTypeId = vehicleTypeId
            });

            return Ok(new { Message = "Xóa ô đỗ thành công!" });
        }
    }

    public record UpdateSlotStatusRequest(Guid SlotId, SlotStatus Status);
    public record BatchUpdateSlotStatusRequest(System.Collections.Generic.List<Guid> SlotIds, SlotStatus Status);
    public record CreateFloorRequest(int FloorNumber, int AllowedVehicleTypeId, int TotalSlots);
    public record UpdateFloorRequest(int FloorNumber, int AllowedVehicleTypeId, int TotalSlots);
    public record CreateSlotRequest(Guid FloorId, string SlotNumber, int DistanceMetric);
    public record UpdateSlotRequest(Guid FloorId, string SlotNumber, int DistanceMetric);
    public record FloorOccupancyDto(Guid FloorId, int FloorNumber, int OccupiedSlots, int TotalSlots);
}