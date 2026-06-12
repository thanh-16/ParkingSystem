# -*- coding: utf-8 -*-
import sys
import uuid
from datetime import datetime, timedelta
import math


sys.stdout.reconfigure(encoding='utf-8')


state = {
    "ai_weights": {
        "w1": 0.4,
        "w2": 0.3,
        "w3": 0.2,
        "w4": 0.1
    },
    "pricing_rules": {
        1: 5000.0,
        2: 20000.0,
        3: 30000.0,
        4: 15000.0
    },
    "vehicle_types": {
        1: "Xe máy (Motorbike)",
        2: "Xe con (Compact Car)",
        3: "Xe SUV / Xe lớn",
        4: "Xe điện (EV)"
    },
    "floors": {
        -1: {"allowed_vehicle_type": 1, "total_slots": 20, "name": "Hầm B1"},
        1: {"allowed_vehicle_type": 2, "total_slots": 15, "name": "Tầng 1"},
        2: {"allowed_vehicle_type": 3, "total_slots": 10, "name": "Tầng 2"},
        3: {"allowed_vehicle_type": 4, "total_slots": 10, "name": "Tầng 3"}
    },
    "slots": [],
    "sessions": {},
    "bookings": {}
}


def seed_slots():
    state["slots"] = []

    for i in range(1, 21):
        state["slots"].append({
            "id": str(uuid.uuid4()),
            "floor": -1,
            "slot_number": f"B1-M{i:02d}",
            "status": "Available",
            "distance_metric": i * 3
        })

    for i in range(1, 16):
        state["slots"].append({
            "id": str(uuid.uuid4()),
            "floor": 1,
            "slot_number": f"F1-C{i:02d}",
            "status": "Available",
            "distance_metric": i * 4
        })

    for i in range(1, 11):
        state["slots"].append({
            "id": str(uuid.uuid4()),
            "floor": 2,
            "slot_number": f"F2-S{i:02d}",
            "status": "Available",
            "distance_metric": i * 5
        })

    for i in range(1, 11):
        state["slots"].append({
            "id": str(uuid.uuid4()),
            "floor": 3,
            "slot_number": f"F3-E{i:02d}",
            "status": "Available",
            "distance_metric": i * 6
        })

seed_slots()

def calculate_occupancy():
    occupancy = {}
    for fl in state["floors"].keys():
        total = state["floors"][fl]["total_slots"]
        occupied = sum(1 for s in state["slots"] if s["floor"] == fl and s["status"] != "Available")
        occupancy[fl] = {"total": total, "occupied": occupied}
    return occupancy

def find_optimal_slot(vehicle_type_id, card_number):
    allowed_floors = [fl for fl, info in state["floors"].items() if info["allowed_vehicle_type"] == vehicle_type_id]

    candidate_slots = [s for s in state["slots"] if s["floor"] in allowed_floors and s["status"] == "Available"]

    if not candidate_slots:
        return None, []

    w1 = state["ai_weights"]["w1"]
    w2 = state["ai_weights"]["w2"]
    w3 = state["ai_weights"]["w3"]
    w4 = state["ai_weights"]["w4"]

    is_long_term = card_number.upper().startswith("MONTHLY")
    occupancy_data = calculate_occupancy()

    scored_slots = []
    for slot in candidate_slots:

        distance_score = 1.0 / max(1, slot["distance_metric"])


        floor_level_score = 1.0 / max(1, abs(slot["floor"]))


        occ = occupancy_data[slot["floor"]]
        free_ratio = (occ["total"] - occ["occupied"]) / occ["total"]
        utilization_balance = free_ratio



        if is_long_term:
            duration_match = slot["distance_metric"] / 100.0
        else:
            duration_match = 100.0 / max(1, slot["distance_metric"])


        score = (w1 * distance_score) + (w2 * floor_level_score) + (w3 * utilization_balance) + (w4 * duration_match)

        scored_slots.append((slot, score, distance_score, floor_level_score, utilization_balance, duration_match))


    scored_slots.sort(key=lambda x: x[1], reverse=True)
    return scored_slots[0][0], scored_slots


def print_header(title):
    print("\n" + "="*60)
    print(f" {title.upper()} ".center(60, "="))
    print("="*60)

def view_dashboard():
    print_header("Dashboard Trực Quan Thời Gian Thực")
    occupancy = calculate_occupancy()

    print(f"{'Tầng':<10} | {'Loại xe cho phép':<22} | {'Trống':<8} | {'Đang đỗ':<8} | {'Tỷ lệ lấp đầy':<15}")
    print("-"*69)
    for fl, info in state["floors"].items():
        occ = occupancy[fl]
        free = occ["total"] - occ["occupied"]
        ratio = (occ["occupied"] / occ["total"]) * 100
        vt_name = state["vehicle_types"][info["allowed_vehicle_type"]]
        print(f"{info['name']:<10} | {vt_name:<22} | {free:<8} | {occ['occupied']:<8} | {ratio:.1f}%")

    print("\n[Trạng thái ô đỗ chi tiết theo tầng hiện tại]")

    for fl, info in state["floors"].items():
        fl_slots = [s for s in state["slots"] if s["floor"] == fl]
        fl_slots.sort(key=lambda x: x["slot_number"])
        print(f"\n> {info['name']}:")
        row_str = "  "
        for s in fl_slots:
            sym = "🟢" if s["status"] == "Available" else "🔴" if s["status"] == "Occupied" else "🟡" if s["status"] == "Reserved" else "🛠️"
            row_str += f"{s['slot_number']}({sym})   "
        print(row_str)

def configure_ai():
    print_header("Cấu hình trọng số thuật toán AI++")
    print("Trọng số hiện tại:")
    print(f" - w1 (Khoảng cách gần): {state['ai_weights']['w1']}")
    print(f" - w2 (Tầng thấp): {state['ai_weights']['w2']}")
    print(f" - w3 (Cân bằng tải): {state['ai_weights']['w3']}")
    print(f" - w4 (Khớp thời gian vé tháng/lượt): {state['ai_weights']['w4']}")

    print("\nNhập các trọng số mới (tổng phải bằng 1.0):")
    try:
        w1 = float(input("Nhập w1 (Khoảng cách): ") or state['ai_weights']['w1'])
        w2 = float(input("Nhập w2 (Tầng thấp): ") or state['ai_weights']['w2'])
        w3 = float(input("Nhập w3 (Cân bằng tải): ") or state['ai_weights']['w3'])
        w4 = float(input("Nhập w4 (Khớp thời gian): ") or state['ai_weights']['w4'])

        if abs((w1 + w2 + w3 + w4) - 1.0) > 0.01:
            print("❌ Lỗi: Tổng các trọng số phải bằng 1.0!")
            return
        state["ai_weights"] = {"w1": w1, "w2": w2, "w3": w3, "w4": w4}
        print("✅ Cập nhật trọng số AI thành công!")
    except ValueError:
        print("❌ Lỗi: Giá trị nhập vào không hợp lệ!")

def configure_pricing():
    print_header("Cấu hình chính sách giá gửi xe")
    for vt, name in state["vehicle_types"].items():
        print(f" {vt}. {name}: {state['pricing_rules'][vt]:,.0f} VND/giờ")

    try:
        vt = int(input("\nChọn số thứ tự loại xe muốn cập nhật: "))
        if vt not in state["pricing_rules"]:
            print("❌ Lỗi: Loại xe không hợp lệ!")
            return
        new_rate = float(input(f"Nhập đơn giá mới cho {state['vehicle_types'][vt]} (VND/giờ): "))
        if new_rate < 0:
            print("❌ Lỗi: Giá không được âm!")
            return
        state["pricing_rules"][vt] = new_rate
        print("✅ Cập nhật bảng giá thành công!")
    except ValueError:
        print("❌ Lỗi: Giá trị nhập vào không hợp lệ!")

def simulate_check_in():
    print_header("Giả lập xe vào bãi (Check-In)")
    print("Chọn loại phương tiện:")
    for vt, name in state["vehicle_types"].items():
        print(f"  {vt}. {name}")
    try:
        vt_choice = int(input("Nhập lựa chọn (1-4): "))
        if vt_choice not in state["vehicle_types"]:
            print("❌ Lỗi: Lựa chọn không hợp lệ!")
            return
    except ValueError:
        print("❌ Lỗi: Lựa chọn không hợp lệ!")
        return

    plate = input("Nhập biển số xe (ví dụ: 59F1-99999): ").strip().upper()
    if not plate:
        print("❌ Lỗi: Biển số không được để trống!")
        return


    for s_id, s_info in state["sessions"].items():
        if s_info["plate"] == plate and s_info["status"] == "Active":
            print(f"❌ Lỗi: Xe {plate} hiện đang đỗ trong bãi xe rồi!")
            return

    card = input("Nhập mã thẻ từ (bắt đầu bằng 'MONTHLY' nếu là vé tháng): ").strip().upper()
    if not card:
        card = "CARD-" + str(uuid.uuid4().hex[:6]).upper()
        print(f"-> Tự sinh mã thẻ từ ngẫu nhiên: {card}")

    print("\n🔍 Đang chạy thuật toán AI chấm điểm các slot trống...")
    optimal_slot, scored_list = find_optimal_slot(vt_choice, card)

    if not optimal_slot:
        print("❌ Hết chỗ trống cho loại xe này trong tòa nhà!")
        return


    print(f"\n[Bảng chấm điểm AI - Top 3 ô đỗ tối ưu nhất cho {state['vehicle_types'][vt_choice]}]:")
    print(f"{'Vị trí':<10} | {'Tổng điểm':<10} | {'w1*Gần':<10} | {'w2*Tầng':<10} | {'w3*Tải':<10} | {'w4*Khớp':<10}")
    print("-"*70)

    w1 = state["ai_weights"]["w1"]
    w2 = state["ai_weights"]["w2"]
    w3 = state["ai_weights"]["w3"]
    w4 = state["ai_weights"]["w4"]

    for slot, score, d_sc, fl_sc, util, dur in scored_list[:3]:
        print(f"{slot['slot_number']:<10} | {score:<10.4f} | {w1*d_sc:<10.4f} | {w2*fl_sc:<10.4f} | {w3*util:<10.4f} | {w4*dur:<10.4f}")


    optimal_slot["status"] = "Occupied"


    session_id = str(uuid.uuid4())
    state["sessions"][session_id] = {
        "plate": plate,
        "card": card,
        "vehicle_type": vt_choice,
        "slot_number": optimal_slot["slot_number"],
        "slot_id": optimal_slot["id"],
        "check_in_time": datetime.now(),
        "status": "Active"
    }

    print(f"\n✅ Check-In THÀNH CÔNG!")
    print(f" - Phiên đỗ xe: {session_id[:8]}")
    print(f" - Biển số xe: {plate}")
    print(f" - Loại thẻ: {'Vé tháng' if card.startswith('MONTHLY') else 'Vé lượt'}")
    print(f" - Vị trí đỗ chỉ định tối ưu: Tầng {optimal_slot['floor']} - Ô {optimal_slot['slot_number']}")
    print(f" 🛗 [Dẫn đường]: Hãy lái xe đi thẳng vào ô đỗ {optimal_slot['slot_number']}. Barrier cổng vào đã mở.")

def simulate_check_out():
    print_header("Giả lập xe ra bãi (Check-Out)")
    active_sessions = {k: v for k, v in state["sessions"].items() if v["status"] == "Active"}

    if not active_sessions:
        print("Không có xe nào đang đỗ trong bãi!")
        return

    print("Danh sách xe đang đỗ trong bãi:")
    idx = 1
    session_keys = []
    for k, v in active_sessions.items():
        print(f"  {idx}. Biển số: {v['plate']} | Thẻ: {v['card']} | Vị trí: {v['slot_number']} | Giờ vào: {v['check_in_time'].strftime('%H:%M:%S')}")
        session_keys.append(k)
        idx += 1

    try:
        choice = int(input("\nChọn số thứ tự xe muốn Check-Out: "))
        if choice < 1 or choice > len(session_keys):
            print("❌ Lỗi: Lựa chọn không hợp lệ!")
            return
        session_id = session_keys[choice - 1]
    except ValueError:
        print("❌ Lỗi: Lựa chọn không hợp lệ!")
        return

    session = state["sessions"][session_id]

    try:
        hours_parked = float(input("Nhập số giờ gửi giả lập (ví dụ: 2.5 hoặc 8): "))
        if hours_parked <= 0:
            print("❌ Lỗi: Số giờ gửi phải lớn hơn 0!")
            return
    except ValueError:
        print("❌ Lỗi: Giá trị nhập vào không hợp lệ!")
        return


    hours_ceil = math.ceil(hours_parked)
    rate = state["pricing_rules"][session["vehicle_type"]]
    total_fee = hours_ceil * rate


    if session["card"].startswith("MONTHLY"):
        total_fee = 0.0
        print("\n💳 Xe sử dụng thẻ VÉ THÁNG (được miễn phí lượt gửi)!")

    print(f"\n--- HÓA ĐƠN THANH TOÁN ---")
    print(f" Biển số: {session['plate']}")
    print(f" Vị trí đỗ: {session['slot_number']}")
    print(f" Thời gian gửi giả lập: {hours_parked} giờ (Tính phí làm tròn lên: {hours_ceil} giờ)")
    print(f" Đơn giá: {rate:,.0f} VND/giờ")
    print(f" Tổng số tiền phải thanh toán: {total_fee:,.0f} VND")
    print("-" * 30)

    if total_fee > 0:
        print("Chọn phương thức thanh toán:")
        print("  1. Ví Momo / VNPay (QR Online)")
        print("  2. Tiền mặt trực tiếp tại quầy")
        pay_choice = input("Lựa chọn (1-2): ")
        if pay_choice == "1":
            print("\n📲 Đang sinh mã QR giả lập thanh toán bất đồng bộ qua Payment Service Webhook...")
            print("... Giao dịch thành công!")
        else:
            print("\n💵 Đã thu tiền mặt tại quầy cổng ra.")


    for s in state["slots"]:
        if s["id"] == session["slot_id"]:
            s["status"] = "Available"
            break

    session["status"] = "Completed"
    session["check_out_time"] = datetime.now()
    session["total_fee"] = total_fee

    print(f"\n✅ Check-Out THÀNH CÔNG!")
    print(f" Cổng chắn Barrier cổng ra đã mở. Xe {session['plate']} rời bãi an toàn.")

def simulate_exception():
    print_header("Xử lý sự cố ngoại lệ (Exception Handling)")
    active_sessions = {k: v for k, v in state["sessions"].items() if v["status"] == "Active"}

    if not active_sessions:
        print("Không có xe nào đang đỗ để xử lý sự cố!")
        return

    print("Chọn xe gặp sự cố:")
    idx = 1
    session_keys = []
    for k, v in active_sessions.items():
        print(f"  {idx}. Biển số: {v['plate']} | Vị trí đỗ: {v['slot_number']}")
        session_keys.append(k)
        idx += 1

    try:
        choice = int(input("\nChọn số thứ tự xe gặp sự cố: "))
        if choice < 1 or choice > len(session_keys):
            print("❌ Lỗi: Lựa chọn không hợp lệ!")
            return
        session_id = session_keys[choice - 1]
    except ValueError:
        print("❌ Lỗi: Lựa chọn không hợp lệ!")
        return

    session = state["sessions"][session_id]
    notes = input("Nhập biên bản/ghi chú xử lý sự cố (ví dụ: Mất thẻ xe, sai biển số xe, chủ xe xuất trình giấy tờ): ")


    for s in state["slots"]:
        if s["id"] == session["slot_id"]:
            s["status"] = "Available"
            break

    session["status"] = "Exception"
    session["check_out_time"] = datetime.now()
    session["notes"] = notes
    session["total_fee"] = 50000.0

    print(f"\n✅ Đã ghi nhận sự cố vào lịch sử hệ thống!")
    print(f" - Lý do sự cố: {notes}")
    print(f" - Phí đền bù xử lý: 50,000 VND")
    print(f" - Ô đỗ {session['slot_number']} đã được giải phóng trở lại trạng thái trống.")


def main():
    while True:
        print("\n" + "="*60)
        print(" HỆ THỐNG GIẢ LẬP VẬN HÀNH BÃI XE PBMS ".center(60, "#"))
        print("="*60)
        print("  1. Xem Dashboard sơ đồ đỗ xe thời gian thực")
        print("  2. Giả lập xe vào bãi (Check-In) & AI gợi ý vị trí")
        print("  3. Giả lập xe ra bãi (Check-Out) & Tính toán hóa đơn")
        print("  4. Cấu hình trọng số tối ưu thuật toán AI++")
        print("  5. Cập nhật bảng giá dịch vụ")
        print("  6. Xử lý sự cố ngoại lệ (Mất vé, sai thông tin)")
        print("  7. Thoát giả lập")
        print("="*60)

        choice = input("Chọn chức năng (1-7): ").strip()
        if choice == "1":
            view_dashboard()
        elif choice == "2":
            simulate_check_in()
        elif choice == "3":
            simulate_check_out()
        elif choice == "4":
            configure_ai()
        elif choice == "5":
            configure_pricing()
        elif choice == "6":
            simulate_exception()
        elif choice == "7":
            print("\nCảm ơn bạn đã trải nghiệm hệ thống giả lập PBMS. Hẹn gặp lại!")
            break
        else:
            print("❌ Lựa chọn không hợp lệ, vui lòng chọn lại từ 1-7.")

if __name__ == "__main__":
    main()