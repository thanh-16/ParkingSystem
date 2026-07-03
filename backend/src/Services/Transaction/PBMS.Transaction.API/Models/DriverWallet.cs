using System;

namespace PBMS.Transaction.API.Models
{
    public class DriverWallet
    {
        public string Username { get; set; } = string.Empty;
        public decimal Balance { get; set; }
    }
}
