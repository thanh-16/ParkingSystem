using System;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace PBMS.AI.API.Services
{
    public class RedisSortedSetCache
    {
        private readonly IConnectionMultiplexer? _redis;
        private readonly IDatabase? _db;
        private readonly bool _isEnabled = false;

        public RedisSortedSetCache(string connectionString)
        {
            try
            {
                var options = ConfigurationOptions.Parse(connectionString);
                options.ConnectTimeout = 2000;
                options.AbortOnConnectFail = false;
                _redis = ConnectionMultiplexer.Connect(options);
                _db = _redis!.GetDatabase();
                _isEnabled = _redis.IsConnected;

                if (_isEnabled && _redis != null)
                {

                    try
                    {
                        var endpoints = _redis.GetEndPoints();
                        if (endpoints.Length > 0)
                        {
                            var server = _redis.GetServer(endpoints[0]);
                            server.ConfigSet("notify-keyspace-events", "Ex");

                            var subscriber = _redis.GetSubscriber();
                            subscriber.Subscribe(RedisChannel.Literal("__keyevent@0__:expired"), (channel, message) =>
                            {
                                string expiredKey = message.ToString();
                                if (expiredKey.StartsWith("reserved_slot:"))
                                {
                                    string slotIdStr = expiredKey.Substring("reserved_slot:".Length);
                                    if (Guid.TryParse(slotIdStr, out Guid slotId))
                                    {
                                        Console.WriteLine($"Redis expired notification received for slot {slotId}. Releasing slot back to available pool.");
                                        Task.Run(() => ReleaseSlotAsync(slotId));
                                    }
                                }
                            });
                        }
                    }
                    catch (Exception kex)
                    {
                        Console.WriteLine($"Could not configure Redis keyspace notifications: {kex.Message}. Self-releasing timeout task will serve as fallback.");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Redis connection failed in AI Service: {ex.Message}. Redis Caching is disabled.");
            }
        }

        private bool IsRedisAvailable()
        {
            return _isEnabled && _redis != null && _redis.IsConnected;
        }

        public async Task AddAvailableSlotAsync(int vehicleTypeId, Guid slotId, double score, string slotNumber = "")
        {
            if (!IsRedisAvailable() || _db == null) return;

            string key = $"available_slots:{vehicleTypeId}";
            await _db.SortedSetAddAsync(key, slotId.ToString(), score);


            string infoKey = $"slot_info:{slotId}";
            var entries = new System.Collections.Generic.List<HashEntry>
            {
                new HashEntry("VehicleTypeId", vehicleTypeId),
                new HashEntry("Score", score)
            };
            if (!string.IsNullOrEmpty(slotNumber))
            {
                entries.Add(new HashEntry("SlotNumber", slotNumber));
            }
            await _db.HashSetAsync(infoKey, entries.ToArray());
        }

        public async Task<string?> GetSlotNumberAsync(Guid slotId)
        {
            if (!IsRedisAvailable() || _db == null) return null;
            string infoKey = $"slot_info:{slotId}";
            var val = await _db.HashGetAsync(infoKey, "SlotNumber");
            return val.HasValue ? val.ToString() : null;
        }

        public async Task<Guid?> PopOptimalSlotAsync(int vehicleTypeId)
        {
            if (!IsRedisAvailable() || _db == null) return null;

            string key = $"available_slots:{vehicleTypeId}";


            var rangeResult = await _db.SortedSetRangeByRankWithScoresAsync(key, 0, 0, Order.Descending);
            if (rangeResult.Length == 0) return null;

            var entry = rangeResult[0];
            string slotIdStr = entry.Element.ToString();

            if (Guid.TryParse(slotIdStr, out Guid slotId))
            {

                await _db.SortedSetRemoveAsync(key, slotIdStr);
                return slotId;
            }

            return null;
        }

        public async Task<bool> ReserveSlotAsync(Guid slotId, TimeSpan duration)
        {
            if (!IsRedisAvailable() || _db == null) return false;

            string lockKey = $"reserved_slot:{slotId}";


            bool acquired = await _db.StringSetAsync(lockKey, "Reserved", duration, When.NotExists);
            if (!acquired) return false;


            _ = Task.Run(async () =>
            {
                await Task.Delay(duration);

                if (await _db.KeyExistsAsync(lockKey))
                {
                    Console.WriteLine($"Temporary lock expired for slot {slotId}. Automatically releasing back to cache.");
                    await ReleaseSlotAsync(slotId);
                }
            });

            return true;
        }

        public async Task ReleaseSlotAsync(Guid slotId)
        {
            if (!IsRedisAvailable() || _db == null) return;

            string lockKey = $"reserved_slot:{slotId}";
            await _db.KeyDeleteAsync(lockKey);


            string infoKey = $"slot_info:{slotId}";
            var vehicleTypeIdVal = await _db.HashGetAsync(infoKey, "VehicleTypeId");
            var scoreVal = await _db.HashGetAsync(infoKey, "Score");

            if (vehicleTypeIdVal.HasValue && scoreVal.HasValue &&
                int.TryParse(vehicleTypeIdVal.ToString(), out int vehicleTypeId) &&
                double.TryParse(scoreVal.ToString(), out double score))
            {
                string setKey = $"available_slots:{vehicleTypeId}";
                await _db.SortedSetAddAsync(setKey, slotId.ToString(), score);
            }
        }

        public async Task ClearAvailableSlotsAsync()
        {
            if (!IsRedisAvailable() || _db == null) return;
            for (int vt = 1; vt <= 4; vt++)
            {
                await _db.KeyDeleteAsync($"available_slots:{vt}");
            }
        }

        public async Task RemoveSlotAsync(Guid slotId)
        {
            if (!IsRedisAvailable() || _db == null) return;

            string infoKey = $"slot_info:{slotId}";
            var vehicleTypeIdVal = await _db.HashGetAsync(infoKey, "VehicleTypeId");


            await _db.KeyDeleteAsync(infoKey);
            await _db.KeyDeleteAsync($"reserved_slot:{slotId}");

            if (vehicleTypeIdVal.HasValue && int.TryParse(vehicleTypeIdVal.ToString(), out int vehicleTypeId))
            {
                string setKey = $"available_slots:{vehicleTypeId}";
                await _db.SortedSetRemoveAsync(setKey, slotId.ToString());
            }
            else
            {

                for (int vt = 1; vt <= 4; vt++)
                {
                    await _db.SortedSetRemoveAsync($"available_slots:{vt}", slotId.ToString());
                }
            }
        }

        public async Task SetWeightsAsync(double w1, double w2, double w3, double w4)
        {
            if (!IsRedisAvailable() || _db == null) return;
            string key = "ai_weights";
            await _db.HashSetAsync(key, new HashEntry[]
            {
                new HashEntry("w1", w1),
                new HashEntry("w2", w2),
                new HashEntry("w3", w3),
                new HashEntry("w4", w4)
            });
        }

        public async Task<(double w1, double w2, double w3, double w4)> GetWeightsAsync()
        {
            if (!IsRedisAvailable() || _db == null) return (0.4, 0.3, 0.2, 0.1);
            string key = "ai_weights";
            var entries = await _db.HashGetAllAsync(key);
            if (entries.Length == 0) return (0.4, 0.3, 0.2, 0.1);

            double w1 = 0.4, w2 = 0.3, w3 = 0.2, w4 = 0.1;
            foreach (var entry in entries)
            {
                if (entry.Name == "w1") double.TryParse(entry.Value, out w1);
                if (entry.Name == "w2") double.TryParse(entry.Value, out w2);
                if (entry.Name == "w3") double.TryParse(entry.Value, out w3);
                if (entry.Name == "w4") double.TryParse(entry.Value, out w4);
            }
            return (w1, w2, w3, w4);
        }
    }
}