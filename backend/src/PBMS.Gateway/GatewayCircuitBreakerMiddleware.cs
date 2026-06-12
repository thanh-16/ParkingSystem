using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Yarp.ReverseProxy.Model;

namespace PBMS.Gateway
{
    public class GatewayCircuitBreakerMiddleware
    {
        private readonly RequestDelegate _next;
        private static readonly ConcurrentDictionary<string, CircuitState> _states = new();

        public GatewayCircuitBreakerMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var routeModel = context.GetRouteModel();
            var clusterId = routeModel?.Cluster?.ClusterId ?? "unknown";

            if (clusterId == "unknown")
            {
                await _next(context);
                return;
            }

            var state = _states.GetOrAdd(clusterId, _ => new CircuitState());

            if (state.IsOpen())
            {
                context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                await context.Response.WriteAsJsonAsync(new { Message = $"Service cluster '{clusterId}' is temporarily unavailable due to high error rates (Circuit Breaker Tripped)." });
                return;
            }

            try
            {
                await _next(context);

                if (context.Response.StatusCode >= 500)
                {
                    state.RecordFailure();
                }
                else
                {
                    state.RecordSuccess();
                }
            }
            catch (Exception)
            {
                state.RecordFailure();
                throw;
            }
        }

        private class CircuitState
        {
            private enum State { Closed, Open, HalfOpen }
            private State _state = State.Closed;
            private int _failureCount = 0;
            private DateTime _nextAttemptTime = DateTime.MinValue;
            private readonly object _lock = new();

            public bool IsOpen()
            {
                lock (_lock)
                {
                    if (_state == State.Open)
                    {
                        if (DateTime.UtcNow >= _nextAttemptTime)
                        {
                            _state = State.HalfOpen;
                            Console.WriteLine($"Circuit Breaker: Cluster transition from Open to HalfOpen.");
                            return false;
                        }
                        return true;
                    }
                    return false;
                }
            }

            public void RecordFailure()
            {
                lock (_lock)
                {
                    _failureCount++;
                    if (_failureCount >= 5)
                    {
                        _state = State.Open;
                        _nextAttemptTime = DateTime.UtcNow.AddSeconds(30);
                        Console.WriteLine($"Circuit Breaker Tripped: Transition to Open. Failing fast for 30 seconds.");
                    }
                }
            }

            public void RecordSuccess()
            {
                lock (_lock)
                {
                    _failureCount = 0;
                    if (_state == State.HalfOpen)
                    {
                        _state = State.Closed;
                        Console.WriteLine($"Circuit Breaker Closed: Cluster is fully healthy again.");
                    }
                }
            }
        }
    }
}