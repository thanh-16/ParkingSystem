using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PBMS.AI.API.Services;

namespace PBMS.AI.API.Controllers
{
    [ApiController]
    [Route("api/v1/ai/weights")]
    [Authorize]
    public class WeightsController : ControllerBase
    {
        private readonly RedisSortedSetCache _cache;

        public WeightsController(RedisSortedSetCache cache)
        {
            _cache = cache;
        }

        [HttpGet]
        public async Task<IActionResult> GetWeights()
        {
            var (w1, w2, w3, w4) = await _cache.GetWeightsAsync();
            return Ok(new { w1, w2, w3, w4 });
        }

        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> UpdateWeights([FromBody] UpdateWeightsRequest request)
        {
            double sum = request.w1 + request.w2 + request.w3 + request.w4;
            if (System.Math.Abs(sum - 1.0) > 0.01)
            {
                return BadRequest(new { Message = "Tổng trọng số w1 + w2 + w3 + w4 phải bằng 1.0!" });
            }

            await _cache.SetWeightsAsync(request.w1, request.w2, request.w3, request.w4);
            return Ok(new { Message = "Cập nhật trọng số AI thành công!", Weights = request });
        }
    }

    public record UpdateWeightsRequest(double w1, double w2, double w3, double w4);
}