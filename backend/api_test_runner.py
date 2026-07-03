# -*- coding: utf-8 -*-
import json
import urllib.request
import urllib.error
import sys

# Configure UTF-8 output for console
sys.stdout.reconfigure(encoding='utf-8')

GATEWAY_URL = "http://localhost:5125"

def make_request(path, method="GET", data=None, token=None):
    url = f"{GATEWAY_URL}{path}"
    headers = {
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_body = None
    if data is not None:
        req_body = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            res_data = response.read().decode("utf-8")
            res_json = json.loads(res_data) if res_data else {}
            return status, res_json
    except urllib.error.HTTPError as e:
        err_data = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_data)
        except:
            err_json = {"raw": err_data}
        return e.code, err_json
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 60)
    print("🚀 BẤT ĐẦU KIỂM THỬ TỰ ĐỘNG HỆ THỐNG PBMS MICROSERVICES 🚀")
    print("=" * 60)
    
    manager_token = None
    staff_token = None
    test_plate = "30A-88888"
    test_card = "CARD-TEST-88"
    
    # ----------------------------------------------------
    # TEST CASE 1: Đăng nhập quyền Quản Lý (Manager)
    # ----------------------------------------------------
    print("\n[TC-01] Đăng nhập tài khoản Quản Lý (Manager)...")
    status, res = make_request("/api/v1/auth/login", "POST", {
        "username": "manager1",
        "password": "123"
    })
    
    if status == 200 and ("token" in res or "Token" in res):
        manager_token = res.get("token") or res.get("Token")
        print("   ✅ Đăng nhập thành công! Token:", manager_token[:30] + "...")
    else:
        print(f"   ❌ Đăng nhập thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 2: Đăng nhập quyền Nhân Viên (Staff)
    # ----------------------------------------------------
    print("\n[TC-02] Đăng nhập tài khoản Nhân Viên (Staff)...")
    status, res = make_request("/api/v1/auth/login", "POST", {
        "username": "staff1",
        "password": "123"
    })
    
    if status == 200 and ("token" in res or "Token" in res):
        staff_token = res.get("token") or res.get("Token")
        print("   ✅ Đăng nhập thành công! Token:", staff_token[:30] + "...")
    else:
        print(f"   ❌ Đăng nhập thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 3: Khởi tạo dữ liệu bãi xe (Seed Live)
    # ----------------------------------------------------
    print("\n[TC-03] Khởi tạo dữ liệu bãi đỗ xe (Seeding Registry)...")
    status, res = make_request("/api/v1/registry/setup", "POST", {}, manager_token)
    if status == 200:
        print(f"   ✅ Khởi tạo thành công! Chi tiết: {res}")
    else:
        print(f"   ❌ Khởi tạo thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 4: Lấy danh sách ô đỗ (Verify 35 slots)
    # ----------------------------------------------------
    print("\n[TC-04] Kiểm tra số lượng ô đỗ sau khi khởi tạo...")
    status, res = make_request("/api/v1/registry/slots", "GET", None, manager_token)
    if status == 200:
        slots_count = len(res)
        print(f"   ✅ Đã tải danh sách ô đỗ! Tổng số ô: {slots_count}")
        if slots_count == 35:
            print("   ✅ [ĐẠT] Số lượng ô đỗ chính xác là 35 ô (không bao gồm xe máy).")
        else:
            print(f"   ❌ [HỎNG] Số lượng ô đỗ là {slots_count}, mong đợi 35.")
            return False
    else:
        print(f"   ❌ Tải danh sách ô đỗ thất bại! Status: {status}")
        return False

    # ----------------------------------------------------
    # TEST CASE 5: Kiểm tra danh sách phiên gửi xe ban đầu
    # ----------------------------------------------------
    print("\n[TC-05] Kiểm tra danh sách phiên gửi xe đang hoạt động (Ban đầu)...")
    status, res = make_request("/api/v1/transaction/sessions/active", "GET", None, staff_token)
    if status == 200:
        print(f"   ✅ Đã tải danh sách phiên gửi! Số phiên đang hoạt động: {len(res)}")
    else:
        print(f"   ❌ Tải danh sách phiên gửi thất bại! Status: {status}")
        return False

    # ----------------------------------------------------
    # TEST CASE 5b: Đăng ký tài khoản Driver mới
    # ----------------------------------------------------
    print("\n[TC-05b] Đăng ký tài khoản Driver mới...")
    status, res = make_request("/api/v1/auth/register", "POST", {
        "username": "driver_test_wallet",
        "password": "123",
        "fullName": "Lái Xe Thử Nghiệm",
        "role": "Driver",
        "phoneNumber": "0987654321"
    })
    if status == 200:
        print("   ✅ Đăng ký tài khoản thành công!")
    elif status == 400 and ("tồn tại" in res.get("message", "") or "exists" in res.get("message", "")):
        print("   ✅ Tài khoản đã tồn tại, bỏ qua bước đăng ký mới!")
    else:
        print(f"   ❌ Đăng ký thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 5c: Đăng nhập tài khoản Driver mới & Kiểm tra ví
    # ----------------------------------------------------
    print("\n[TC-05c] Đăng nhập tài khoản Driver mới & Kiểm tra ví...")
    status, res = make_request("/api/v1/auth/login", "POST", {
        "username": "driver_test_wallet",
        "password": "123"
    })
    driver_token = None
    if status == 200 and ("token" in res or "Token" in res):
        driver_token = res.get("token") or res.get("Token")
        print("   ✅ Đăng nhập thành công!")
    else:
        print(f"   ❌ Đăng nhập thất bại! Status: {status}, Error: {res}")
        return False

    status, res = make_request("/api/v1/driver/wallet", "GET", None, driver_token)
    if status == 200:
        balance = res.get("balance")
        print(f"   ✅ Đã tải thông tin ví! Số dư ban đầu: {balance} VND")
        if balance != 0:
            print(f"   ❌ [HỎNG] Số dư ban đầu mong đợi là 0, thực tế là {balance}")
            return False
    else:
        print(f"   ❌ Tải thông tin ví thất bại! Status: {status}")
        return False

    # ----------------------------------------------------
    # TEST CASE 5d: Đặt chỗ trước khi nạp tiền (Mong đợi thất bại)
    # ----------------------------------------------------
    print("\n[TC-05d] Đặt chỗ trước khi nạp tiền (Yêu cầu số dư > 20.000đ)...")
    status, res = make_request("/api/v1/driver/bookings", "POST", {
        "licensePlate": "30A-99999",
        "vehicleTypeId": 2
    }, driver_token)
    if status == 400:
        print(f"   ✅ [ĐẠT] Bị chặn thành công! Phản hồi từ Server: {res.get('message')}")
    else:
        print(f"   ❌ [HỎNG] Yêu cầu đặt chỗ đáng lẽ phải bị từ chối! Status: {status}, Response: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 5e: Nạp tiền vào ví điện tử
    # ----------------------------------------------------
    print("\n[TC-05e] Nạp tiền 100.000đ vào ví điện tử...")
    status, res = make_request("/api/v1/driver/wallet/deposit", "POST", {
        "amount": 100000
    }, driver_token)
    if status == 200:
        new_balance = res.get("wallet", {}).get("balance")
        print(f"   ✅ Nạp tiền thành công! Số dư ví mới: {new_balance} VND")
        if new_balance != 100000:
            print(f"   ❌ [HỎNG] Số dư ví mới mong đợi là 100000, thực tế là {new_balance}")
            return False
    else:
        print(f"   ❌ Nạp tiền thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 5f: Thực hiện đặt chỗ sau khi nạp tiền (Mong đợi thành công)
    # ----------------------------------------------------
    print("\n[TC-05f] Đặt chỗ xe 30A-99999 sau khi đã nạp tiền...")
    status, res = make_request("/api/v1/driver/bookings", "POST", {
        "licensePlate": "30A-99999",
        "vehicleTypeId": 2
    }, driver_token)
    if status == 200:
        print(f"   ✅ Đặt chỗ thành công! Mã ô đỗ: {res.get('booking', {}).get('slotNumber')}")
        print(f"      - Số dư ví sau khấu trừ: {res.get('balance')} VND")
        if res.get("balance") != 80000:
            print(f"   ❌ [HỎNG] Số dư ví sau khấu trừ cọc mong đợi là 80000, thực tế là {res.get('balance')}")
            return False
    else:
        print(f"   ❌ Đặt chỗ thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 5g: Đặt chỗ trùng biển số để spam (Mong đợi thất bại)
    # ----------------------------------------------------
    print("\n[TC-05g] Đặt chỗ trùng biển số xe 30A-99999 (Chống spam)...")
    status, res = make_request("/api/v1/driver/bookings", "POST", {
        "licensePlate": "30A-99999",
        "vehicleTypeId": 2
    }, driver_token)
    if status == 400:
        print(f"   ✅ [ĐẠT] Chặn spam trùng biển số thành công! Phản hồi từ Server: {res.get('message')}")
    else:
        print(f"   ❌ [HỎNG] Đặt chỗ trùng biển số đáng lẽ phải bị từ chối! Status: {status}, Response: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 6: Thực hiện Check-in qua API Gateway
    # ----------------------------------------------------
    print(f"\n[TC-06] Tiến hành Check-in xe {test_plate} (Xe Sedan)...")
    checkin_data = {
        "cardNumber": test_card,
        "licensePlate": test_plate,
        "vehicleTypeId": 2  # Sedan
    }
    status, res = make_request("/api/v1/transaction/check-in", "POST", checkin_data, staff_token)
    if status == 200:
        print(f"   ✅ Check-in thành công! Phản hồi từ Server: {res}")
        print("   ⏳ Chờ 3 giây để hệ thống xử lý phân bổ ô đỗ bất đồng bộ...")
        import time
        time.sleep(3)
    else:
        print(f"   ❌ Check-in thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 7: Kiểm tra xe đã có trong danh sách hoạt động
    # ----------------------------------------------------
    print("\n[TC-07] Xác minh xe vừa check-in trong danh sách phiên hoạt động...")
    status, res = make_request("/api/v1/transaction/sessions/active", "GET", None, staff_token)
    if status == 200:
        found = any(s.get("licensePlate") == test_plate for s in res)
        if found:
            print(f"   ✅ [ĐẠT] Tìm thấy xe {test_plate} đang đỗ trong bãi.")
        else:
            print(f"   ❌ [HỎNG] Không tìm thấy xe {test_plate} trong các phiên đang hoạt động!")
            return False
    else:
        print(f"   ❌ Lỗi tải danh sách phiên hoạt động! Status: {status}")
        return False

    # ----------------------------------------------------
    # TEST CASE 8: Thực hiện Check-out qua API Gateway
    # ----------------------------------------------------
    print(f"\n[TC-08] Tiến hành Check-out xe {test_plate}...")
    checkout_data = {
        "cardNumber": test_card,
        "licensePlate": test_plate
    }
    status, res = make_request("/api/v1/transaction/check-out", "POST", checkout_data, staff_token)
    if status == 200:
        print(f"   ✅ Check-out thành công! Phản hồi từ Server: {res}")
        print(f"      - Tổng tiền thanh toán (Total Fee): {res.get('totalFee')} VND")
    else:
        print(f"   ❌ Check-out thất bại! Status: {status}, Error: {res}")
        return False

    # ----------------------------------------------------
    # TEST CASE 9: Kiểm tra danh sách sau Check-out (Phải rỗng)
    # ----------------------------------------------------
    print("\n[TC-09] Xác minh danh sách phiên hoạt động sau khi xe rời bãi...")
    status, res = make_request("/api/v1/transaction/sessions/active", "GET", None, staff_token)
    if status == 200:
        found = any(s.get("licensePlate") == test_plate for s in res)
        if not found:
            print(f"   ✅ [ĐẠT] Xe {test_plate} đã được xóa khỏi danh sách xe đang đỗ.")
        else:
            print(f"   ❌ [HỎNG] Xe {test_plate} vẫn còn xuất hiện trong danh sách xe đang đỗ!")
            return False
    else:
        print(f"   ❌ Lỗi tải danh sách phiên hoạt động! Status: {status}")
        return False

    print("\n" + "=" * 60)
    print("🎉 TẤT CẢ 15/15 TEST CASE ĐÃ VƯỢT QUA THÀNH CÔNG! 🎉")
    print("Hệ thống API Gateway và các Microservices hoạt động hoàn hảo 100%.")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
