using FluentValidation;

namespace PBMS.Transaction.API.CQRS.Commands
{
    public class CheckOutCommandValidator : AbstractValidator<CheckOutCommand>
    {
        public CheckOutCommandValidator()
        {
            RuleFor(x => x)
                .Must(x => !string.IsNullOrEmpty(x.CardNumber) || !string.IsNullOrEmpty(x.LicensePlate))
                .WithMessage("Vui lòng cung cấp mã thẻ hoặc biển số xe để check-out.");
        }
    }
}
