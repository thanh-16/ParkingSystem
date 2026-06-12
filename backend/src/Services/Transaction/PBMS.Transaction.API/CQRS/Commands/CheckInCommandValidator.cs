using FluentValidation;

namespace PBMS.Transaction.API.CQRS.Commands
{
    public class CheckInCommandValidator : AbstractValidator<CheckInCommand>
    {
        public CheckInCommandValidator()
        {
            RuleFor(x => x.CardNumber)
                .NotEmpty().WithMessage("Mã thẻ không được để trống.");

            RuleFor(x => x.LicensePlate)
                .NotEmpty().WithMessage("Biển số xe không được để trống.");

            RuleFor(x => x.VehicleTypeId)
                .InclusiveBetween(1, 4).WithMessage("Loại xe không hợp lệ (1: Xe máy, 2: Ô tô con, 3: SUV, 4: Xe điện).");
        }
    }
}