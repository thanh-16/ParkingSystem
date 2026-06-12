using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace PBMS.Shared
{
    public static class JwtCertHelper
    {
        public static X509Certificate2 GetOrGenerateJwtCert()
        {
            // Support JWT_CERT_PATH environment variable, fallback to local path
            string certPath = Environment.GetEnvironmentVariable("JWT_CERT_PATH") 
                              ?? @"D:\PRN232\ParkingBuildingManagementSystem\jwt.pfx";
            string certPass = "pbms_secret_pass";

            int attempts = 5;
            for (int i = 0; i < attempts; i++)
            {
                if (File.Exists(certPath))
                {
                    try
                    {
                        // Check if file is fully written and loadable
                        return new X509Certificate2(certPath, certPass, X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.Exportable);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Attempt {i + 1}/{attempts}: Error loading existing PFX: {ex.Message}. Waiting...");
                        if (i == attempts - 1)
                        {
                            Console.WriteLine("Recreating corrupted or invalid PFX certificate...");
                        }
                        else
                        {
                            System.Threading.Thread.Sleep(1500);
                            continue;
                        }
                    }
                }

                try
                {
                    // Create a self-signed cert
                    using var rsa = RSA.Create(2048);
                    var request = new CertificateRequest("cn=PBMS.Identity", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
                    
                    // Add Basic Constraints to specify it's an end-entity cert
                    request.CertificateExtensions.Add(
                        new X509BasicConstraintsExtension(false, false, 0, false));

                    // Add Key Usage
                    request.CertificateExtensions.Add(
                        new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, false));

                    var cert = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(5));
                    
                    byte[] pfxBytes = cert.Export(X509ContentType.Pfx, certPass);
                    
                    // Ensure directory exists
                    string? dir = Path.GetDirectoryName(certPath);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }

                    File.WriteAllBytes(certPath, pfxBytes);
                    
                    return new X509Certificate2(pfxBytes, certPass, X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.Exportable);
                }
                catch (Exception ex)
                {
                    if (i == attempts - 1)
                    {
                        Console.WriteLine($"Failed to generate self-signed cert: {ex.Message}.");
                        throw;
                    }
                    System.Threading.Thread.Sleep(1500);
                }
            }

            throw new InvalidOperationException("Could not load or generate JWT Certificate.");
        }
    }
}
