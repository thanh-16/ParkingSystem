const BASE_URL = 'http://localhost:5125';

const getHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  checkHealth: async () => {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  },

  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Đăng nhập thất bại!');
    }
    return res.json();
  },

  getWeights: async (token) => {
    const res = await fetch(`${BASE_URL}/api/v1/ai/weights`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Không thể tải trọng số AI.');
    return res.json();
  },

  saveWeights: async (weights, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/ai/weights`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(weights)
    });
    if (!res.ok) throw new Error('Không thể lưu trọng số AI.');
    return res.ok;
  },

  getPricingRules: async (token) => {
    const res = await fetch(`${BASE_URL}/api/v1/manager/pricing-rules`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Không thể tải bảng giá cước.');
    return res.json();
  },

  savePricingRule: async (vehicleTypeId, ratePerHour, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/manager/pricing-rules`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ vehicleTypeId, ratePerHour })
    });
    if (!res.ok) throw new Error('Không thể lưu bảng giá cước.');
    return res.ok;
  },

  getActiveSessions: async (token) => {
    const res = await fetch(`${BASE_URL}/api/v1/transaction/sessions/active`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Không thể tải các phiên đỗ xe hoạt động.');
    return res.json();
  },

  getSlots: async (token) => {
    const res = await fetch(`${BASE_URL}/api/v1/registry/slots`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Không thể tải danh sách ô đỗ.');
    return res.json();
  },

  updateSlotStatus: async (slotId, status, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/registry/slots/update-status`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ slotId, status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật trạng thái ô đỗ.');
    }
    return res.json();
  },

  batchUpdateSlotStatus: async (slotIds, status, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/registry/slots/batch-update-status`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ slotIds, status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật hàng loạt trạng thái ô đỗ.');
    }
    return res.json();
  },

  checkIn: async (cardNumber, licensePlate, vehicleTypeId, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/transaction/check-in`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ cardNumber, licensePlate, vehicleTypeId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể thực hiện Check-In.');
    }
    return res.json();
  },

  checkOut: async (cardNumber, licensePlate, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/transaction/check-out`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ cardNumber, licensePlate })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể thực hiện Check-Out.');
    }
    return res.json();
  },

  reportException: async (sessionId, notes, fee, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/staff/sessions/${sessionId}/exceptions`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ notes, fineAmount: fee })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể ghi nhận sự cố.');
    }
    return res.json();
  },

  createBooking: async (licensePlate, vehicleTypeId, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/driver/bookings`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ licensePlate, vehicleTypeId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể đặt chỗ.');
    }
    return res.json();
  },

  getCurrentSession: async (licensePlate, token) => {
    const res = await fetch(`${BASE_URL}/api/v1/driver/sessions/current?licensePlate=${licensePlate}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không tìm thấy phiên đỗ xe của phương tiện.');
    }
    return res.json();
  },

  setupRegistry: async (token) => {
    const res = await fetch(`${BASE_URL}/api/v1/registry/setup`, {
      method: 'POST',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Không thể khởi tạo dữ liệu mẫu.');
    return res.json();
  }
};
