using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using PBMS.Shared;
using PBMS.Transaction.API.Models;
using PBMS.Transaction.API.Persistence;

namespace PBMS.Transaction.API.CQRS.Commands
{
    public record CheckOutCommand(string? CardNumber, string? LicensePlate) : IRequest<CheckOutResult>;

    public record CheckOutResult(
        Guid SessionId,
        string LicensePlate,
        DateTime CheckInTime,
        DateTime? CheckOutTime,
        double DurationMinutes,
        decimal TotalFee,
        string Message
    );

    public class CheckOutCommandHandler : IRequestHandler<CheckOutCommand, CheckOutResult>
    {
        private readonly TransactionDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public CheckOutCommandHandler(TransactionDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<CheckOutResult> Handle(CheckOutCommand request, CancellationToken cancellationToken)
        {
            var session = await _context.ParkingSessions
                .FirstOrDefaultAsync(s => (s.CardNumber == request.CardNumber || s.LicensePlate == request.LicensePlate)
                                           && s.Status == "Active", cancellationToken);

            if (session == null)
            {
                throw new InvalidOperationException("Không tìm thấy lượt gửi xe đang hoạt động!");
            }

            var nowUtc = DateTime.UtcNow;
            var duration = nowUtc - session.CheckInTime;
            double hours = Math.Ceiling(duration.TotalHours);
            if (hours < 1) hours = 1;

            var pricingRule = await _context.PricingRules
                .FirstOrDefaultAsync(r => r.VehicleTypeId == session.VehicleTypeId, cancellationToken);

            decimal ratePerHour = pricingRule?.RatePerHour ?? session.VehicleTypeId switch
            {
                1 => 5000m,
                2 => 20000m,
                3 => 30000m,
                4 => 15000m,
                _ => 10000m
            };

            decimal totalFee = (decimal)hours * ratePerHour;

            session.CheckOutTime = nowUtc;
            session.TotalFee = totalFee;
            session.Status = "Completed";

            if (session.AllocatedSlotId.HasValue)
            {
                await _publishEndpoint.Publish(new SlotReleasedEvent
                {
                    SlotId = session.AllocatedSlotId.Value,
                    TimestampUtc = nowUtc
                }, cancellationToken);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return new CheckOutResult(
                session.CorrelationId,
                session.LicensePlate,
                session.CheckInTime,
                session.CheckOutTime,
                Math.Round(duration.TotalMinutes, 1),
                totalFee,
                "Check-out thành công (CQRS). Ô đỗ xe đã được giải phóng."
            );
        }
    }
}