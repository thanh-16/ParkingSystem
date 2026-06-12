using System;
using System.Threading.Tasks;
using MassTransit;
using PBMS.Shared;
using PBMS.Transaction.API.Models;
using PBMS.Transaction.API.Services;

namespace PBMS.Transaction.API.Saga
{
    public class ParkingSessionSaga : MassTransitStateMachine<ParkingSession>
    {
        public ParkingSessionSaga(RedLockService redLock)
        {
            InstanceState(x => x.CurrentState);

            Event(() => CheckInInitiated, x => x.CorrelateById(context => context.Message.SessionId));
            Event(() => SlotAllocated, x => x.CorrelateById(context => context.Message.SessionId));
            Event(() => PaymentCompleted, x => x.CorrelateById(context => context.Message.SessionId));
            Event(() => CheckInFailed, x => x.CorrelateById(context => context.Message.SessionId));

            Initially(
                When(CheckInInitiated)
                    .Then(context =>
                    {
                        context.Saga.CardNumber = context.Message.CardNumber;
                        context.Saga.LicensePlate = context.Message.LicensePlate;
                        context.Saga.VehicleTypeId = context.Message.VehicleTypeId;
                        context.Saga.CheckInTime = context.Message.TimestampUtc;
                        context.Saga.Status = "Pending";
                    })
                    .TransitionTo(CheckInPending)
            );

            During(CheckInPending,
                When(SlotAllocated)
                    .ThenAsync(async context =>
                    {
                        string lockValue = Guid.NewGuid().ToString();
                        bool lockAcquired = await redLock.AcquireLockAsync(context.Message.SlotId.ToString(), lockValue, TimeSpan.FromSeconds(10));

                        if (!lockAcquired)
                        {
                            await context.Publish(new SlotReleasedEvent
                            {
                                SlotId = context.Message.SlotId,
                                TimestampUtc = DateTime.UtcNow
                            });
                            context.Saga.Status = "Exception";
                            return;
                        }

                        try
                        {
                            context.Saga.AllocatedSlotId = context.Message.SlotId;
                            context.Saga.Status = "Active";
                        }
                        finally
                        {
                            await redLock.ReleaseLockAsync(context.Message.SlotId.ToString(), lockValue);
                        }
                    })
                    .IfElse(context => context.Saga.Status == "Active",
                        x => x.TransitionTo(Active),
                        x => x.TransitionTo(Failed)),
                When(CheckInFailed)
                    .Then(context =>
                    {
                        context.Saga.Status = "Failed";
                    })
                    .TransitionTo(Failed)
            );

            During(Active,
                When(PaymentCompleted)
                    .Then(context =>
                    {
                        context.Saga.CheckOutTime = context.Message.TimestampUtc;
                        context.Saga.TotalFee = context.Message.Amount;
                        context.Saga.Status = "Completed";
                    })
                    .Publish(context => new SlotReleasedEvent
                    {
                        SlotId = context.Saga.AllocatedSlotId ?? Guid.Empty,
                        TimestampUtc = DateTime.UtcNow
                    })
                    .TransitionTo(Completed)
            );
        }

        public State CheckInPending { get; private set; } = null!;
        public State Active { get; private set; } = null!;
        public State Completed { get; private set; } = null!;
        public State Failed { get; private set; } = null!;

        public Event<CheckInInitiatedEvent> CheckInInitiated { get; private set; } = null!;
        public Event<SlotAllocatedEvent> SlotAllocated { get; private set; } = null!;
        public Event<PaymentCompletedEvent> PaymentCompleted { get; private set; } = null!;
        public Event<CheckInFailedEvent> CheckInFailed { get; private set; } = null!;
    }
}