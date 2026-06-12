using System;
using System.Threading.Tasks;
using MassTransit;
using PBMS.AI.API.Services;
using PBMS.Shared;

namespace PBMS.AI.API.Consumers
{
    public class SlotDeletedEventConsumer : IConsumer<SlotDeletedEvent>
    {
        private readonly RedisSortedSetCache _cache;

        public SlotDeletedEventConsumer(RedisSortedSetCache cache)
        {
            _cache = cache;
        }

        public async Task Consume(ConsumeContext<SlotDeletedEvent> context)
        {
            var @event = context.Message;
            Console.WriteLine($"SlotDeletedEventConsumer: Removing slot {@event.SlotId} from Redis cache.");
            await _cache.RemoveSlotAsync(@event.SlotId);
        }
    }
}
