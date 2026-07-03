# -*- coding: utf-8 -*-
import json
import urllib.request
import urllib.error
import sys
import time

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
            try:
                res_json = json.loads(res_data) if res_data else {}
            except json.JSONDecodeError:
                res_json = {"message": res_data}
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

def print_banner(title):
    print("\n" + "=" * 80)
    print(f"🔹 {title} 🔹")
    print("=" * 80)

def print_result(tc_id, description, success, detail=""):
    status_str = "🟢 ĐẠT (PASS)" if success else "🔴 HỎNG (FAIL)"
    print(f"   [{tc_id}] {description:<55} -> {status_str}")
    if detail:
        print(f"         ↳ Chi tiết: {detail}")

def run_partitioned_tests():
    # Database resetting
    print("🔄 Đang dọn dẹp dữ liệu cũ trong database để đảm bảo kết quả chính xác...")
    import subprocess
    try:
        subprocess.run([
            "docker", "exec", "-i", "pbms-postgres", "psql", 
            "-U", "postgres", "-d", "pbms_transaction_db", 
            "-c", "TRUNCATE TABLE \"Bookings\" CASCADE; TRUNCATE TABLE \"DriverWallets\" CASCADE; TRUNCATE TABLE \"ParkingSessions\" CASCADE; TRUNCATE TABLE \"OutboxMessage\" CASCADE; TRUNCATE TABLE \"OutboxState\" CASCADE; TRUNCATE TABLE \"InboxState\" CASCADE;"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("   ✅ Đã làm sạch database (Truncate tables successfully).\n")
    except Exception as e:
        print(f"   ⚠️ Không thể tự động làm sạch DB: {e}\n")

    manager_token = None
    staff_token = None
    driver_token = None
    
    results = {}

    # =========================================================================
    # PART 1: AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
    # =========================================================================
    print_banner("PART 1: AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)")
    
    # TC-1.1: Đăng nhập Manager hợp lệ
    status, res = make_request("/api/v1/auth/login", "POST", {"username": "manager1", "password": "123"})
    t1_1 = (status == 200 and ("token" in res or "Token" in res))
    if t1_1:
        manager_token = res.get("token") or res.get("Token")
    print_result("TC-1.1", "Đăng nhập tài khoản Quản Lý (Manager) hợp lệ", t1_1)
    results["TC-1.1"] = t1_1

    # TC-1.2: Đăng nhập Staff hợp lệ
    status, res = make_request("/api/v1/auth/login", "POST", {"username": "staff1", "password": "123"})
    t1_2 = (status == 200 and ("token" in res or "Token" in res))
    if t1_2:
        staff_token = res.get("token") or res.get("Token")
    print_result("TC-1.2", "Đăng nhập tài khoản Nhân Viên (Staff) hợp lệ", t1_2)
    results["TC-1.2"] = t1_2

    # TC-1.3: Đăng ký & Đăng nhập Driver mới
    driver_username = f"driver_test_{int(time.time())}"
    status, res = make_request("/api/v1/auth/register", "POST", {
        "username": driver_username,
        "password": "123",
        "fullName": "Lái Xe Kiểm Thử",
        "role": "Driver",
        "phoneNumber": "0912345678"
    })
    reg_ok = (status == 200)
    if reg_ok:
        status, res = make_request("/api/v1/auth/login", "POST", {"username": driver_username, "password": "123"})
        t1_3 = (status == 200 and ("token" in res or "Token" in res))
        if t1_3:
            driver_token = res.get("token") or res.get("Token")
    else:
        t1_3 = False
    print_result("TC-1.3", "Đăng ký & Đăng nhập tài khoản Lái Xe (Driver)", t1_3)
    results["TC-1.3"] = t1_3

    # TC-1.4: Từ chối đăng nhập sai mật khẩu
    status, res = make_request("/api/v1/auth/login", "POST", {"username": "manager1", "password": "wrongpassword"})
    t1_4 = (status == 400 or status == 401)
    print_result("TC-1.4", "Từ chối đăng nhập khi sai mật khẩu", t1_4, f"Server trả về mã {status}")
    results["TC-1.4"] = t1_4

    # TC-1.5: Chặn truy cập ẩn danh (Không có Token)
    status, res = make_request("/api/v1/manager/pricing-rules", "GET")
    t1_5 = (status == 401)
    print_result("TC-1.5", "Chặn truy cập ẩn danh vào cấu hình giá cước", t1_5, f"Response status: {status} Unauthorized")
    results["TC-1.5"] = t1_5

    # TC-1.6: Chặn sai quyền hạn (Staff gọi API Quản Lý)
    status, res = make_request("/api/v1/manager/pricing-rules", "GET", None, staff_token)
    t1_6 = (status == 403)
    print_result("TC-1.6", "Chặn Nhân Viên (Staff) truy cập API của Quản Lý", t1_6, f"Response status: {status} Forbidden")
    results["TC-1.6"] = t1_6


    # =========================================================================
    # PART 2: REGISTRY & PARKING BUILDING CONFIGURATIONS
    # =========================================================================
    print_banner("PART 2: REGISTRY & PARKING BUILDING CONFIGURATIONS")

    # TC-2.1: Health check Registry API
    status, res = make_request("/health", "GET")
    t2_1 = (status == 200)
    print_result("TC-2.1", "Health check hệ thống cổng API Gateway", t2_1)
    results["TC-2.1"] = t2_1

    # TC-2.2: Khởi tạo bãi xe (Seeding)
    status, res = make_request("/api/v1/registry/setup", "POST", {}, manager_token)
    t2_2 = (status == 200)
    print_result("TC-2.2", "Khởi tạo sơ đồ bãi đỗ xe đa tầng tự động (Seeding)", t2_2)
    results["TC-2.2"] = t2_2

    # TC-2.3: Lấy danh sách ô đỗ xe
    status, res = make_request("/api/v1/registry/slots", "GET", None, manager_token)
    t2_3 = (status == 200 and len(res) == 35)
    print_result("TC-2.3", "Tải danh sách ô đỗ (Yêu cầu chính xác 35 ô ô tô)", t2_3, f"Số ô tải được: {len(res) if t2_3 else 0}")
    results["TC-2.3"] = t2_3

    # TC-2.4: Lấy thống kê mật độ đỗ xe các tầng
    status, res = make_request("/api/v1/registry/floors/occupancy", "GET", None, staff_token)
    t2_4 = (status == 200 and len(res) > 0)
    print_result("TC-2.4", "Tải dữ liệu mật độ đỗ xe (Occupancy) các tầng", t2_4)
    results["TC-2.4"] = t2_4


    # =========================================================================
    # PART 3: DRIVER WALLET & PRE-BOOKING SYSTEM
    # =========================================================================
    print_banner("PART 3: DRIVER WALLET & PRE-BOOKING SYSTEM")

    # TC-3.1: Kiểm tra số dư ví ban đầu
    status, res = make_request("/api/v1/driver/wallet", "GET", None, driver_token)
    t3_1 = (status == 200 and res.get("balance") == 0)
    print_result("TC-3.1", "Xác minh số dư ví Lái xe mới khởi tạo bằng 0 VND", t3_1)
    results["TC-3.1"] = t3_1

    # TC-3.2: Chặn đặt giữ chỗ khi không đủ tiền cọc
    status, res = make_request("/api/v1/driver/bookings", "POST", {
        "licensePlate": "30A-BOOKING",
        "vehicleTypeId": 2
    }, driver_token)
    t3_2 = (status == 400 and "số dư" in res.get("message", "").lower())
    print_result("TC-3.2", "Chặn đặt chỗ trước khi ví không đủ tiền cọc", t3_2, res.get("message"))
    results["TC-3.2"] = t3_2

    # TC-3.3: Nạp tiền ví điện tử
    status, res = make_request("/api/v1/driver/wallet/deposit", "POST", {"amount": 100000}, driver_token)
    t3_3 = (status == 200 and res.get("wallet", {}).get("balance") == 100000)
    print_result("TC-3.3", "Nạp thành công 100.000đ vào ví điện tử lái xe", t3_3)
    results["TC-3.3"] = t3_3

    # TC-3.4: Đặt chỗ trước thành công (Khấu trừ cọc)
    status, res = make_request("/api/v1/driver/bookings", "POST", {
        "licensePlate": "30A-BOOKING",
        "vehicleTypeId": 2
    }, driver_token)
    t3_4 = (status == 200 and res.get("balance") == 80000)
    reserved_slot = res.get("booking", {}).get("slotNumber") if t3_4 else None
    reserved_slot_id = res.get("booking", {}).get("slotId") if t3_4 else None
    print_result("TC-3.4", "Đặt giữ chỗ thành công (Trừ 20.000đ cọc đặt chỗ)", t3_4, f"Mã ô đỗ được cấp: {reserved_slot} (ID: {reserved_slot_id}), Số dư ví: {res.get('balance')} đ")
    results["TC-3.4"] = t3_4

    # TC-3.5: Chống spam đặt chỗ trùng biển số
    status, res = make_request("/api/v1/driver/bookings", "POST", {
        "licensePlate": "30A-BOOKING",
        "vehicleTypeId": 2
    }, driver_token)
    t3_5 = (status == 400 and "đã được" in res.get("message", "").lower())
    print_result("TC-3.5", "Chặn trùng biển số xe đang đặt giữ chỗ (Chống spam)", t3_5, res.get("message"))
    results["TC-3.5"] = t3_5


    # =========================================================================
    # PART 4: STAFF GATE SIMULATOR (CHECK-IN / CHECK-OUT) & CQRS
    # =========================================================================
    print_banner("PART 4: STAFF GATE SIMULATOR (CHECK-IN / CHECK-OUT) & CQRS")

    # TC-4.1: Check-in xe có đặt chỗ trước (Khớp đúng ô đỗ đã giữ)
    status, res = make_request("/api/v1/transaction/check-in", "POST", {
        "cardNumber": "CARD-BOOKED-99",
        "licensePlate": "30A-BOOKING",
        "vehicleTypeId": 2
    }, staff_token)
    t4_1_init = (status == 200)
    t4_1 = False
    if t4_1_init:
        print("      ⏳ Chờ 3 giây để hệ thống xử lý phân bổ ô đỗ bất đồng bộ (CQRS)...")
        time.sleep(3)
        status, res_sessions = make_request("/api/v1/transaction/sessions/active", "GET", None, staff_token)
        if status == 200:
            matched = next((s for s in res_sessions if s.get("licensePlate") == "30A-BOOKING"), None)
            if matched:
                allocated_id = matched.get("allocatedSlotId") or matched.get("AllocatedSlotId")
                t4_1 = (allocated_id == reserved_slot_id)
                detail_msg = f"Đúng ô đỗ đã đặt: {reserved_slot} (ID: {allocated_id})" if t4_1 else f"Lỗi: Đỗ sai ô {allocated_id} thay vì {reserved_slot_id}"
            else:
                detail_msg = "Không tìm thấy xe trong phiên hoạt động"
        else:
            detail_msg = "Không thể kết nối danh sách phiên"
    else:
        detail_msg = res.get("message", "Lỗi Check-in")
        
    print_result("TC-4.1", "Check-in xe đã đặt trước (Khớp đúng ô đỗ đã đặt)", t4_1, detail_msg)
    results["TC-4.1"] = t4_1

    # TC-4.2: Check-out xe đã đặt trước (Giải phóng ô đỗ)
    status, res = make_request("/api/v1/transaction/check-out", "POST", {
        "cardNumber": "CARD-BOOKED-99",
        "licensePlate": "30A-BOOKING"
    }, staff_token)
    t4_2 = (status == 200)
    print_result("TC-4.2", "Check-out giải phóng xe đặt chỗ", t4_2, f"Phí thanh toán: {res.get('totalFee')} đ" if t4_2 else "")
    results["TC-4.2"] = t4_2

    # TC-4.3: Check-in xe vãng lai thông thường
    test_plate_normal = "30A-NORMAL"
    status, res = make_request("/api/v1/transaction/check-in", "POST", {
        "cardNumber": "CARD-NORMAL-11",
        "licensePlate": test_plate_normal,
        "vehicleTypeId": 2
    }, staff_token)
    t4_3_init = (status == 200)
    t4_3 = False
    if t4_3_init:
        time.sleep(3)
        status, res_sessions = make_request("/api/v1/transaction/sessions/active", "GET", None, staff_token)
        if status == 200:
            matched = any(s.get("licensePlate") == test_plate_normal for s in res_sessions)
            t4_3 = matched
    print_result("TC-4.3", "Check-in xe vãng lai tự động phân bổ ô đỗ tối ưu", t4_3)
    results["TC-4.3"] = t4_3

    # TC-4.4: Check-out xe vãng lai thông thường
    status, res = make_request("/api/v1/transaction/check-out", "POST", {
        "cardNumber": "CARD-NORMAL-11",
        "licensePlate": test_plate_normal
    }, staff_token)
    t4_4 = (status == 200)
    print_result("TC-4.4", "Check-out giải phóng xe vãng lai & Hoàn tất phiên", t4_4)
    results["TC-4.4"] = t4_4


    # =========================================================================
    # SUMMARY REPORT
    # =========================================================================
    print("\n" + "=" * 80)
    print("📊 BÁO CÁO TỔNG HỢP KẾT QUẢ KIỂM THỬ HỆ THỐNG PHÂN MẢNH 📊")
    print("=" * 80)
    
    parts = {
        "PART 1: XÁC THỰC & PHÂN QUYỀN (RBAC)": ["TC-1.1", "TC-1.2", "TC-1.3", "TC-1.4", "TC-1.5", "TC-1.6"],
        "PART 2: QUẢN LÝ THÔNG TIN BÃI ĐỖ (REGISTRY)": ["TC-2.1", "TC-2.2", "TC-2.3", "TC-2.4"],
        "PART 3: VÍ ĐIỆN TỬ & ĐẶT CHỖ TRƯỚC (DRIVER)": ["TC-3.1", "TC-3.2", "TC-3.3", "TC-3.4", "TC-3.5"],
        "PART 4: LỐI VÀO CỔNG & CQRS (STAFF)": ["TC-4.1", "TC-4.2", "TC-4.3", "TC-4.4"]
    }
    
    overall_success = True
    for part_name, tc_list in parts.items():
        print(f"\n📁 {part_name}:")
        part_success = True
        for tc in tc_list:
            status_icon = "✅" if results.get(tc, False) else "❌"
            print(f"   {status_icon} {tc}")
            if not results.get(tc, False):
                part_success = False
                overall_success = False
        part_status = "🟢 HOÀN HẢO" if part_success else "🔴 CÓ LỖI"
        print(f"   -> ĐÁNH GIÁ CHUNG: {part_status}")

    print("\n" + "=" * 80)
    if overall_success:
        print("🎉 KẾT LUẬN: TOÀN BỘ HỆ THỐNG PBMS MICROSERVICES HOẠT ĐỘNG HOÀN HẢO 100%! 🎉")
    else:
        print("💥 KẾT LUẬN: PHÁT HIỆN LỖI TRONG MỘT SỐ PHÂN HỆ! CẦN KIỂM TRA LẠI LOGS. 💥")
    print("=" * 80 + "\n")
    
    return overall_success

if __name__ == "__main__":
    success = run_partitioned_tests()
    sys.exit(0 if success else 1)
