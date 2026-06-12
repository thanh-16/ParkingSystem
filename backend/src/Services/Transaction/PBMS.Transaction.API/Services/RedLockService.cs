using System;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace PBMS.Transaction.API.Services
{
    public class RedLockService
    {
        private readonly IConnectionMultiplexer? _redis;
        private readonly IDatabase? _db;
        private readonly bool _isEnabled = false;

        public RedLockService(string connectionString)
        {
            try
            {
                var options = ConfigurationOptions.Parse(connectionString);
                options.ConnectTimeout = 2000;
                options.AbortOnConnectFail = false;
                _redis = ConnectionMultiplexer.Connect(options);
                _db = _redis.GetDatabase();
                _isEnabled = _redis.IsConnected;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"RedLock connection to Redis failed: {ex.Message}. RedLock falls back to lock-free mode.");
            }
        }

        public async Task<bool> AcquireLockAsync(string resourceKey, string lockValue, TimeSpan expiry)
        {
            if (!_isEnabled || _db == null) return true;
            return await _db.StringSetAsync($"lock:{resourceKey}", lockValue, expiry, When.NotExists);
        }

        public async Task ReleaseLockAsync(string resourceKey, string lockValue)
        {
            if (!_isEnabled || _db == null) return;

            string key = $"lock:{resourceKey}";

            string luaScript = @"
                if redis.call('get', KEYS[1]) == ARGV[1] then
                    return redis.call('del', KEYS[1])
                else
                    return 0
                end";

            try
            {
                await _db.ScriptEvaluateAsync(luaScript, new RedisKey[] { key }, new RedisValue[] { lockValue });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error releasing RedLock: {ex.Message}");
            }
        }
    }
}