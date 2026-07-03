import { useState } from 'react';

export default function DriverPortal({
  driverActiveTab,
  setDriverActiveTab,
  driverPlate,
  setDriverPlate,
  driverBookingForm,
  setDriverBookingForm,
  driverBookingSuccess,
  driverActiveSession,
  handleDriverBooking,
  trackDriverSession,
  user,
  walletBalance = 0,
  handleDeposit,
  token,
  setToken,
  setUser,
  addToast,
  mode
}) {
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regFullName) {
      addToast('Vui lòng điền đầy đủ các thông tin đăng ký!', 'warning');
      return;
    }
    try {
      const res = await fetch('http://localhost:5125/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          fullName: regFullName,
          role: 'Driver',
          phoneNumber: regPhone
        })
      });
      if (res.ok) {
        addToast('Đăng ký tài khoản Driver thành công! Hãy đăng nhập.', 'success');
        setIsRegisterMode(false);
        setLoginUser(regUsername);
        setLoginPass('');
      } else {
        const err = await res.json().catch(() => ({}));
        addToast(err.message || 'Lỗi đăng ký tài khoản!', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ để đăng ký!', 'error');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUser || !loginPass) {
      addToast('Vui lòng điền tên đăng nhập và mật khẩu!', 'warning');
      return;
    }
    try {
      const res = await fetch('http://localhost:5125/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      if (res.ok) {
        const data = await res.json();
        const tokenVal = data.token || data.Token;
        const userVal = data.user || data.User;
        if (tokenVal && userVal) {
          setToken(tokenVal);
          setUser({
            username: userVal.username || userVal.Username,
            fullName: userVal.fullName || userVal.FullName,
            role: userVal.role || userVal.Role
          });
          addToast(`Chào mừng, ${userVal.fullName}!`, 'success');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        addToast(err.message || 'Đăng nhập thất bại!', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối máy chủ để đăng nhập!', 'error');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    addToast('Đã đăng xuất tài khoản!', 'info');
  };
  return (
    <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ maxWidth: '450px' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '20px', marginBottom: '12px' }}>
          Trải Nghiệm Lái Xe (Driver Experience)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
          Phân hệ này cho phép lái xe tương tác trực tuyến trên điện thoại thông minh. Lái xe có thể đặt chỗ đỗ trước từ nhà (hệ thống sẽ giữ ô đỗ trong vòng 30 phút, nhấp nháy màu vàng ở sơ đồ bãi xe), hoặc giám sát trực tiếp thời gian đỗ, phí phát sinh hiện tại của xe mình khi đang gửi trong bãi.
        </p>
        <div className="alert-box info">
          <strong>Mẹo test:</strong> Hãy đặt chỗ một biển số xe (Ví dụ: <code>30A-66666</code>). Sau đó sang tab <strong>Làn Xe & Cổng Simulator</strong>, gõ biển số này ở cổng vào. Camera thông minh sẽ tự nhận diện xe đã đặt chỗ trước và cho phép check-in vào đúng ô đỗ đã giữ!
        </div>
      </div>

      {/* Phone Mockup */}
      <div className="phone-mockup">
        {/* Status Bar */}
        <div className="phone-header">
          <span>15:45</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <i className="fa-solid fa-wifi"></i>
            <i className="fa-solid fa-battery-three-quarters"></i>
          </div>
        </div>

        {/* Content */}
        <div className="phone-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-circle-user" style={{ fontSize: '28px', color: 'var(--primary)' }}></i>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>Chào bạn, {user ? user.fullName : 'Lái xe'}</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{user ? `@${user.username}` : 'Thành viên'}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Số dư ví</span>
              <strong style={{ fontSize: '13px', color: 'var(--success)' }}>{walletBalance.toLocaleString('vi-VN')} đ</strong>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="phone-subtabs" style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '8px', margin: '12px 0' }}>
            <button
              type="button"
              onClick={() => setDriverActiveTab('book')}
              style={{
                flex: 1,
                background: driverActiveTab === 'book' ? 'var(--primary)' : 'transparent',
                color: driverActiveTab === 'book' ? 'white' : 'var(--text-muted)',
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Đặt Chỗ
            </button>
            <button
              type="button"
              onClick={() => setDriverActiveTab('track')}
              style={{
                flex: 1,
                background: driverActiveTab === 'track' ? 'var(--primary)' : 'transparent',
                color: driverActiveTab === 'track' ? 'white' : 'var(--text-muted)',
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Tra Cứu
            </button>
            <button
              type="button"
              onClick={() => setDriverActiveTab('wallet')}
              style={{
                flex: 1,
                background: driverActiveTab === 'wallet' ? 'var(--primary)' : 'transparent',
                color: driverActiveTab === 'wallet' ? 'white' : 'var(--text-muted)',
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Ví & User
            </button>
          </div>

          {/* Book tab */}
          {driverActiveTab === 'book' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <form onSubmit={handleDriverBooking} className="phone-app-card">
                <h4>Đặt Trước Vị Trí Đỗ</h4>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>Nhập Biển Số Xe của bạn</label>
                  <input
                    type="text"
                    style={{ padding: '6px 8px', fontSize: '12px' }}
                    placeholder="Ví dụ: 30A-66666"
                    value={driverBookingForm.licensePlate}
                    onChange={(e) =>
                      setDriverBookingForm((prev) => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))
                    }
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px' }}>Loại xe gửi</label>
                  <select
                    style={{ padding: '6px 8px', fontSize: '12px' }}
                    value={driverBookingForm.vehicleTypeId}
                    onChange={(e) =>
                      setDriverBookingForm((prev) => ({ ...prev, vehicleTypeId: e.target.value }))
                    }
                  >
                    <option value="2">Compact/Sedan</option>
                    <option value="3">SUV</option>
                    <option value="4">Xe Điện EV</option>
                  </select>
                </div>

                <button type="submit" className="btn" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                  Đặt Chỗ (Giữ 30 Phút)
                </button>
              </form>

              {driverBookingSuccess && (
                <div className="phone-app-card" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <h4 style={{ color: 'var(--success)' }}>Xác Nhận Đặt Chỗ</h4>
                  <p style={{ fontSize: '11.5px', margin: '2px 0' }}>Biển số: <strong>{driverBookingSuccess.licensePlate}</strong></p>
                  <p style={{ fontSize: '11.5px', margin: '2px 0' }}>Vị trí đỗ giữ trước: <strong style={{ color: 'var(--success)' }}>{driverBookingSuccess.slotNumber}</strong></p>
                  <p style={{ fontSize: '11.5px', margin: '2px 0' }}>Thời hạn giữ chỗ: <strong>30 Phút</strong></p>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Mã đặt chỗ: {driverBookingSuccess.id}</span>
                </div>
              )}
            </div>
          )}

          {/* Track tab */}
          {driverActiveTab === 'track' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="phone-app-card">
                <h4>Giám Sát Phiên Gửi Trực Tuyến</h4>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px' }}>Nhập biển số xe cần giám sát</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      style={{ padding: '6px 8px', fontSize: '12px', flexGrow: 1 }}
                      placeholder="Ví dụ: 30A-12345"
                      value={driverPlate}
                      onChange={(e) => setDriverPlate(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      onClick={trackDriverSession}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Tra Cứu
                    </button>
                  </div>
                </div>
              </div>

              {driverActiveSession && (
                <div className="phone-app-card" style={{ background: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                  <h4 style={{ color: 'var(--primary)' }}>TÌNH TRẠNG GỬI XE LIVE</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vị trí đỗ:</span>
                      <strong style={{ color: 'white' }}>{driverActiveSession.slotNumber}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Giờ vào:</span>
                      <span>{new Date(driverActiveSession.checkInTime).toLocaleTimeString('vi-VN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Thời gian đỗ:</span>
                      <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
                        {driverActiveSession.durationMinutes} phút
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Phí tạm tính:</span>
                      <strong style={{ color: 'var(--success)' }}>
                        {driverActiveSession.tempFee.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wallet & User tab */}
          {driverActiveTab === 'wallet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Wallet Card */}
              <div className="phone-app-card">
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-wallet" style={{ color: 'var(--success)' }}></i>
                  Ví Điện Tử Driver
                </h4>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', textAlign: 'center', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Số dư khả dụng</span>
                  <h3 style={{ margin: 0, color: 'var(--success)', fontSize: '18px', fontWeight: 'bold' }}>
                    {walletBalance.toLocaleString('vi-VN')} đ
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nạp tiền nhanh:</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={() => handleDeposit(50000)} className="btn" style={{ flex: 1, padding: '5px 0', fontSize: '10px' }}>+50k</button>
                    <button type="button" onClick={() => handleDeposit(100000)} className="btn" style={{ flex: 1, padding: '5px 0', fontSize: '10px' }}>+100k</button>
                    <button type="button" onClick={() => handleDeposit(200000)} className="btn" style={{ flex: 1, padding: '5px 0', fontSize: '10px' }}>+200k</button>
                  </div>
                </div>
              </div>

              {/* Account Management Card */}
              <div className="phone-app-card">
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-user-gear" style={{ color: 'var(--primary)' }}></i>
                  Tài Khoản Lái Xe
                </h4>

                {mode !== 'live' ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                    <i className="fa-solid fa-toggle-off" style={{ marginRight: '4px' }}></i>
                    Đang chạy chế độ Offline. Chuyển sang Live API ở góc cổng Staff để test đăng ký/đăng nhập thật.
                  </div>
                ) : !token ? (
                  /* Live mode & Not logged in */
                  isRegisterMode ? (
                    /* Register Form */
                    <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '10px' }}>Tên đăng nhập</label>
                        <input
                          type="text"
                          required
                          style={{ padding: '5px', fontSize: '11px' }}
                          placeholder="Nhập tên đăng nhập..."
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '10px' }}>Mật khẩu</label>
                        <input
                          type="password"
                          required
                          style={{ padding: '5px', fontSize: '11px' }}
                          placeholder="Nhập mật khẩu..."
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '10px' }}>Họ và tên</label>
                        <input
                          type="text"
                          required
                          style={{ padding: '5px', fontSize: '11px' }}
                          placeholder="Nhập họ và tên..."
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '10px' }}>Số điện thoại</label>
                        <input
                          type="text"
                          style={{ padding: '5px', fontSize: '11px' }}
                          placeholder="Nhập số điện thoại..."
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn" style={{ width: '100%', padding: '6px', fontSize: '11px', marginTop: '4px' }}>
                        Đăng Ký Tài Khoản
                      </button>
                      <div style={{ textAlign: 'center', marginTop: '6px' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsRegisterMode(false); }} style={{ fontSize: '10px', color: 'var(--primary)' }}>
                          Đã có tài khoản? Đăng nhập ngay
                        </a>
                      </div>
                    </form>
                  ) : (
                    /* Login Form */
                    <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '10px' }}>Tên đăng nhập</label>
                        <input
                          type="text"
                          required
                          style={{ padding: '5px', fontSize: '11px' }}
                          placeholder="Nhập tên đăng nhập..."
                          value={loginUser}
                          onChange={(e) => setLoginUser(e.target.value.toLowerCase())}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '10px' }}>Mật khẩu</label>
                        <input
                          type="password"
                          required
                          style={{ padding: '5px', fontSize: '11px' }}
                          placeholder="Nhập mật khẩu..."
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn" style={{ width: '100%', padding: '6px', fontSize: '11px', marginTop: '4px' }}>
                        Đăng Nhập Live
                      </button>
                      <div style={{ textAlign: 'center', marginTop: '6px' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsRegisterMode(true); }} style={{ fontSize: '10px', color: 'var(--primary)' }}>
                          Chưa có tài khoản? Đăng ký Driver mới
                        </a>
                      </div>
                    </form>
                  )
                ) : (
                  /* Live mode & Logged In */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tên đăng nhập:</span>
                      <strong>@{user.username}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Họ và tên:</span>
                      <strong>{user.fullName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vai trò:</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{user.role}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn"
                      style={{ width: '100%', padding: '6px', fontSize: '11px', marginTop: '8px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                    >
                      Đăng Xuất Tài Khoản
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
