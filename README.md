# Hướng Dẫn Phát Triển & Đặc Tả Hệ Thống: Parking Building Management System (PBMS)

Hệ thống quản lý tòa nhà gửi xe thông minh nhiều tầng (PBMS) được thiết kế cho các đô thị lớn nhằm tối ưu hóa diện tích đỗ xe, giải quyết ùn tắc tại cổng ra/vào và tích hợp các công nghệ tự động hóa nâng cao (AI, Thị giác máy tính - ANPR, Redis Caching, RabbitMQ Event-Driven).

---

## 1. Cấu Trúc Thư Mục Dự Án (FE / BE Separation)
Dự án được phân chia thành 2 thư mục chính độc lập:
*   **`frontend/`**: Chứa giao diện điều khiển trung tâm viết bằng **Vite + React**.
*   **`backend/`**: Chứa toàn bộ hạ tầng C# .NET Microservices, cổng API YARP Gateway, file Solution `.slnx`, docker-compose, chứng chỉ bảo mật và các tập lệnh SQL database.

---

## 2. Vai Trò & Phân Quyền Hệ Thống (RBAC)
Hệ thống sử dụng cơ chế kiểm soát truy cập dựa trên vai trò (Role-Based Access Control) thông qua JWT Bearer Token với các Actor chính:
1. **Parking Facility Manager (Quản lý Bãi xe):** Cấu hình tòa nhà, tầng, slot đỗ, loại xe cho phép ở từng tầng, chính sách tính phí linh hoạt (ngày/đêm, block giờ), theo dõi tỷ lệ lấp đầy, báo cáo doanh thu và xử lý ngoại lệ cấp cao (mất thẻ, sai biển số...).
2. **Parking Staff (Nhân viên Cổng/Bãi):** Quét thẻ xe, xác nhận biển số ANPR khi check-in/check-out, thu phí trực tiếp tại quầy, xử lý các sự cố tại chỗ (xe đỗ sai khu vực, cập nhật thủ công trạng thái slot).
3. **Parking User / Driver (Tài xế / Khách gửi xe):** Tra cứu số lượng slot trống thời gian thực trên mobile app/bảng điện tử, đặt chỗ trước (booking), theo dõi phí tạm tính và thực hiện thanh toán trực tuyến (MoMo, VNPay).
4. **System Administrator (Quản trị viên):** Cấu hình toàn hệ thống, quản lý tài khoản người dùng, tích hợp phần cứng (barrier, camera IP) và thiết lập hệ thống.

---

## 3. Kiến Trúc Microservices & Clean Architecture
Hệ thống được thiết kế theo mô hình **Microservices** giao tiếp bất đồng bộ qua Event Bus (**RabbitMQ / MassTransit**). Mỗi Service áp dụng mô hình **Clean Architecture** kết hợp mẫu **CQRS (qua MediatR)** nhằm tối ưu hiệu năng:
*   **API Gateway (YARP):** Định tuyến request, xử lý rate limiting và bảo mật.
*   **Identity & Auth Service:** Quản lý tài khoản, phân quyền và sinh JWT Token.
*   **Parking Registry Service:** Quản lý cấu hình bãi đỗ (Tầng, Ô đỗ - Slots, Loại xe). Thực hiện phân vùng logic (Logical Data Partitioning) để giảm tranh chấp dữ liệu (database contention).
*   **Transaction & Session Service:** Quản lý vòng đời lượt gửi xe (`ParkingSessions` - Active, Completed, Exception).
*   **Payment Service:** Tích hợp ví điện tử xử lý thanh toán bất đồng bộ thông qua Event.
*   **AI Optimization & Vision Intelligence (AI++):** Nhận dạng biển số (ANPR), tự động tính toán vị trí đỗ xe tối ưu và đồng bộ lên Redis Cache.

---

## 4. Thuật Toán Tối Ưu Hóa & Caching Cao Cấp (AI++)

### A. Nhận dạng biển số (ANPR) & Phân loại phương tiện
Camera IP tại cổng chụp ảnh biển số gửi đến AI Service để trích xuất text biển số và xác định loại phương tiện (`VehicleTypeId`) nhằm kích hoạt luồng Check-In.

### B. Hàm mục tiêu tối ưu đa tiêu chí (Multi-Criteria Objective Function)
Khi xe Check-In, hệ thống tự động tìm và gán `SlotId` trống có điểm số **Score** cao nhất dựa trên công thức:
$$Score(S) = w_1 \cdot \text{DistanceScore}(S) + w_2 \cdot \text{FloorLevel}(S) + w_3 \cdot \text{UtilizationBalance}(F) + w_4 \cdot \text{DurationMatch}(S)$$

*   **DistanceScore(S):** Điểm tiệm cận khoảng cách (càng gần thang máy/lối ra càng cao).
*   **FloorLevel(S):** Điểm tối ưu tầng thấp (tầng thấp tiết kiệm nhiên liệu di chuyển và thời gian quay vòng).
*   **UtilizationBalance(F):** Điểm cân bằng lấp đầy của tầng $F$ nhằm tải đều phương tiện lên các khu vực.
*   **DurationMatch(S):** Khớp thời gian gửi xe ước tính. Xe dài hạn/vé tháng được hướng vào ô xa, xe ngắn hạn vãng lai giữ ô premium gần cổng.
*   **$w_1, w_2, w_3, w_4$:** Trọng số cấu hình động bởi Manager.

---

## 5. Hướng Dẫn Khởi Chạy Dự Án

### A. Khởi Chạy Backend & Infrastructure
1. Di chuyển vào thư mục `backend/`:
   ```bash
   cd backend
   ```
2. Khởi chạy Docker Infrastructure (Postgres, Redis, RabbitMQ):
   ```bash
   docker-compose up -d
   ```
3. Mở File Solution [ParkingBuildingManagementSystem.slnx](file:///d:/PRN232/ParkingBuildingManagementSystem/backend/ParkingBuildingManagementSystem.slnx) bằng Visual Studio 2022 để phát triển, hoặc build bằng .NET CLI từ thư mục `backend/`:
   ```bash
   dotnet restore
   dotnet build
   ```

### B. Khởi Chạy Giao Diện Điều Khiển Frontend Portal
1. Di chuyển vào thư mục `frontend/`:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói thư viện Node.js:
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển (Dev Server):
   ```bash
   npm run dev
   ```
4. Truy cập giao diện tại đường dẫn mặc định: **[http://localhost:5173/](http://localhost:5173/)**
