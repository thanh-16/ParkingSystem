export default function StaffConsole({
  checkInForm,
  setCheckInForm,
  gateOpenCheckIn,
  ledScreenData,
  autoCheckIn,
  setAutoCheckIn,
  triggerAutoCheckIn,
  runAICheckInAnalysis,
  confirmCheckIn,
  simulateIncomingCar,
  slots,
  aiScoringResults,
  selectedWinner,
  checkOutPlateOrCard,
  setCheckOutPlateOrCard,
  searchCheckOutSession,
  checkoutInvoice,
  gateOpenCheckOut,
  confirmCheckOut,
  sessions,
  autofillCheckOut,
  triggerReportException,
  mode,
  user
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="simulator-grid">
        {/* Entrance Gate */}
        <div className="glass-panel">
          <div className="panel-header">
            <h2>🟢 Cổng Vào (Entrance Lane - Check-In)</h2>
          </div>

          <div className="cam-simulation">
            <div className="cam-header">
              <span>ANPR CAMERA FEED [ENTRANCE_01]</span>
              <span className="cam-rec">REC</span>
            </div>
            {checkInForm.licensePlate ? (
              <div className="cam-feed">{checkInForm.licensePlate.toUpperCase()}</div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                Chờ xe tiến vào vạch quét biển số...
              </div>
            )}
          </div>

          {/* Barrier */}
          <div className={`barrier-bar ${gateOpenCheckIn ? 'open' : ''}`}>
            <i className="fa-solid fa-traffic-light" style={{ marginRight: '8px', color: gateOpenCheckIn ? 'var(--success)' : 'var(--danger)' }}></i>
            <span>Thanh chắn cổng vào: {gateOpenCheckIn ? 'ĐANG MỞ (GO)' : 'ĐANG ĐÓNG (WAIT)'}</span>
            <div className="barrier-gate-arm"></div>
          </div>

          {/* Smart LED Guidance display */}
          <div className="led-matrix-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '8px', fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span>📺 BẢNG LED CHỈ DẪN THÔNG MINH (LED GUIDANCE DISPLAY)</span>
              <span style={{ color: '#22c55e' }}><i className="fa-solid fa-signal"></i> Online</span>
            </div>

            {!ledScreenData ? (
              <div style={{
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#f59e0b',
                textShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
                fontSize: '15px',
                fontWeight: 'bold',
                textAlign: 'center',
                letterSpacing: '1px'
              }}>
                <div className="led-blink-text">★ XIN KÍNH CHÀO QUÝ KHÁCH ★</div>
                <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>MỜI XE TIẾN VÀO NHẬN DIỆN</div>
              </div>
            ) : (
              <div style={{
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                padding: '2px 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22d3ee', textShadow: '0 0 6px rgba(34,211,238,0.5)', fontSize: '13px', fontWeight: 'bold' }}>
                  <span>[ XE VÀO / CAR ]</span>
                  <span>{ledScreenData.licensePlate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', textShadow: '0 0 6px rgba(251,191,36,0.5)', fontSize: '14px', fontWeight: 'bold' }}>
                  <span>[ Ô ĐỖ / SLOT ]</span>
                  <span className="led-blink-text" style={{ fontSize: '17px' }}>{ledScreenData.slotNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', textShadow: '0 0 6px rgba(74,222,128,0.5)', fontSize: '13px', fontWeight: 'bold' }}>
                  <span>[ HƯỚNG DẪN / PATH ]</span>
                  <span>{ledScreenData.floor}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Biển Số Nhận Diện (ANPR Plate)</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                    <input
                      type="checkbox"
                      checked={autoCheckIn}
                      onChange={(e) => setAutoCheckIn(e.target.checked)}
                    />
                    ⚡ Auto
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ví dụ: 30A-99999"
                    value={checkInForm.licensePlate}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (autoCheckIn) {
                          triggerAutoCheckIn();
                        } else {
                          runAICheckInAnalysis();
                        }
                      }
                    }}
                    onChange={(e) =>
                      setCheckInForm((prev) => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))
                    }
                    style={{ flexGrow: 1 }}
                  />
                  <button
                    type="button"
                    onClick={simulateIncomingCar}
                    className="btn btn-secondary"
                    style={{ padding: '0 12px', fontSize: '11.5px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                    title="Mô phỏng quét biển số xe"
                  >
                    <i className="fa-solid fa-qrcode"></i> Quét Xe Vào
                  </button>
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Loại Xe / Vehicle Type</label>
                </div>
                <select
                  value={checkInForm.vehicleTypeId}
                  onChange={(e) =>
                    setCheckInForm((prev) => ({ ...prev, vehicleTypeId: e.target.value }))
                  }
                >
                  <option value="2">Compact/Sedan</option>
                  <option value="3">SUV/Crossover</option>
                  <option value="4">Xe Điện EV</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Mã Thẻ Từ (Card UID)</label>
                <input
                  type="text"
                  placeholder="Tự động sinh khi để trống"
                  value={checkInForm.cardNumber}
                  onChange={(e) =>
                    setCheckInForm((prev) => ({ ...prev, cardNumber: e.target.value }))
                  }
                />
              </div>

              <div className="form-group" style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checkInForm.isMonthly}
                    onChange={(e) =>
                      setCheckInForm((prev) => ({ ...prev, isMonthly: e.target.checked }))
                    }
                  />
                  Vé tháng (Subscription)
                </label>
              </div>
            </div>

            {autoCheckIn ? (
              <div style={{ marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => triggerAutoCheckIn()}
                  className="btn"
                  style={{ width: '100%', background: 'linear-gradient(135deg, var(--primary), #4f46e5)' }}
                >
                  <i className="fa-solid fa-bolt"></i> ⚡ Thực Hiện Check-In Tự Động (Auto Run)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={runAICheckInAnalysis}
                  className="btn btn-secondary"
                  style={{ flexGrow: 1 }}
                >
                  <i className="fa-solid fa-microchip"></i> 1. Phân Tích Vị Trí AI
                </button>
                <button
                  type="button"
                  disabled={!selectedWinner}
                  onClick={confirmCheckIn}
                  className="btn"
                  style={{ flexGrow: 1 }}
                >
                  <i className="fa-solid fa-circle-check"></i> 2. Xác Nhận Check-In
                </button>
              </div>
            )}
          </div>

          {/* AI results table */}
          {aiScoringResults && (
            <div style={{ marginTop: '8px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 'bold' }}>
                KẾT QUẢ ĐÁNH GIÁ THUẬT TOÁN TỐI ƯU CỦA AI:
              </h4>
              <div className="ai-table-wrapper" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Ô Đỗ</th>
                      <th>Khoảng Cách</th>
                      <th>Tầng</th>
                      <th>Tải Trọng</th>
                      <th>Vé gửi</th>
                      <th>Điểm AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiScoringResults.map((candidate, idx) => (
                      <tr
                        key={candidate.slot.slotNumber}
                        className={idx === 0 ? 'winning' : ''}
                      >
                        <td>
                          {candidate.slot.slotNumber}{' '}
                          {idx === 0 && '👑'}
                        </td>
                        <td>{candidate.distScore} ({candidate.slot.distanceMetric}m)</td>
                        <td>{candidate.floorScore} (Tầng {candidate.slot.floorNumber})</td>
                        <td>{candidate.utilScore}</td>
                        <td>{candidate.durScore}</td>
                        <td>{candidate.finalScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Exit Gate */}
        <div className="glass-panel">
          <div className="panel-header">
            <h2>🔴 Cổng Ra (Exit Lane - Check-Out)</h2>
          </div>

          <div className="cam-simulation">
            <div className="cam-header">
              <span>ANPR CAMERA FEED [EXIT_01]</span>
              <span className="cam-rec">REC</span>
            </div>
            {checkOutPlateOrCard ? (
              <div className="cam-feed">{checkOutPlateOrCard.toUpperCase()}</div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                Quét thẻ từ hoặc biển số để kiểm cước...
              </div>
            )}
          </div>

          {/* Barrier */}
          <div className={`barrier-bar ${gateOpenCheckOut ? 'open' : ''}`}>
            <i className="fa-solid fa-traffic-light" style={{ marginRight: '8px', color: gateOpenCheckOut ? 'var(--success)' : 'var(--danger)' }}></i>
            <span>Thanh chắn cổng ra: {gateOpenCheckOut ? 'ĐANG MỞ (GO)' : 'ĐANG ĐÓNG (WAIT)'}</span>
            <div className="barrier-gate-arm"></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label>Nhập Biển Số Xe / Quét Thẻ Từ Cần Ra</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Ví dụ: 30A-12345"
                  value={checkOutPlateOrCard}
                  onChange={(e) => setCheckOutPlateOrCard(e.target.value.toUpperCase())}
                />
                <button onClick={searchCheckOutSession} className="btn btn-secondary">
                  Tính Cước
                </button>
              </div>
            </div>

            {checkoutInvoice && (
              <div className="invoice-card">
                <div className="invoice-title">HÓA ĐƠN GỬI XE THỜI GIAN THỰC</div>
                <div className="invoice-row">
                  <span>Biển số xe:</span>
                  <strong>{checkoutInvoice.session.licensePlate}</strong>
                </div>
                <div className="invoice-row">
                  <span>Vị trí ô đỗ:</span>
                  <strong>{checkoutInvoice.session.slotNumber}</strong>
                </div>
                <div className="invoice-row">
                  <span>Giờ vào bãi:</span>
                  <span>{checkoutInvoice.inTime}</span>
                </div>
                <div className="invoice-row">
                  <span>Giờ ra bãi:</span>
                  <span>{checkoutInvoice.outTime}</span>
                </div>
                <div className="invoice-row">
                  <span>Tổng thời gian gửi:</span>
                  <span>
                    {checkoutInvoice.elapsedMinutes} phút (Làm tròn thành {checkoutInvoice.elapsedHours} giờ)
                  </span>
                </div>
                <div className="invoice-row">
                  <span>Đơn giá theo giờ:</span>
                  <span>{checkoutInvoice.ratePerHour.toLocaleString('vi-VN')} đ/giờ</span>
                </div>
                <div className="invoice-row total-line">
                  <span>Thành tiền thanh toán:</span>
                  <span className="price">{checkoutInvoice.totalFee.toLocaleString('vi-VN')} đ</span>
                </div>

                <button onClick={confirmCheckOut} className="btn" style={{ marginTop: '8px' }}>
                  <i className="fa-solid fa-credit-card"></i> Xác Nhận Thanh Toán & Mở Cổng
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2><i className="fa-solid fa-list-check"></i> Danh Sách Phiên Gửi Xe Đang Hoạt Động trong bãi</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Biển Số Xe</th>
                <th>Thẻ Từ</th>
                <th>Loại Xe</th>
                <th>Vị Trí Đỗ</th>
                <th>Thời Gian Vào Bãi</th>
                <th>Trạng Thái</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {sessions
                .filter((s) => s.status === 'Active')
                .map((session) => (
                  <tr key={session.correlationId}>
                    <td><strong>{session.licensePlate}</strong></td>
                    <td><code>{session.cardNumber}</code></td>
                    <td>
                      {session.vehicleTypeId === 2 && 'Sedan'}
                      {session.vehicleTypeId === 3 && 'SUV'}
                      {session.vehicleTypeId === 4 && 'Xe Điện'}
                    </td>
                    <td>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                        {slots.find((s) => s.id === (session.allocatedSlotId || session.AllocatedSlotId))?.slotNumber || 'Đang phân bổ...'}
                      </span>
                    </td>
                    <td>{new Date(session.checkInTime).toLocaleString('vi-VN')}</td>
                    <td>
                      <span className="status-indicator" style={{ padding: '2px 8px', fontSize: '11px', display: 'inline-block' }}>
                        Đang đỗ
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => autofillCheckOut(session)}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          Check-out
                        </button>
                        <button
                          onClick={() => triggerReportException(session)}
                          className="btn btn-danger"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          🚨 Báo sự cố
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {sessions.filter((s) => s.status === 'Active').length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có xe nào đang đỗ trong bãi!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception logs / History */}
      {sessions.filter((s) => s.status === 'Exception' || s.status === 'Completed').length > 0 && (
        <div className="glass-panel">
          <div className="panel-header">
            <h2><i className="fa-solid fa-clock-rotate-left"></i> Lịch Sử Phiên Gửi Xe & Biên Bản Ngoại Lệ</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Biển Số Xe</th>
                  <th>Vị Trí Đỗ</th>
                  <th>Thời Gian Ra</th>
                  <th>Trạng Thái</th>
                  <th>Phí Thu</th>
                  <th>Ghi Chú Biên Bản / Notes</th>
                </tr>
              </thead>
              <tbody>
                {sessions
                  .filter((s) => s.status === 'Exception' || s.status === 'Completed')
                  .slice(0, 5)
                  .map((session) => (
                    <tr key={session.correlationId}>
                      <td>{session.licensePlate}</td>
                      <td>{session.slotNumber}</td>
                      <td>{new Date(session.checkOutTime).toLocaleString('vi-VN')}</td>
                      <td>
                        {session.status === 'Completed' ? (
                          <span style={{ color: 'var(--success)' }}>Thành Công</span>
                        ) : (
                          <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Ngoại lệ 🚨</span>
                        )}
                      </td>
                      <td>{session.totalFee.toLocaleString('vi-VN')} đ</td>
                      <td style={{ fontStyle: 'italic', fontSize: '12px' }}>
                        {session.notes || 'Thanh toán bình thường qua cổng.'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
