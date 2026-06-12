using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PBMS.Identity.API.Models;
using PBMS.Identity.API.Persistence;

namespace PBMS.Identity.API.Controllers
{
    [ApiController]
    [Route("api/v1/auth")]
    public class AccountController : ControllerBase
    {
        private readonly IdentityDbContext _context;
        private readonly string _jwtSecret;
        private readonly string _jwtIssuer;
        private readonly string _jwtAudience;

        public AccountController(IdentityDbContext context, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _context = context;
            _jwtSecret = configuration["Jwt:Secret"] ?? "ThisIsASecretKeyForPBMSAuthTokenGenerationAndSigningOfJWTs!";
            _jwtIssuer = configuration["Jwt:Issuer"] ?? "PBMS.Identity";
            _jwtAudience = configuration["Jwt:Audience"] ?? "PBMS.Clients";
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower());
            if (exists)
            {
                return BadRequest(new { Message = "Tên đăng nhập đã tồn tại!" });
            }

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Username = request.Username,
                PasswordHash = HashPassword(request.Password),
                FullName = request.FullName,
                Role = request.Role,
                PhoneNumber = request.PhoneNumber
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đăng ký tài khoản thành công!", Username = newUser.Username });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());

            bool isPasswordValid = false;
            if (user != null)
            {
                if (user.Username.Equals("ai_service", StringComparison.OrdinalIgnoreCase))
                {
                    var envPassword = Environment.GetEnvironmentVariable("AI_SERVICE_PASSWORD");
                    if (!string.IsNullOrEmpty(envPassword))
                    {
                        isPasswordValid = request.Password == envPassword;
                    }
                    else
                    {
                        isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
                    }
                }
                else
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
                }
            }

            if (user == null || !isPasswordValid)
            {
                return Unauthorized(new { Message = "Tài khoản hoặc mật khẩu không chính xác!" });
            }

            var token = GenerateJwtToken(user);
            return Ok(new
            {
                Token = token,
                ExpiresInSeconds = 86400,
                User = new { user.Username, user.FullName, user.Role }
            });
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var cert = PBMS.Shared.JwtCertHelper.GetOrGenerateJwtCert();

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(1),
                Issuer = _jwtIssuer,
                Audience = _jwtAudience,
                SigningCredentials = new SigningCredentials(new X509SecurityKey(cert), SecurityAlgorithms.RsaSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
        }
    }

    public record LoginRequest(string Username, string Password);

    public record RegisterRequest(
        string Username,
        string Password,
        string FullName,
        string Role,
        string? PhoneNumber
    );
}