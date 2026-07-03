"""
Deep diagnostic: Check the ENTIRE data flow end-to-end.
1. Check active sessions in Transaction DB
2. Check slot status in Registry DB
3. Check what the API actually returns
4. Check if allocatedSlotId in sessions matches any slot in Registry
"""
import subprocess, json, urllib.request

def run_query(db, sql):
    cmd = ["docker", "exec", "-i", "pbms-postgres", "psql", "-U", "postgres", "-d", db, "-c", sql, "-q", "-t", "-A"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.stdout.strip()

def api_get(url, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    try:
        res = urllib.request.urlopen(req)
        return json.loads(res.read().decode())
    except Exception as e:
        return f"ERROR: {e}"

# 1. Login as staff
print("=" * 80)
print("1. LOGIN AS STAFF")
print("=" * 80)
login_data = json.dumps({"username": "staff1", "password": "password"}).encode()
req = urllib.request.Request('http://localhost:5125/api/v1/auth/login',
                            data=login_data,
                            headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
login_result = json.loads(res.read().decode())
token = login_result['token'] if 'token' in login_result else login_result.get('Token', '')
print(f"   Token obtained: {token[:40]}...")

# 2. Check active sessions via API
print("\n" + "=" * 80)
print("2. ACTIVE SESSIONS (via Transaction API)")
print("=" * 80)
sessions = api_get('http://localhost:5125/api/v1/transaction/sessions/active', token)
if isinstance(sessions, list):
    for s in sessions:
        plate = s.get('licensePlate') or s.get('LicensePlate', '?')
        slot_id = s.get('allocatedSlotId') or s.get('AllocatedSlotId', 'NULL')
        status = s.get('status') or s.get('Status', '?')
        print(f"   Plate={plate}, AllocatedSlotId={slot_id}, Status={status}")
else:
    print(f"   {sessions}")

# 3. Check slots via API
print("\n" + "=" * 80)
print("3. SLOT STATUS (via Registry API)")
print("=" * 80)
slots = api_get('http://localhost:5125/api/v1/registry/slots', token)
if isinstance(slots, list):
    occupied = [s for s in slots if (s.get('status') or s.get('Status', '')) in [1, 'Occupied']]
    reserved = [s for s in slots if (s.get('status') or s.get('Status', '')) in [2, 'Reserved']]
    available = [s for s in slots if (s.get('status') or s.get('Status', '')) in [0, 'Available']]
    print(f"   Total: {len(slots)}, Occupied: {len(occupied)}, Reserved: {len(reserved)}, Available: {len(available)}")
    if occupied:
        for s in occupied:
            print(f"     OCCUPIED: {s.get('slotNumber') or s.get('SlotNumber')} (ID: {s.get('id') or s.get('Id')})")
    
    # 4. Cross-reference: do session allocatedSlotIds exist in current slots?
    print("\n" + "=" * 80)
    print("4. CROSS-REFERENCE: Sessions vs Slots")
    print("=" * 80)
    slot_ids = set()
    for s in slots:
        slot_ids.add(s.get('id') or s.get('Id'))
    
    if isinstance(sessions, list):
        for s in sessions:
            plate = s.get('licensePlate') or s.get('LicensePlate', '?')
            slot_id = s.get('allocatedSlotId') or s.get('AllocatedSlotId', 'NULL')
            exists = slot_id in slot_ids if slot_id != 'NULL' else False
            match_slot = None
            if exists:
                match_slot = next((sl for sl in slots if (sl.get('id') or sl.get('Id')) == slot_id), None)
            print(f"   Plate={plate}, AllocatedSlotId={slot_id}")
            print(f"     -> Exists in Registry? {'YES' if exists else 'NO (STALE!)'}")
            if match_slot:
                print(f"     -> SlotNumber: {match_slot.get('slotNumber') or match_slot.get('SlotNumber')}, Status: {match_slot.get('status') or match_slot.get('Status')}")
else:
    print(f"   {slots}")

# 5. Direct DB check
print("\n" + "=" * 80)
print("5. DIRECT DB CHECK")
print("=" * 80)
print("   Active sessions in Transaction DB:")
db_sessions = run_query("pbms_transaction_db",
    'SELECT "CorrelationId", "LicensePlate", "AllocatedSlotId", "Status", "CurrentState" FROM "ParkingSessions" WHERE "Status" IN (\'Active\', \'Pending\');')
for line in db_sessions.split('\n'):
    if line.strip():
        print(f"     {line}")

print("\n   Non-available slots in Registry DB:")
db_slots = run_query("pbms_registry_db",
    'SELECT "Id", "SlotNumber", "Status" FROM "ParkingSlots" WHERE "Status" != \'Available\';')
if db_slots:
    for line in db_slots.split('\n'):
        if line.strip():
            print(f"     {line}")
else:
    print("     (NONE - All slots are Available!)")

# 6. Check AI container recent logs for check-in events
print("\n" + "=" * 80)
print("6. AI CONTAINER RECENT CHECK-IN LOGS")
print("=" * 80)
cmd = ["docker", "logs", "pbms-ai", "--tail", "200"]
res = subprocess.run(cmd, capture_output=True, text=True)
ai_logs = (res.stdout + res.stderr).split('\n')
relevant = [l for l in ai_logs if any(kw in l for kw in ['Cache Hit', 'Cache Miss', 'Found active booking', 'slot', '404', 'Slot', 'stale', 'Error', 'Failed', 'allocated'])]
for l in relevant[-20:]:
    print(f"   {l.strip()}")
