import subprocess

def run_query(db, sql):
    cmd = [
        "docker", "exec", "-i", "pbms-postgres", "psql",
        "-U", "postgres", "-d", db, "-c", sql, "-q", "-t", "-A"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.stdout.strip()

print("--- SLOT BY ID IN REGISTRY DB ---")
slot = run_query("pbms_registry_db", "SELECT \"Id\", \"SlotNumber\" FROM \"ParkingSlots\" WHERE \"Id\" = 'c33a5a17-2fe1-4f4a-982d-5f46d862492b';")
print("Found slot:", slot)

print("\n--- ALL SLOTS IN REGISTRY DB ---")
all_slots = run_query("pbms_registry_db", "SELECT \"Id\", \"SlotNumber\" FROM \"ParkingSlots\" LIMIT 10;")
print(all_slots)
