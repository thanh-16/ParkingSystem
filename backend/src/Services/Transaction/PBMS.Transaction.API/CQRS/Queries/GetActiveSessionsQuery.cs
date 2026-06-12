using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PBMS.Transaction.API.Models;
using PBMS.Transaction.API.Persistence;

namespace PBMS.Transaction.API.CQRS.Queries
{
    public record GetActiveSessionsQuery() : IRequest<List<ParkingSession>>;

    public class GetActiveSessionsQueryHandler : IRequestHandler<GetActiveSessionsQuery, List<ParkingSession>>
    {
        private readonly TransactionDbContext _context;

        public GetActiveSessionsQueryHandler(TransactionDbContext context)
        {
            _context = context;
        }

        public async Task<List<ParkingSession>> Handle(GetActiveSessionsQuery request, CancellationToken cancellationToken)
        {
            return await _context.ParkingSessions
                .Where(s => s.Status == "Active" || s.Status == "Pending")
                .ToListAsync(cancellationToken);
        }
    }
}