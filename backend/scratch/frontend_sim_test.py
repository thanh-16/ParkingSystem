"""
Quick test: Simulate what frontend syncLiveConfig does.
Shows exactly what the frontend would display.
"""
import json, urllib.request

GATEWAY = 'http://localhost:5125'

def api_get(path, token):
    req = urllib.request.Request(f"{GATEWAY}{path}", headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    })
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

def api_post(path, data, token):
    req = urllib.request.Request(f"{GATEWAY}{path}", 
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    res = urllib.request.urlopen(req)
    return res.getcode(), json.loads(res.read().decode())

# Login
login_req = urllib.request.Request(f'{GATEWAY}/api/v1/auth/login',
    json.dumps({'username':'staff1','password':'password'}).encode(),
    {'Content-Type':'application/json'})
token = json.loads(urllib.request.urlopen(login_req).read().decode())['token']
print(f"Logged in.\n")

# Check-in 2 vehicles 
print(">>> Checking in 2 vehicles...")
for plate in ['51A-TEST01', '30B-TEST02']:
    code, result = api_post('/api/v1/transaction/check-in',
        {"cardNumber": f"CARD-{plate}", "licensePlate": plate, "vehicleTypeId": 2}, token)
    print(f"  {plate}: {code} - {result.get('status', '?')}")

import time
print("\nWaiting 5s for AI processing...")
time.sleep(5)

# Now simulate exactly what syncLiveConfig does
print("\n>>> Simulating syncLiveConfig (what frontend shows):")
activeSessions = api_get('/api/v1/transaction/sessions/active', token)
liveSlots = api_get('/api/v1/registry/slots', token)

print(f"\n  Active sessions from API: {len(activeSessions)}")
for s in activeSessions:
    print(f"    plate={s.get('licensePlate')}, allocatedSlotId={s.get('allocatedSlotId')}, status={s.get('status')}")

# Cross-reference (same logic as frontend fix)
f1_occupied = 0
f1_total = 0
for slot in liveSlots:
    floor_num = slot.get('floor', {}).get('floorNumber', 0)
    if floor_num == 1:
        f1_total += 1
        
        # Check Registry DB status
        mappedStatus = 'Available'
        if slot.get('status') in [1, 'Occupied']:
            mappedStatus = 'Occupied'
        elif slot.get('status') in [2, 'Reserved']:
            mappedStatus = 'Reserved'
        
        # CRITICAL FIX: Force Occupied if matched session exists
        matched = next((sess for sess in activeSessions
            if (sess.get('allocatedSlotId') or sess.get('AllocatedSlotId')) == slot.get('id')
            and sess.get('status') == 'Active'), None)
        if matched:
            mappedStatus = 'Occupied'
        
        if mappedStatus == 'Occupied':
            f1_occupied += 1
            plate = matched.get('licensePlate', '?') if matched else '?'
            print(f"    OCCUPIED: {slot.get('slotNumber')} (DB status={slot.get('status')}) - plate={plate}")

print(f"\n  Floor 1 Dashboard: Occupied={f1_occupied}/{f1_total}")
print(f"  (This is what manager sees after syncLiveConfig)")

# Cleanup
print("\nCleaning up test vehicles...")
for plate in ['51A-TEST01', '30B-TEST02']:
    try:
        api_post('/api/v1/transaction/check-out', {"licensePlate": plate}, token)
        print(f"  Checked out {plate}")
    except Exception as e:
        print(f"  Checkout {plate}: {e}")
time.sleep(2)

# Verify cleanup
activeSessions = api_get('/api/v1/transaction/sessions/active', token)
print(f"\nAfter cleanup: {len(activeSessions)} active sessions")
