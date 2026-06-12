using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MassTransit;
using PBMS.Shared;
using PBMS.Transaction.API.Models;
using PBMS.Transaction.API.Persistence;

namespace PBMS.Transaction.API.CQRS.Commands
{
    public record CheckInCommand(string CardNumber, string LicensePlate, int VehicleTypeId) : IRequest<CheckInResult>;

    public record CheckInResult(Guid SessionId, string Status, string Message);

    public class CheckInCommandHandler : IRequestHandler<CheckInCommand, CheckInResult>
    {
        private readonly TransactionDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public CheckInCommandHandler(TransactionDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<CheckInResult> Handle(CheckInCommand request, CancellationToken cancellationToken)
        {
            var nowUtc = DateTime.UtcNow;

            var session = new ParkingSession
            {
                CorrelationId = Guid.NewGuid(),
                CardNumber = request.CardNumber,
                LicensePlate = request.LicensePlate,
                VehicleTypeId = request.VehicleTypeId,
                CheckInTime = nowUtc,
                Status = "Pending"
            };

            _context.ParkingSessions.Add(session);
            await _context.SaveChangesAsync(cancellationToken);

            // Publish async event through MassTransit
            await _publishEndpoint.Publish(new CheckInInitiatedEvent
            {
                SessionId = session.CorrelationId,
                CardNumber = session.CardNumber,
                LicensePlate = session.LicensePlate,
                VehicleTypeId = session.VehicleTypeId,
                TimestampUtc = nowUtc
            }, cancellationToken);

            return new CheckInResult(
                session.CorrelationId,
                session.Status,
                "Check-in được khởi tạo thành công (CQRS). Đang xử lý phân bổ ô đỗ xe."
            );
        }
    }
}
