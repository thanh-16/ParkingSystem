"""
FULL END-TO-END TEST: Check-in vehicle → Wait for AI → Verify BOTH databases
"""
import subprocess, json, urllib.request, time

GATEWAY = 'http://localhost:5125'

def api(method, path, data=None, token=None):
    url = f"{GATEWAY}{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(req)
        return res.getcode(), json.loads(res.read().decode())
    except Exception as e:
        if hasattr(e, 'code'):
            try:
                return e.code, json.loads(e.read().decode())
            except:
                return e.code, str(e)
        return 0, str(e)

def run_query(db, sql):
    cmd = ["docker", "exec", "-i", "pbms-postgres", "psql", "-U", "postgres", "-d", db, "-c", sql, "-q", "-t", "-A"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.stdout.strip()

print("="*80)
print("STEP 1: Login as Staff")
print("="*80)
code, data = api('POST', '/api/v1/auth/login', {"username": "staff1", "password": "password"})
token = data.get('token', '')
print(f"   Login: {code}, Token: {token[:40]}...")

print("\n" + "="*80)
print("STEP 2: Check current state BEFORE check-in")
print("="*80)
code, sessions = api('GET', '/api/v1/transaction/sessions/active', token=token)
print(f"   Active sessions: {len(sessions) if isinstance(sessions, list) else 'ERROR'}")
code, slots = api('GET', '/api/v1/registry/slots', token=token)
if isinstance(slots, list):
    occ = len([s for s in slots if s.get('status') in [1, 'Occupied']])
    print(f"   Total slots: {len(slots)}, Occupied: {occ}")

print("\n" + "="*80)
print("STEP 3: CHECK-IN a vehicle via API")
print("="*80)
checkin_data = {
    "cardNumber": "TEST-CARD-001",
    "licensePlate": "29A-REALTIME-TEST",
    "vehicleTypeId": 2
}
code, result = api('POST', '/api/v1/transaction/check-in', checkin_data, token=token)
print(f"   Check-in response: HTTP {code}")
print(f"   Result: {json.dumps(result, indent=2)}")
session_id = result.get('sessionId') or result.get('SessionId', '')

if code != 200:
    print("   FAILED TO CHECK-IN! Aborting test.")
    exit(1)

print("\n" + "="*80)
print("STEP 4: Wait 5 seconds for AI to process...")
print("="*80)
for i in range(5, 0, -1):
    print(f"   Waiting... {i}s")
    time.sleep(1)

print("\n" + "="*80)
print("STEP 5: Check Transaction DB for updated session")
print("="*80)
db_session = run_query("pbms_transaction_db",
    f"""SELECT "CorrelationId", "LicensePlate", "AllocatedSlotId", "Status", "CurrentState" 
        FROM "ParkingSessions" 
        WHERE "LicensePlate" = '29A-REALTIME-TEST' 
        ORDER BY "CheckInTime" DESC LIMIT 1;""")
print(f"   DB Session: {db_session}")

print("\n" + "="*80)
print("STEP 6: Check Registry DB for occupied slots")
print("="*80)
db_slots = run_query("pbms_registry_db",
    'SELECT "Id", "SlotNumber", "Status" FROM "ParkingSlots" WHERE "Status" != \'Available\';')
if db_slots:
    for line in db_slots.split('\n'):
        if line.strip():
            print(f"   {line}")
else:
    print("   WARNING: No occupied slots in Registry DB!")

print("\n" + "="*80)
print("STEP 7: Check API responses (what frontend sees)")
print("="*80)
code, sessions = api('GET', '/api/v1/transaction/sessions/active', token=token)
if isinstance(sessions, list):
    print(f"   Active sessions from API: {len(sessions)}")
    for s in sessions:
        plate = s.get('licensePlate') or s.get('LicensePlate', '?')
        slot_id = s.get('allocatedSlotId') or s.get('AllocatedSlotId', 'NULL')
        status = s.get('status') or s.get('Status', '?')
        slot_num = s.get('slotNumber') or s.get('SlotNumber', '?')
        print(f"     Plate={plate}, SlotId={slot_id}, SlotNumber={slot_num}, Status={status}")
        
        # Cross-reference with slots
        if isinstance(slots, list) and slot_id:
            match = next((sl for sl in slots if (sl.get('id') or sl.get('Id')) == slot_id), None)
            if match:
                print(f"     → SlotNumber={match.get('slotNumber')}, Registry Status={match.get('status')}")
            else:
                print(f"     → WARNING: AllocatedSlotId does NOT match any slot in Registry!")

code, slots = api('GET', '/api/v1/registry/slots', token=token)
if isinstance(slots, list):
    occ = [s for s in slots if s.get('status') in [1, 'Occupied']]
    print(f"\n   Occupied slots from API: {len(occ)}")
    for s in occ:
        print(f"     {s.get('slotNumber')}: Status={s.get('status')}")

print("\n" + "="*80)
print("STEP 8: Check AI container logs for this check-in")
print("="*80)
cmd = ["docker", "logs", "pbms-ai", "--tail", "30"]
res = subprocess.run(cmd, capture_output=True, text=True)
ai_logs = (res.stdout + res.stderr).split('\n')
relevant = [l for l in ai_logs if any(kw in l.lower() for kw in ['cache', 'slot', 'error', 'fail', 'allocated', '29a-realtime', 'stale', '404', '200'])]
for l in relevant[-15:]:
    print(f"   {l.strip()}")

print("\n" + "="*80)
print("VERDICT")
print("="*80)
# Re-fetch to get final state
code, sessions = api('GET', '/api/v1/transaction/sessions/active', token=token)
code, slots = api('GET', '/api/v1/registry/slots', token=token)
active_count = len(sessions) if isinstance(sessions, list) else 0
occupied_count = len([s for s in slots if s.get('status') in [1, 'Occupied']]) if isinstance(slots, list) else 0

has_allocated = False
if isinstance(sessions, list):
    for s in sessions:
        if (s.get('allocatedSlotId') or s.get('AllocatedSlotId')) and s.get('licensePlate') == '29A-REALTIME-TEST':
            has_allocated = True

if active_count > 0 and has_allocated:
    print("   ✅ Transaction DB: Session is Active with AllocatedSlotId")
else:
    print(f"   ❌ Transaction: active_count={active_count}, has_allocated={has_allocated}")

if occupied_count > 0:
    print(f"   ✅ Registry DB: {occupied_count} slot(s) Occupied")
else:
    print("   ❌ Registry DB: No occupied slots!")

if active_count > 0 and has_allocated and occupied_count > 0:
    print("\n   🎉 END-TO-END FLOW IS WORKING!")
elif active_count > 0 and has_allocated:
    print("\n   ⚠️ Session has allocated slot but Registry not updated - frontend fix compensates for this")
else:
    print("\n   ❌ SYSTEM IS STILL BROKEN")
