using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PBMS.AI.API.Controllers
{
    [ApiController]
    [Route("api/v1/ai/vision")]
    [Authorize]
    public class VisionController : ControllerBase
    {
        private static readonly Random _random = new();

        [HttpPost("anpr")]
        public async Task<IActionResult> ProcessAnprStream([FromBody] AnprRequest request)
        {
            // Simulate processing time of raw IP Camera stream / Image OCR
            await Task.Delay(200);

            string recognizedPlate = "";
            try
            {
                if (!string.IsNullOrEmpty(request.RawImageBase64))
                {
                    byte[] data = Convert.FromBase64String(request.RawImageBase64);
                    string decodedText = Encoding.UTF8.GetString(data);
                    // Standard license plate patterns e.g. "59F1-99999" or "30A-12345"
                    if (decodedText.Contains("-") && decodedText.Length >= 5 && decodedText.Length <= 15)
                    {
                        recognizedPlate = decodedText;
                    }
                }
            }
            catch
            {
                // Fallback to random if not decodable plain text base64
            }

            if (string.IsNullOrEmpty(recognizedPlate))
            {
                string[] mockPlates = { "59F1-98765", "29A2-11111", "43C1-45678", "72H1-22222" };
                recognizedPlate = mockPlates[_random.Next(mockPlates.Length)];
            }

            // Classify Vehicle Type: 1 = Motorbike, 2 = Compact Car, 3 = SUV, 4 = EV
            // For demo: Classify based on camera ID
            int classifiedVehicleTypeId = request.CameraId switch
            {
                1 => 1, // Motorbike lane camera
                2 => 2, // Compact car lane camera
                3 => 3, // SUV lane camera
                4 => 4, // EV charging lane camera
                _ => 2  // Default to Compact Car
            };

            return Ok(new
            {
                CameraId = request.CameraId,
                LicensePlate = recognizedPlate,
                VehicleTypeId = classifiedVehicleTypeId,
                VehicleTypeName = classifiedVehicleTypeId switch
                {
                    1 => "Motorbike",
                    2 => "Compact Car",
                    3 => "SUV",
                    4 => "EV",
                    _ => "Compact Car"
                },
                ConfidenceScore = 0.98,
                TimestampUtc = DateTime.UtcNow
            });
        }
    }

    public record AnprRequest(int CameraId, string RawImageBase64);
}
