import { useState } from 'react';

export default function Dashboard({
  slots,
  revenue,
  sessions,
  selectedFloor,
  setSelectedFloor,
  setSelectedSlotDetails,
  handleBatchToggleMaintenanceForFloor,
  maintenanceSearch,
  setMaintenanceSearch,
  maintenanceFilter,
  setMaintenanceFilter,
  aiWeights,
  handleWeightChange,
  saveAiWeights,
  pricingRules,
  setPricingRules,
  savePricingRule,
  mode,
  runLiveDbSetup,
  user,
  handleToggleMaintenance
}) {
  const carSlots = slots || [];
  const f1Total = carSlots.filter(s => s.floorNumber === 1).length;
  const f1Occupied = carSlots.filter(s => s.floorNumber === 1 && s.status === 'Occupied').length;
  const f1Available = carSlots.filter(s => s.floorNumber === 1 && s.status === 'Available').length;
  const f1Reserved = carSlots.filter(s => s.floorNumber === 1 && s.status === 'Reserved').length;

  const f2Total = carSlots.filter(s => s.floorNumber === 2).length;
  const f2Occupied = carSlots.filter(s => s.floorNumber === 2 && s.status === 'Occupied').length;
  const f2Available = carSlots.filter(s => s.floorNumber === 2 && s.status === 'Available').length;
  const f2Reserved = carSlots.filter(s => s.floorNumber === 2 && s.status === 'Reserved').length;

  const f3Total = carSlots.filter(s => s.floorNumber === 3).length;
  const f3Occupied = carSlots.filter(s => s.floorNumber === 3 && s.status === 'Occupied').length;
  const f3Available = carSlots.filter(s => s.floorNumber === 3 && s.status === 'Available').length;
  const f3Reserved = carSlots.filter(s => s.floorNumber === 3 && s.status === 'Reserved').length;

  const mbTotal = 200;
  const seconds = new Date().getSeconds();
  const mbOccupied = 85 + (seconds % 6);
  const mbAvailable = mbTotal - mbOccupied;

  return (
    <>
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="icon-box cyan">
            <i className="fa-solid fa-car"></i>
          </div>
          <div className="data">
            <h3>Số ô đỗ đã chiếm dụng</h3>
            <h2>{slots.filter((s) => s.status === 'Occupied').length} / {slots.length}</h2>
            <p>Còn lại {slots.filter((s) => s.status === 'Available').length} ô trống</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="icon-box green">
            <i className="fa-solid fa-chart-pie"></i>
          </div>
          <div className="data">
            <h3>Tỷ lệ lấp đầy</h3>
            <h2>{slots.length ? Math.round((slots.filter((s) => s.status === 'Occupied').length / slots.length) * 100) : 0}%</h2>
            <p>Phân phối đa tầng thông minh</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="icon-box gold">
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
          <div className="data">
            <h3>Doanh thu trong ngày</h3>
            <h2>{revenue.toLocaleString('vi-VN')} đ</h2>
            <p>Giá cước tự động theo DB</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="icon-box red">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="data">
            <h3>Sự cố ngoại lệ (Active)</h3>
            <h2>{sessions.filter((s) => s.status === 'Exception').length}</h2>
            <p>Cần Staff xử lý thủ công</p>
          </div>
        </div>
      </div>

      {/* Capacity Statistics Panel */}
      <div className="glass-panel" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', color: 'var(--text)' }}>
          <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--accent)' }}></i>
          Thống kê sức chứa đa tầng & Phân loại phương tiện
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
          {/* Floor 1 */}
          <div style={{ borderLeft: '4px solid var(--accent)', paddingLeft: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text)' }}>Tầng 1 (Ô tô Sedan)</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
              <div>Sức chứa: <strong style={{ color: 'var(--text)' }}>{f1Total}</strong> chỗ</div>
              <div>Đang đỗ: <strong style={{ color: 'var(--danger)' }}>{f1Occupied}</strong></div>
              <div>Đặt giữ: <strong style={{ color: 'var(--warning)' }}>{f1Reserved}</strong></div>
              <div>Còn trống: <strong style={{ color: 'var(--success)' }}>{f1Available}</strong></div>
            </div>
          </div>
          {/* Floor 2 */}
          <div style={{ borderLeft: '4px solid #a855f7', paddingLeft: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text)' }}>Tầng 2 (Ô tô SUV)</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
              <div>Sức chứa: <strong style={{ color: 'var(--text)' }}>{f2Total}</strong> chỗ</div>
              <div>Đang đỗ: <strong style={{ color: 'var(--danger)' }}>{f2Occupied}</strong></div>
              <div>Đặt giữ: <strong style={{ color: 'var(--warning)' }}>{f2Reserved}</strong></div>
              <div>Còn trống: <strong style={{ color: 'var(--success)' }}>{f2Available}</strong></div>
            </div>
          </div>
          {/* Floor 3 */}
          <div style={{ borderLeft: '4px solid #14b8a6', paddingLeft: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text)' }}>Tầng 3 (Ô tô Điện EV)</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
              <div>Sức chứa: <strong style={{ color: 'var(--text)' }}>{f3Total}</strong> chỗ</div>
              <div>Đang đỗ: <strong style={{ color: 'var(--danger)' }}>{f3Occupied}</strong></div>
              <div>Đặt giữ: <strong style={{ color: 'var(--warning)' }}>{f3Reserved}</strong></div>
              <div>Còn trống: <strong style={{ color: 'var(--success)' }}>{f3Available}</strong></div>
            </div>
          </div>
          {/* Motorbikes */}
          <div style={{ borderLeft: '4px solid #f43f5e', paddingLeft: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text)' }}>Khu vực Xe Máy (B1/B2)</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
              <div>Sức chứa: <strong style={{ color: 'var(--text)' }}>{mbTotal}</strong> chỗ</div>
              <div>Đang đỗ: <strong style={{ color: 'var(--danger)' }}>{mbOccupied}</strong></div>
              <div>Còn trống: <strong style={{ color: 'var(--success)' }}>{mbAvailable}</strong></div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>Không quản lý lối vào</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-split-layout">
        {/* Real-time map */}
        <div className="glass-panel">
          <div className="panel-header">
            <h2><i className="fa-solid fa-layer-group"></i> Sơ đồ vị trí bãi gửi xe</h2>
            <div className="floor-selector">
              <button
                className={`floor-btn ${selectedFloor === 1 ? 'active' : ''}`}
                onClick={() => setSelectedFloor(1)}
              >
                Tầng 1 (Sedan)
              </button>
              <button
                className={`floor-btn ${selectedFloor === 2 ? 'active' : ''}`}
                onClick={() => setSelectedFloor(2)}
              >
                Tầng 2 (SUV)
              </button>
              <button
                className={`floor-btn ${selectedFloor === 3 ? 'active' : ''}`}
                onClick={() => setSelectedFloor(3)}
              >
                Tầng 3 (EV)
              </button>
            </div>
          </div>

          <div className="slots-grid">
            {slots
              .filter((s) => s.floorNumber === selectedFloor)
              .map((slot) => (
                <div
                  key={slot.id}
                  onClick={() => {
                    setSelectedSlotDetails(slot);
                  }}
                  className={`slot-item ${
                    slot.status === 'Available'
                      ? 'available'
                      : slot.status === 'Occupied'
                      ? 'occupied'
                      : slot.status === 'Reserved'
                      ? 'reserved'
                      : 'maintenance'
                  }`}
                >
                  <span className="number">{slot.slotNumber}</span>
                  <span className="dist">{slot.distanceMetric}m</span>
                  <span className="status-text">
                    {slot.status === 'Available' && 'Trống'}
                    {slot.status === 'Occupied' && (slot.occupiedBy || 'Đỗ xe')}
                    {slot.status === 'Reserved' && 'Giữ chỗ'}
                    {slot.status === 'Maintenance' && 'Bảo trì'}
                  </span>
                </div>
              ))}
          </div>

          <div className="legend-row">
            <div className="legend-item">
              <span className="dot green"></span> Trống (Available)
            </div>
            <div className="legend-item">
              <span className="dot red"></span> Có xe (Occupied)
            </div>
            <div className="legend-item">
              <span className="dot gold"></span> Đặt trước (Reserved)
            </div>
            <div className="legend-item">
              <span className="dot cyan"></span> Bảo trì (Maintenance)
            </div>
          </div>

          <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)', borderStyle: 'dashed' }} />

          {/* Maintenance list inside Dashboard panel */}
          <div>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '15px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-screwdriver-wrench" style={{ color: 'var(--info)' }}></i>
              Bảng Quản Lý Bảo Trì & Sửa Chữa Ô Đỗ
            </h3>

            {user?.role === 'Manager' && (
              <div style={{
                display: 'flex',
                gap: '12px',
                background: 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '14px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '11.5px', fontWeight: 'bold' }}>
                  Thao tác nhanh cho {selectedFloor === -1 ? 'Tầng B1' : `Tầng ${selectedFloor}`}:
                </span>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  <button
                    onClick={() => handleBatchToggleMaintenanceForFloor(selectedFloor, true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '10.5px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'var(--info)', color: 'var(--info)' }}
                  >
                    <i className="fa-solid fa-wrench"></i> Bảo trì cả tầng (chỉ ô trống)
                  </button>
                  <button
                    onClick={() => handleBatchToggleMaintenanceForFloor(selectedFloor, false)}
                    className="btn"
                    style={{ fontSize: '10.5px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success)' }}
                  >
                    <i className="fa-solid fa-circle-check"></i> Khôi phục cả tầng
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Tìm nhanh ô đỗ..."
                value={maintenanceSearch}
                onChange={(e) => setMaintenanceSearch(e.target.value.toUpperCase())}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  color: 'white',
                  borderRadius: '6px',
                  width: '140px'
                }}
              />

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['All', 'Available', 'Occupied', 'Reserved', 'Maintenance'].map((st) => (
                  <button
                    key={st}
                    className={`floor-btn ${maintenanceFilter === st ? 'active' : ''}`}
                    onClick={() => setMaintenanceFilter(st)}
                    style={{ padding: '3px 8px', fontSize: '10.5px', borderRadius: '5px' }}
                  >
                    {st === 'All' && 'Tất cả'}
                    {st === 'Available' && 'Trống'}
                    {st === 'Occupied' && 'Đỗ xe'}
                    {st === 'Reserved' && 'Giữ chỗ'}
                    {st === 'Maintenance' && 'Bảo trì'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '220px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
              <table className="pricing-table" style={{ fontSize: '12px', margin: 0 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '8px' }}>Mã Ô Đỗ</th>
                    <th style={{ padding: '8px' }}>Tầng</th>
                    <th style={{ padding: '8px' }}>Trạng Thái</th>
                    <th style={{ padding: '8px' }}>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {slots
                    .filter(s => {
                      if (maintenanceSearch && !s.slotNumber.includes(maintenanceSearch)) return false;
                      if (maintenanceFilter !== 'All' && s.status !== maintenanceFilter) return false;
                      return true;
                    })
                    .map((slot) => (
                      <tr key={slot.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '6px 8px' }}><strong>{slot.slotNumber}</strong></td>
                        <td style={{ padding: '6px 8px' }}>{slot.floorNumber === -1 ? 'B1' : `Tầng ${slot.floorNumber}`}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span className="status-indicator" style={{
                            border: 'none',
                            padding: '2px 6px',
                            fontSize: '10.5px',
                            background: slot.status === 'Available' ? 'rgba(16, 185, 129, 0.08)' :
                                        slot.status === 'Occupied' ? 'rgba(239, 68, 68, 0.08)' :
                                        slot.status === 'Reserved' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(6, 182, 212, 0.08)',
                            color: slot.status === 'Available' ? 'var(--success)' :
                                   slot.status === 'Occupied' ? 'var(--danger)' :
                                   slot.status === 'Reserved' ? 'var(--warning)' : 'var(--info)'
                          }}>
                            {slot.status === 'Available' && 'Trống'}
                            {slot.status === 'Occupied' && 'Đỗ xe'}
                            {slot.status === 'Reserved' && 'Giữ chỗ'}
                            {slot.status === 'Maintenance' && 'Bảo trì'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {(!user || user.role === 'Manager' || user.role === 'Staff') && (
                            <>
                              {slot.status === 'Available' && (
                                <button
                                  onClick={() => handleToggleMaintenance(slot, true)}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '10px', padding: '2px 6px', borderColor: 'var(--info)', color: 'var(--info)' }}
                                >
                                  <i className="fa-solid fa-wrench"></i> Bảo trì
                                </button>
                              )}
                              {slot.status === 'Maintenance' && (
                                <button
                                  onClick={() => handleToggleMaintenance(slot, false)}
                                  className="btn"
                                  style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--success)' }}
                                >
                                  <i className="fa-solid fa-circle-check"></i> Sẵn dùng
                                </button>
                              )}
                              {slot.status === 'Occupied' && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Có xe đỗ</span>
                              )}
                              {slot.status === 'Reserved' && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Đã đặt chỗ</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  {slots.filter(s => {
                    if (maintenanceSearch && !s.slotNumber.includes(maintenanceSearch)) return false;
                    if (maintenanceFilter !== 'All' && s.status !== maintenanceFilter) return false;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                        Không tìm thấy ô đỗ nào khớp!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar panels for settings (AI & Pricing) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {user?.role === 'Manager' ? (
            <>
              {/* AI Panel */}
              <div className="glass-panel">
                <div className="panel-header">
                  <h2><i className="fa-solid fa-brain"></i> Trọng Số Phân Bổ AI</h2>
                </div>
                <div className="alert-box info">
                  Tổng trọng số ($w_1 + w_2 + w_3 + w_4$) phải bằng <strong>1.0 (100%)</strong>.
                  Hệ thống tự động cân bằng các giá trị còn lại khi kéo thanh trượt.
                </div>

                <div className="slider-group">
                  <div className="slider-header">
                    <span>$w_1$: Khoảng cách gần cổng (Distance)</span>
                    <span>{Math.round(aiWeights.w1 * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiWeights.w1}
                    onChange={(e) => handleWeightChange('w1', e.target.value)}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-header">
                    <span>$w_2$: Độ cao tầng đỗ thấp (Floor Level)</span>
                    <span>{Math.round(aiWeights.w2 * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiWeights.w2}
                    onChange={(e) => handleWeightChange('w2', e.target.value)}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-header">
                    <span>$w_3$: Cân bằng tải phân phối (Utilization)</span>
                    <span>{Math.round(aiWeights.w3 * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiWeights.w3}
                    onChange={(e) => handleWeightChange('w3', e.target.value)}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-header">
                    <span>$w_4$: Loại vé - Ngắn / Dài hạn (Duration)</span>
                    <span>{Math.round(aiWeights.w4 * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiWeights.w4}
                    onChange={(e) => handleWeightChange('w4', e.target.value)}
                  />
                </div>

                <button onClick={saveAiWeights} className="btn" style={{ width: '100%', marginTop: '12px' }}>
                  <i className="fa-solid fa-floppy-disk"></i> Cập Nhật Trọng Số AI
                </button>
              </div>

              {/* Pricing Panel */}
              <div className="glass-panel">
                <div className="panel-header">
                  <h2><i className="fa-solid fa-tags"></i> Bảng Cước Phí Động (Database Rules)</h2>
                </div>
                <table className="pricing-table">
                  <thead>
                    <tr>
                      <th>Loại Xe</th>
                      <th>Đơn Giá / Giờ</th>
                      <th>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingRules.map((rule) => (
                      <tr key={rule.vehicleTypeId}>
                        <td>{rule.name}</td>
                        <td>
                          <input
                            type="number"
                            style={{
                              width: '80px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-color)',
                              color: 'white',
                              padding: '4px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                            value={rule.ratePerHour}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPricingRules((prev) =>
                                prev.map((r) =>
                                  r.vehicleTypeId === rule.vehicleTypeId ? { ...r, ratePerHour: val } : r
                                )
                              );
                            }}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => savePricingRule(rule.vehicleTypeId, rule.ratePerHour)}
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            Cập Nhật
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Setup DB Panel */}
              <div className="glass-panel">
                <div className="panel-header">
                  <h2><i className="fa-solid fa-database"></i> Khởi Tạo Cơ Sở Dữ Liệu</h2>
                </div>
                <div className="alert-box info" style={{ fontSize: '11.5px', marginBottom: '8px' }}>
                  Nếu cơ sở dữ liệu trống (mới khởi chạy lần đầu), hãy bấm nút dưới đây để tạo tự động 4 tầng với 55 ô đỗ xe mẫu trên hệ thống Live DB.
                </div>
                <button
                  disabled={mode !== 'live'}
                  onClick={runLiveDbSetup}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  <i className="fa-solid fa-server"></i> Khởi Tạo Dữ Liệu Bãi Xe (Seed Live)
                </button>
              </div>
            </>
          ) : (
            /* Non-Manager Informative Panel */
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--info)' }}>
              <div className="panel-header">
                <h2><i className="fa-solid fa-user-shield"></i> Phân Quyền Hệ Thống</h2>
              </div>
              <div className="alert-box info" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <p>Tài khoản hiện tại: <strong>{user?.fullName}</strong> ({user?.role === 'Staff' ? 'Nhân Viên Cổng' : user?.role})</p>
                <hr style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.06)' }} />
                <p style={{ color: 'var(--text-muted)' }}>
                  Bạn đang sử dụng quyền Nhân Viên Cổng. Các chức năng quản trị sau đây đã được ẩn để đảm bảo tính an toàn hệ thống:
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>⚙️ Cấu hình trọng số tối ưu hóa AI</li>
                  <li>💰 Điều chỉnh đơn giá cước động trong Database</li>
                  <li>💾 Khởi tạo / Setup lại cơ sở dữ liệu hệ thống</li>
                  <li>🔧 Bảo trì / Khôi phục nhanh toàn bộ sàn</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
