import { useState } from 'react';

export default function Login({
  mode,
  setMode,
  handleLogin,
  setUser,
  addToast,
  username,
  setUsername,
  password,
  setPassword
}) {
  const [internalUsername, setInternalUsername] = useState(username);
  const [internalPassword, setInternalPassword] = useState(password);

  const onSubmit = (e) => {
    e.preventDefault();
    setUsername(internalUsername);
    setPassword(internalPassword);
    
    // We pass username/password directly to handleLogin or let App's state trigger it.
    // To ensure handleLogin works correctly with the current state sync, we call it on the next frame or pass it.
    // However, it's safer to pass them as arguments to a modified handleLogin or do a local state submission.
    handleLogin(e, internalUsername, internalPassword);
  };

  return (
    <div className="login-overlay">
      <div className="login-box">
        <div className="login-logo">
          <i className="fa-solid fa-square-parking"></i>
          <h2>Hệ Thống PBMS Portal</h2>
          <p>Quản Lý Tòa Nhà Gửi Xe Thông Minh Đa Tầng</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-8px' }}>
          <div className="mode-toggle-pill">
            <button
              type="button"
              className={`mode-toggle-btn ${mode === 'offline' ? 'active' : ''}`}
              onClick={() => setMode('offline')}
            >
              Mô Phỏng Local
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${mode === 'live' ? 'active' : ''}`}
              onClick={() => setMode('live')}
            >
              Kết Nối Gateway
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Tên đăng nhập / Username</label>
            <input
              type="text"
              placeholder="Nhập tài khoản"
              value={internalUsername}
              onChange={(e) => setInternalUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu / Password</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={internalPassword}
              onChange={(e) => setInternalPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn" style={{ marginTop: '8px' }}>
            <i className="fa-solid fa-right-to-bracket"></i> Đăng Nhập
          </button>
        </form>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '4px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '16px'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 'bold' }}>
            ĐĂNG NHẬP NHANH DEMO (BYPASS)
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={(e) => {
                if (mode === 'live') {
                  handleLogin(e, 'manager1', '123');
                } else {
                  setUser({ username: 'manager1', fullName: 'Nguyễn Văn A', role: 'Manager' });
                  setMode('offline');
                  addToast('Bypass: Quản Lý (Nguyễn Văn A)', 'success');
                }
              }}
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '8px' }}
            >
              🔑 Quản Lý
            </button>
            <button
              onClick={(e) => {
                if (mode === 'live') {
                  handleLogin(e, 'staff1', '123');
                } else {
                  setUser({ username: 'staff1', fullName: 'Trần Thị B', role: 'Staff' });
                  setMode('offline');
                  addToast('Bypass: Nhân Viên (Trần Thị B)', 'success');
                }
              }}
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '8px' }}
            >
              🔑 Nhân Viên
            </button>
          </div>
          <button
            onClick={(e) => {
              if (mode === 'live') {
                handleLogin(e, 'driver1', '123');
              } else {
                setUser({ username: 'driver1', fullName: 'Phạm Văn C', role: 'Driver' });
                setMode('offline');
                addToast('Bypass: Lái Xe (Phạm Văn C)', 'success');
              }
            }}
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '8px', width: '100%' }}
          >
            🚗 Cổng Thông Tin Lái Xe (Driver Portal)
          </button>
        </div>
      </div>
    </div>
  );
}
