import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StaffConsole from './components/StaffConsole';
import DriverPortal from './components/DriverPortal';


const INITIAL_SLOTS = [

  ...Array.from({ length: 15 }, (_, i) => ({
    id: `slot-f1-${i + 1}`,
    slotNumber: `F1-C${(i + 1).toString().padStart(2, '0')}`,
    floorNumber: 1,
    allowedVehicleTypeId: 2,
    distanceMetric: (i + 1) * 4,
    status: i === 2 ? 'Occupied' : 'Available',
    occupiedBy: i === 2 ? '30A-12345' : null,
    bookingId: null
  })),

  ...Array.from({ length: 10 }, (_, i) => ({
    id: `slot-f2-${i + 1}`,
    slotNumber: `F2-S${(i + 1).toString().padStart(2, '0')}`,
    floorNumber: 2,
    allowedVehicleTypeId: 3,
    distanceMetric: (i + 1) * 5,
    status: i === 1 ? 'Occupied' : 'Available',
    occupiedBy: i === 1 ? '29C-56789' : null,
    bookingId: null
  })),

  ...Array.from({ length: 10 }, (_, i) => ({
    id: `slot-f3-${i + 1}`,
    slotNumber: `F3-E${(i + 1).toString().padStart(2, '0')}`,
    floorNumber: 3,
    allowedVehicleTypeId: 4,
    distanceMetric: (i + 1) * 6,
    status: 'Available',
    occupiedBy: null,
    bookingId: null
  }))
];

const INITIAL_PRICING = [
  { vehicleTypeId: 2, ratePerHour: 15000, name: 'Compact/Sedan' },
  { vehicleTypeId: 3, ratePerHour: 25000, name: 'SUV/Crossover' },
  { vehicleTypeId: 4, ratePerHour: 20000, name: 'Xe Điện EV' }
];

const INITIAL_WEIGHTS = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

const INITIAL_SESSIONS = [
  {
    correlationId: 'session-12345678-1111-1111-1111-111111111111',
    licensePlate: '30A-12345',
    vehicleTypeId: 2,
    slotNumber: 'F1-C03',
    cardNumber: 'CARD-101',
    checkInTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    checkOutTime: null,
    status: 'Active',
    notes: null,
    totalFee: 0
  },
  {
    correlationId: 'session-87654321-2222-2222-2222-222222222222',
    licensePlate: '29C-56789',
    vehicleTypeId: 3,
    slotNumber: 'F2-S02',
    cardNumber: 'CARD-102',
    checkInTime: new Date(Date.now() - 1.2 * 60 * 60 * 1000).toISOString(),
    checkOutTime: null,
    status: 'Active',
    notes: null,
    totalFee: 0
  }
];

function App() {

  const [user, setUser] = useState({ username: 'driver1', fullName: 'Phạm Văn C', role: 'Driver' });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState(() => localStorage.getItem('pbms_mode') || 'live');
  const [apiOnline, setApiOnline] = useState(false);
  const [walletBalance, setWalletBalance] = useState(100000);


  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedFloor, setSelectedFloor] = useState(1);


  const [slots, setSlots] = useState(() => {
    const saved = localStorage.getItem('pbms_slots');
    return saved ? JSON.parse(saved) : INITIAL_SLOTS;
  });
  const [pricingRules, setPricingRules] = useState(INITIAL_PRICING);
  const [aiWeights, setAiWeights] = useState(INITIAL_WEIGHTS);
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('pbms_sessions');
    return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
  });
  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('pbms_bookings');
    return saved ? JSON.parse(saved) : [];
  });
  const [revenue, setRevenue] = useState(40000);


  const [checkInForm, setCheckInForm] = useState({
    licensePlate: '',
    vehicleTypeId: 2,
    isMonthly: false,
    cardNumber: ''
  });
  const [aiScoringResults, setAiScoringResults] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [gateOpenCheckIn, setGateOpenCheckIn] = useState(false);


  const [checkOutPlateOrCard, setCheckOutPlateOrCard] = useState('');
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const [gateOpenCheckOut, setGateOpenCheckOut] = useState(false);


  const [showExceptionModal, setShowExceptionModal] = useState(null);
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [exceptionFee, setExceptionFee] = useState(0);


  const [driverActiveTab, setDriverActiveTab] = useState('book');
  const [driverPlate, setDriverPlate] = useState('');
  const [driverBookingForm, setDriverBookingForm] = useState({
    licensePlate: '',
    vehicleTypeId: 2
  });
  const [driverBookingSuccess, setDriverBookingSuccess] = useState(null);
  const [driverActiveSession, setDriverActiveSession] = useState(null);


  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [maintenanceFilter, setMaintenanceFilter] = useState('All');


  const [toasts, setToasts] = useState([]);

  // Tự động đồng bộ chế độ hoạt động (Mode) và trạng thái Offline giữa các tab
  useEffect(() => {
    localStorage.setItem('pbms_mode', mode);
  }, [mode]);

  useEffect(() => {
    if (mode === 'offline') {
      localStorage.setItem('pbms_slots', JSON.stringify(slots));
    }
  }, [slots, mode]);

  useEffect(() => {
    if (mode === 'offline') {
      localStorage.setItem('pbms_sessions', JSON.stringify(sessions));
    }
  }, [sessions, mode]);

  useEffect(() => {
    if (mode === 'offline') {
      localStorage.setItem('pbms_bookings', JSON.stringify(bookings));
    }
  }, [bookings, mode]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pbms_mode' && e.newValue) {
        setMode(e.newValue);
      }
      if (mode === 'offline') {
        if (e.key === 'pbms_slots' && e.newValue) {
          try { setSlots(JSON.parse(e.newValue)); } catch (err) {}
        }
        if (e.key === 'pbms_sessions' && e.newValue) {
          try { setSessions(JSON.parse(e.newValue)); } catch (err) {}
        }
        if (e.key === 'pbms_bookings' && e.newValue) {
          try { setBookings(JSON.parse(e.newValue)); } catch (err) {}
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [mode]);


  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [ledScreenData, setLedScreenData] = useState(null);


  useEffect(() => {
    const channel = new BroadcastChannel('pbms_anpr_channel');
    channel.onmessage = (event) => {
      const { licensePlate, vehicleTypeId, isMonthly } = event.data;
      addToast(`[CAMERA ANPR] Phát hiện phương tiện: ${licensePlate}`, 'info');

      setCheckInForm({
        licensePlate,
        vehicleTypeId,
        isMonthly: !!isMonthly,
        cardNumber: `CARD-${Math.floor(Math.random() * 900) + 100}`
      });


      if (autoCheckIn) {
        setTimeout(() => {
          triggerAutoCheckIn(licensePlate, vehicleTypeId);
        }, 800);
      }
    };
    return () => channel.close();
  }, [autoCheckIn, slots, bookings, mode, token, sessions]);


  useEffect(() => {
    let interval;
    if (mode === 'live') {
      const checkLiveStatus = async () => {
        try {
          const res = await fetch('http://localhost:5125/health');
          if (res.ok) {
            setApiOnline(true);

            syncLiveConfig();
          } else {
            setApiOnline(false);
          }
        } catch (e) {
          setApiOnline(false);
        }
      };
      checkLiveStatus();
      interval = setInterval(checkLiveStatus, 10000);
    } else {
      setApiOnline(false);
    }
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode === 'live' && user && !token) {
      const fetchToken = async () => {
        try {
          const res = await fetch('http://localhost:5125/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, password: '123' })
          });
          if (res.ok) {
            const data = await res.json();
            const tokenVal = data.token || data.Token;
            if (tokenVal) {
              setToken(tokenVal);
              addToast(`[Live API] Tự động đồng bộ token cho ${user.fullName}`, 'success');
            }
          }
        } catch (e) {
          // Silent catch
        }
      };
      fetchToken();
    }
  }, [mode, user, token]);

  useEffect(() => {
    if (mode === 'live' && token) {
      syncLiveConfig();
      const interval = setInterval(() => {
        syncLiveConfig();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [mode, token]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };


  const syncLiveConfig = async () => {
    try {

      const wRes = await fetch('http://localhost:5125/api/v1/ai/weights', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (wRes.ok) {
        const weights = await wRes.json();
        setAiWeights(weights);
      }


      const pRes = await fetch('http://localhost:5125/api/v1/manager/pricing-rules', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (pRes.ok) {
        const rules = await pRes.json();
        setPricingRules((prev) =>
          prev.map((p) => {
            const rule = rules.find((r) => r.vehicleTypeId === p.vehicleTypeId);
            return rule ? { ...p, ratePerHour: rule.ratePerHour } : p;
          })
        );
      }


      let activeSessions = [];
      const sRes = await fetch('http://localhost:5125/api/v1/transaction/sessions/active', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (sRes.ok) {
        const liveSessions = await sRes.json();
        setSessions(liveSessions);
        activeSessions = liveSessions;
      }

      if (token) {
        const wbRes = await fetch('http://localhost:5125/api/v1/driver/wallet', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (wbRes.ok) {
          const wallet = await wbRes.json();
          setWalletBalance(wallet.balance);
        }
      }

      const bRes = await fetch('http://localhost:5125/api/v1/driver/bookings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (bRes.ok) {
        const liveBookings = await bRes.json();
        const formatted = liveBookings.map((b) => ({
          id: b.id,
          licensePlate: b.licensePlate,
          vehicleTypeId: b.vehicleTypeId,
          slotNumber: b.slotNumber,
          bookingTime: new Date(b.bookingTimeUtc).toLocaleString('vi-VN'),
          status: b.status
        }));
        setBookings(formatted);
      }


      const slRes = await fetch('http://localhost:5125/api/v1/registry/slots', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (slRes.ok) {
        const liveSlots = await slRes.json();
        setSlots((prev) =>
          prev.map((s) => {
            const lSlot = liveSlots.find((ls) => ls.slotNumber === s.slotNumber);
            if (lSlot) {
              const matchedSession = activeSessions.find(
                (sess) => (sess.allocatedSlotId || sess.AllocatedSlotId) === lSlot.id && (sess.status === 'Active' || sess.Status === 'Active')
              );

              let mappedStatus = 'Available';
              if (lSlot.status === 1 || lSlot.status === 'Occupied') mappedStatus = 'Occupied';
              else if (lSlot.status === 2 || lSlot.status === 'Reserved') mappedStatus = 'Reserved';
              else if (lSlot.status === 3 || lSlot.status === 'Maintenance') mappedStatus = 'Maintenance';

              // CRITICAL FIX: If there's an active session pointing to this slot,
              // force status to Occupied regardless of Registry DB status
              if (matchedSession) {
                mappedStatus = 'Occupied';
              }

              const allowedVTypeId = lSlot.floor 
                ? (lSlot.floor.allowedVehicleTypeId !== undefined ? lSlot.floor.allowedVehicleTypeId : lSlot.floor.AllowedVehicleTypeId)
                : s.allowedVehicleTypeId;

              const floorNum = lSlot.floor 
                ? (lSlot.floor.floorNumber !== undefined ? lSlot.floor.floorNumber : lSlot.floor.FloorNumber)
                : s.floorNumber;

              return {
                ...s,
                id: lSlot.id,
                floorId: lSlot.floorId,
                floorNumber: floorNum,
                allowedVehicleTypeId: allowedVTypeId,
                status: mappedStatus,
                distanceMetric: lSlot.distanceMetric,
                occupiedBy: matchedSession 
                  ? (matchedSession.licensePlate || matchedSession.LicensePlate) 
                  : null
              };
            }
            return s;
          })
        );
      }
    } catch (e) {
      console.error('Error syncing live config:', e);
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      addToast('Vui lòng nhập đầy đủ thông tin đăng nhập!', 'error');
      return;
    }

    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
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
            addToast(`Chào mừng trở lại, ${userVal.fullName || userVal.FullName}! (Live API)`, 'success');
            syncLiveConfig();
          } else {
            addToast('Không thể lấy thông tin xác thực hợp lệ từ server!', 'error');
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Đăng nhập không thành công!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối cổng API Gateway! Vui lòng thử lại.', 'error');
      }
    } else {

      if (username === 'manager1' && password === 'password') {
        setUser({ username: 'manager1', fullName: 'Nguyễn Văn A', role: 'Manager' });
        addToast('Đăng nhập thành công với vai trò Quản lý! (Offline Simulation)', 'success');
      } else if (username === 'staff1' && password === 'password') {
        setUser({ username: 'staff1', fullName: 'Trần Thị B', role: 'Staff' });
        addToast('Đăng nhập thành công với vai trò Nhân viên! (Offline Simulation)', 'success');
      } else if (username === 'driver1' && password === 'password') {
        setUser({ username: 'driver1', fullName: 'Phạm Văn C', role: 'Driver' });
        addToast('Đăng nhập thành công với vai trò Lái xe! (Offline Simulation)', 'success');
      } else {
        addToast('Sai thông tin tài khoản demo. Thử: manager1/password', 'warning');
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    addToast('Đăng xuất thành công!', 'info');
  };


  const handleWeightChange = (field, val) => {
    const numVal = parseFloat(val);
    const newWeights = { ...aiWeights, [field]: numVal };

    const otherKeys = Object.keys(newWeights).filter((k) => k !== field);
    const remaining = 1.0 - numVal;
    const currentOthersSum = otherKeys.reduce((acc, k) => acc + aiWeights[k], 0);

    if (currentOthersSum > 0) {
      otherKeys.forEach((k) => {
        newWeights[k] = parseFloat(((aiWeights[k] / currentOthersSum) * remaining).toFixed(2));
      });
    } else {
      otherKeys.forEach((k) => {
        newWeights[k] = parseFloat((remaining / otherKeys.length).toFixed(2));
      });
    }


    const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (sum !== 1.0) {
      newWeights[otherKeys[0]] = parseFloat((newWeights[otherKeys[0]] + (1.0 - sum)).toFixed(2));
    }

    setAiWeights(newWeights);
  };

  const saveAiWeights = async () => {
    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/ai/weights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(aiWeights)
        });
        if (res.ok) {
          addToast('Đã cập nhật cấu hình trọng số AI lên Redis (Live API)!', 'success');
        } else {
          addToast('Lỗi cập nhật cấu hình weights.', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối cổng API Gateway!', 'error');
      }
    } else {
      addToast('Đã lưu cấu hình trọng số AI cục bộ thành công!', 'success');
    }
  };


  const savePricingRule = async (vTypeId, rate) => {
    const updatedRate = parseFloat(rate);
    if (isNaN(updatedRate) || updatedRate < 0) {
      addToast('Giá tiền không hợp lệ!', 'error');
      return;
    }

    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/manager/pricing-rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ vehicleTypeId: vTypeId, ratePerHour: updatedRate })
        });
        if (res.ok) {
          addToast('Đã đồng bộ giá cước lên Database cước phí!', 'success');
          syncLiveConfig();
        } else {
          addToast('Lỗi cập nhật cước phí.', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối cổng API Gateway!', 'error');
      }
    } else {
      setPricingRules((prev) =>
        prev.map((rule) =>
          rule.vehicleTypeId === vTypeId ? { ...rule, ratePerHour: updatedRate } : rule
        )
      );
      addToast('Cập nhật bảng giá thành công (Simulation)!', 'success');
    }
  };


  const handleToggleMaintenance = async (slot, shouldBlock) => {
    const newStatusInt = shouldBlock ? 3 : 0;
    const newStatusStr = shouldBlock ? 'Maintenance' : 'Available';

    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/registry/slots/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            slotId: slot.id,
            status: newStatusInt
          })
        });

        if (res.ok) {
          addToast(`Đồng bộ thành công! Ô đỗ ${slot.slotNumber} đã được ${shouldBlock ? 'Khóa bảo trì' : 'Khôi phục trống'}.`, 'success');
          setSelectedSlotDetails(null);
          syncLiveConfig();
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Lỗi cập nhật trạng thái ô đỗ!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để cập nhật trạng thái!', 'error');
      }
    } else {

      setSlots((prev) =>
        prev.map((s) => (s.slotNumber === slot.slotNumber ? { ...s, status: newStatusStr } : s))
      );
      setSelectedSlotDetails(null);
      addToast(`Đã chuyển trạng thái ô đỗ ${slot.slotNumber} sang ${shouldBlock ? 'Bảo trì' : 'Hoạt động'} (Simulation)!`, 'warning');
    }
  };

  const handleBatchToggleMaintenanceForFloor = async (floorNum, shouldBlock) => {
    const floorSlots = slots.filter((s) => s.floorNumber === floorNum);
    const targetSlots = shouldBlock 
      ? floorSlots.filter((s) => s.status === 'Available')
      : floorSlots.filter((s) => s.status === 'Maintenance');

    if (targetSlots.length === 0) {
      addToast(`Không có ô đỗ nào phù hợp ở Tầng ${floorNum === -1 ? 'B1' : floorNum} để ${shouldBlock ? 'bảo trì' : 'khôi phục'}!`, 'info');
      return;
    }

    const newStatusInt = shouldBlock ? 3 : 0;
    const newStatusStr = shouldBlock ? 'Maintenance' : 'Available';

    if (mode === 'live') {
      try {
        const slotIds = targetSlots.map((s) => s.id);
        const res = await fetch('http://localhost:5125/api/v1/registry/slots/batch-update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            slotIds: slotIds,
            status: newStatusInt
          })
        });

        if (res.ok) {
          addToast(`Đồng bộ thành công! Đã ${shouldBlock ? 'khóa bảo trì' : 'khôi phục'} ${targetSlots.length} ô đỗ ở Tầng ${floorNum === -1 ? 'B1' : floorNum}.`, 'success');
          syncLiveConfig();
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Lỗi cập nhật trạng thái hàng loạt!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để cập nhật trạng thái hàng loạt!', 'error');
      }
    } else {
      const targetSlotNumbers = targetSlots.map((s) => s.slotNumber);
      setSlots((prev) =>
        prev.map((s) => (targetSlotNumbers.includes(s.slotNumber) ? { ...s, status: newStatusStr } : s))
      );
      addToast(`Đã ${shouldBlock ? 'khóa bảo trì' : 'khôi phục'} ${targetSlots.length} ô đỗ ở Tầng ${floorNum === -1 ? 'B1' : floorNum} (Simulation)!`, 'success');
    }
  };


  const calculateOfflineAIScores = (vehicleTypeId, isMonthly) => {

    let candidateSlots = slots.filter(
      (s) => s.allowedVehicleTypeId === vehicleTypeId && s.status === 'Available'
    );

    // Fallback: nếu tầng đỗ xe chuyên dụng cho loại ô tô này đã đầy (2: Sedan, 3: SUV, 4: EV),
    // cho phép đỗ ở bất kỳ ô đỗ nào còn trống thuộc nhóm tầng ô tô.
    if (candidateSlots.length === 0 && (vehicleTypeId === 2 || vehicleTypeId === 3 || vehicleTypeId === 4)) {
      candidateSlots = slots.filter(
        (s) => (s.allowedVehicleTypeId === 2 || s.allowedVehicleTypeId === 3 || s.allowedVehicleTypeId === 4) && s.status === 'Available'
      );
    }

    if (candidateSlots.length === 0) {
      return [];
    }


    const results = candidateSlots.map((slot) => {

      const distScore = Math.max(0, 100 - slot.distanceMetric);


      let floorScore = 100;
      if (slot.floorNumber === 1) floorScore = 100;
      else if (slot.floorNumber === -1) floorScore = 80;
      else if (slot.floorNumber === 2) floorScore = 60;
      else if (slot.floorNumber === 3) floorScore = 40;


      const slotsOnFloor = slots.filter((s) => s.floorNumber === slot.floorNumber);
      const occupied = slotsOnFloor.filter((s) => s.status !== 'Available').length;
      const utilizationRatio = slotsOnFloor.length > 0 ? occupied / slotsOnFloor.length : 0;
      const utilScore = Math.round((1 - utilizationRatio) * 100);


      let durScore = 0;
      if (isMonthly) {

        durScore = Math.round((slot.distanceMetric / 100) * 100);
        if (durScore > 100) durScore = 100;
      } else {

        durScore = Math.max(0, 100 - slot.distanceMetric);
      }


      const finalScore =
        aiWeights.w1 * distScore +
        aiWeights.w2 * floorScore +
        aiWeights.w3 * utilScore +
        aiWeights.w4 * durScore;

      return {
        slot,
        distScore,
        floorScore,
        utilScore,
        durScore,
        finalScore: Math.round(finalScore * 10) / 10
      };
    });


    return results.sort((a, b) => b.finalScore - a.finalScore);
  };


  const runAICheckInAnalysis = () => {
    if (!checkInForm.licensePlate) {
      addToast('Vui lòng quét hoặc nhập biển số xe!', 'warning');
      return;
    }


    const booking = bookings.find(
      (b) => b.licensePlate === checkInForm.licensePlate && b.status === 'Confirmed'
    );
    if (booking) {
      addToast(`Tìm thấy lịch đặt trước của xe! Ô giữ chỗ: ${booking.slotNumber}`, 'success');
      const targetSlot = slots.find((s) => s.slotNumber === booking.slotNumber);
      if (targetSlot) {
        setAiScoringResults([
          {
            slot: targetSlot,
            distScore: 100,
            floorScore: 100,
            utilScore: 100,
            durScore: 100,
            finalScore: 100.0,
            isPreBooked: true
          }
        ]);
        setSelectedWinner({
          slot: targetSlot,
          isPreBooked: true,
          bookingId: booking.id
        });
        return;
      }
    }


    const scores = calculateOfflineAIScores(
      parseInt(checkInForm.vehicleTypeId),
      checkInForm.isMonthly
    );
    if (scores.length === 0) {
      addToast('Rất tiếc! Không còn ô đỗ trống nào phù hợp.', 'error');
      return;
    }

    setAiScoringResults(scores);
    setSelectedWinner({
      slot: scores[0].slot,
      isPreBooked: false
    });
    addToast('Phân tích AI hoàn tất! Tìm thấy vị trí đỗ tối ưu.', 'success');
  };

  const confirmCheckIn = async () => {
    if (!selectedWinner) return;

    const slot = selectedWinner.slot;
    const card = checkInForm.cardNumber || `CARD-${Math.floor(Math.random() * 900) + 100}`;

    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/transaction/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            cardNumber: card,
            licensePlate: checkInForm.licensePlate,
            vehicleTypeId: parseInt(checkInForm.vehicleTypeId)
          })
        });
        if (res.ok) {
          setGateOpenCheckIn(true);
          addToast(`Xe ${checkInForm.licensePlate} đã Check-in thành công (Live API)!`, 'success');
          setTimeout(() => {
            setGateOpenCheckIn(false);
            setCheckInForm({
              licensePlate: '',
              vehicleTypeId: 2,
              isMonthly: false,
              cardNumber: ''
            });
            setAiScoringResults(null);
            setSelectedWinner(null);
            syncLiveConfig();
          }, 3000);
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Lỗi Check-in từ máy chủ!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để Check-in!', 'error');
      }
      return;
    }


    setSlots((prev) =>
      prev.map((s) => (s.slotNumber === slot.slotNumber ? { ...s, status: 'Occupied', occupiedBy: checkInForm.licensePlate } : s))
    );


    const newSession = {
      correlationId: `session-${Math.random().toString(36).substr(2, 9)}`,
      licensePlate: checkInForm.licensePlate,
      vehicleTypeId: parseInt(checkInForm.vehicleTypeId),
      slotNumber: slot.slotNumber,
      cardNumber: card,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: 'Active',
      notes: null,
      totalFee: 0
    };

    setSessions((prev) => [newSession, ...prev]);


    if (selectedWinner.isPreBooked) {
      setBookings((prev) =>
        prev.map((b) => (b.id === selectedWinner.bookingId ? { ...b, status: 'Completed' } : b))
      );
    }


    setGateOpenCheckIn(true);
    addToast(`Xe ${checkInForm.licensePlate} đã Check-in! Hướng dẫn đến ô: ${slot.slotNumber}`, 'success');

    setTimeout(() => {
      setGateOpenCheckIn(false);

      setCheckInForm({
        licensePlate: '',
        vehicleTypeId: 2,
        isMonthly: false,
        cardNumber: ''
      });
      setAiScoringResults(null);
      setSelectedWinner(null);
    }, 3000);
  };

  const triggerAutoCheckIn = async (customPlate = null, customVehicleTypeId = null) => {
    const plate = (customPlate || checkInForm.licensePlate || "").trim().toUpperCase();
    if (!plate) {
      addToast('Vui lòng quét hoặc nhập biển số xe!', 'warning');
      return;
    }

    const vTypeId = customVehicleTypeId !== null ? parseInt(customVehicleTypeId) : parseInt(checkInForm.vehicleTypeId);
    const isMonthly = checkInForm.isMonthly;
    const card = checkInForm.cardNumber || `CARD-${Math.floor(Math.random() * 900) + 100}`;


    let targetSlot = null;
    let isPreBooked = false;
    let bookingId = null;

    const booking = bookings.find(
      (b) => b.licensePlate === plate && b.status === 'Confirmed'
    );
    if (booking) {
      addToast(`Tìm thấy lịch đặt trước! Ô giữ: ${booking.slotNumber}`, 'success');
      const foundSlot = slots.find((s) => s.slotNumber === booking.slotNumber);
      if (foundSlot) {
        targetSlot = foundSlot;
        isPreBooked = true;
        bookingId = booking.id;
      }
    }


    let bestSlotCandidate = targetSlot;
    let scores = [];
    if (!bestSlotCandidate) {
      scores = calculateOfflineAIScores(vTypeId, isMonthly);
      if (scores.length === 0) {
        addToast('Rất tiếc! Không còn ô đỗ trống nào phù hợp.', 'error');
        return;
      }
      bestSlotCandidate = scores[0].slot;
      setAiScoringResults(scores);
    } else {
      setAiScoringResults([
        {
          slot: targetSlot,
          distScore: 100,
          floorScore: 100,
          utilScore: 100,
          durScore: 100,
          finalScore: 100.0,
          isPreBooked: true
        }
      ]);
    }

    const finalSlot = bestSlotCandidate;

    setSelectedWinner({
      slot: finalSlot,
      isPreBooked,
      bookingId
    });


    setLedScreenData({
      licensePlate: plate,
      slotNumber: finalSlot.slotNumber,
      floor: finalSlot.floorNumber === -1 ? 'B1 (Hầm)' : `Tầng ${finalSlot.floorNumber}`,
      status: 'OPEN - WELCOME'
    });

    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/transaction/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            cardNumber: card,
            licensePlate: plate,
            vehicleTypeId: vTypeId
          })
        });
        if (res.ok) {
          setGateOpenCheckIn(true);
          addToast(`[TỰ ĐỘNG] Xe ${plate} đã Check-in vào ô ${finalSlot.slotNumber} (Live API)!`, 'success');
          setTimeout(() => {
            setGateOpenCheckIn(false);
            setCheckInForm({
              licensePlate: '',
              vehicleTypeId: 2,
              isMonthly: false,
              cardNumber: ''
            });
            setAiScoringResults(null);
            setSelectedWinner(null);
            setLedScreenData(null);
            syncLiveConfig();
          }, 4000);
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Lỗi Check-in từ máy chủ!', 'error');
          setLedScreenData(null);
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để Check-in!', 'error');
        setLedScreenData(null);
      }
      return;
    }


    setSlots((prev) =>
      prev.map((s) => (s.slotNumber === finalSlot.slotNumber ? { ...s, status: 'Occupied', occupiedBy: plate } : s))
    );

    const newSession = {
      correlationId: `session-${Math.random().toString(36).substr(2, 9)}`,
      licensePlate: plate,
      vehicleTypeId: vTypeId,
      slotNumber: finalSlot.slotNumber,
      cardNumber: card,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: 'Active',
      notes: null,
      totalFee: 0
    };

    setSessions((prev) => [newSession, ...prev]);

    if (isPreBooked) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'Completed' } : b))
      );
    }

    setGateOpenCheckIn(true);
    addToast(`[TỰ ĐỘNG] Xe ${plate} đã nhận diện ô đỗ: ${finalSlot.slotNumber} (Simulation)!`, 'success');

    setTimeout(() => {
      setGateOpenCheckIn(false);
      setCheckInForm({
        licensePlate: '',
        vehicleTypeId: 2,
        isMonthly: false,
        cardNumber: ''
      });
      setAiScoringResults(null);
      setSelectedWinner(null);
      setLedScreenData(null);
    }, 4000);
  };

  const simulateIncomingCar = () => {
    const prefixes = ['30A', '29C', '51G', '43A', '37B', '15A'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomPlate = `${randomPrefix}-${Math.floor(Math.random() * 89999) + 10000}`;
    const randomVehicleTypeId = Math.floor(Math.random() * 4) + 1;

    setCheckInForm((prev) => ({
      ...prev,
      licensePlate: randomPlate,
      vehicleTypeId: randomVehicleTypeId,
      cardNumber: `CARD-${Math.floor(Math.random() * 900) + 100}`
    }));

    addToast(`ANPR Camera phát hiện xe tiến vào: ${randomPlate}`, 'info');

    if (autoCheckIn) {
      setTimeout(() => {
        triggerAutoCheckIn(randomPlate, randomVehicleTypeId);
      }, 500);
    }
  };


  const searchCheckOutSession = () => {
    if (!checkOutPlateOrCard) {
      addToast('Vui lòng nhập biển số xe hoặc mã thẻ!', 'warning');
      return;
    }

    const session = sessions.find(
      (s) =>
        (s.licensePlate === checkOutPlateOrCard || s.cardNumber === checkOutPlateOrCard) &&
        s.status === 'Active'
    );

    if (!session) {
      addToast('Không tìm thấy phiên gửi xe hoạt động cho phương tiện này!', 'error');
      setCheckoutInvoice(null);
      return;
    }


    const rule = pricingRules.find((r) => r.vehicleTypeId === session.vehicleTypeId);
    const hourlyRate = rule ? rule.ratePerHour : 20000;

    const inTime = new Date(session.checkInTime);
    const outTime = new Date();
    const durationMs = outTime - inTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
    const elapsedMinutes = Math.round(durationMs / (1000 * 60));


    const totalFee = durationHours * hourlyRate;

    setCheckoutInvoice({
      session,
      inTime: inTime.toLocaleString('vi-VN'),
      outTime: outTime.toLocaleString('vi-VN'),
      elapsedMinutes,
      elapsedHours: durationHours,
      ratePerHour: hourlyRate,
      totalFee
    });
    addToast('Đã tính toán hóa đơn gửi xe.', 'success');
  };

  const confirmCheckOut = async () => {
    if (!checkoutInvoice) return;

    const session = checkoutInvoice.session;

    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/transaction/check-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            cardNumber: session.cardNumber,
            licensePlate: session.licensePlate
          })
        });
        if (res.ok) {
          setRevenue((prev) => prev + checkoutInvoice.totalFee);
          setGateOpenCheckOut(true);
          addToast(`Thanh toán thành công ${checkoutInvoice.totalFee.toLocaleString('vi-VN')}đ! Mở cổng cho xe ${session.licensePlate} (Live API).`, 'success');
          setTimeout(() => {
            setGateOpenCheckOut(false);
            setCheckoutInvoice(null);
            setCheckOutPlateOrCard('');
            syncLiveConfig();
          }, 3000);
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Lỗi Check-out từ máy chủ!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để Check-out!', 'error');
      }
      return;
    }


    setSlots((prev) =>
      prev.map((s) => (s.slotNumber === session.slotNumber ? { ...s, status: 'Available', occupiedBy: null, bookingId: null } : s))
    );


    setSessions((prev) =>
      prev.map((s) =>
        s.correlationId === session.correlationId
          ? {
              ...s,
              status: 'Completed',
              checkOutTime: new Date().toISOString(),
              totalFee: checkoutInvoice.totalFee
            }
          : s
      )
    );

    setRevenue((prev) => prev + checkoutInvoice.totalFee);
    setGateOpenCheckOut(true);
    addToast(`Thanh toán thành công ${checkoutInvoice.totalFee.toLocaleString('vi-VN')}đ! Mở cổng cho xe ${session.licensePlate}.`, 'success');

    setTimeout(() => {
      setGateOpenCheckOut(false);
      setCheckoutInvoice(null);
      setCheckOutPlateOrCard('');
    }, 3000);
  };


  const triggerReportException = (session) => {
    setShowExceptionModal(session);
    setExceptionNotes('');
    setExceptionFee(0);
  };

  const submitException = async () => {
    if (!exceptionNotes) {
      addToast('Vui lòng nhập ghi chú biên bản sự cố!', 'warning');
      return;
    }

    const session = showExceptionModal;

    if (mode === 'live') {
      try {
        const res = await fetch(`http://localhost:5125/api/v1/staff/sessions/${session.correlationId}/exceptions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            notes: exceptionNotes,
            customFee: parseFloat(exceptionFee) || 0
          })
        });
        if (res.ok) {
          setRevenue((prev) => prev + (parseFloat(exceptionFee) || 0));
          addToast(`Xử lý ngoại lệ thành công! Ô đỗ đã được giải phóng (Live API).`, 'warning');
          setShowExceptionModal(null);
          syncLiveConfig();
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Lỗi xử lý ngoại lệ từ máy chủ!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để xử lý ngoại lệ!', 'error');
      }
      return;
    }


    setSlots((prev) =>
      prev.map((s) => (s.slotNumber === session.slotNumber ? { ...s, status: 'Available', occupiedBy: null } : s))
    );


    setSessions((prev) =>
      prev.map((s) =>
        s.correlationId === session.correlationId
          ? {
              ...s,
              status: 'Exception',
              checkOutTime: new Date().toISOString(),
              notes: exceptionNotes,
              totalFee: parseFloat(exceptionFee) || 0
            }
          : s
      )
    );

    setRevenue((prev) => prev + (parseFloat(exceptionFee) || 0));
    addToast(`Xử lý sự cố thành công! Ô đỗ ${session.slotNumber} đã được giải phóng.`, 'warning');
    setShowExceptionModal(null);
  };


  const handleDriverBooking = async (e) => {
    e.preventDefault();
    if (!driverBookingForm.licensePlate) {
      addToast('Vui lòng nhập biển số xe đặt chỗ!', 'warning');
      return;
    }

    if (mode === 'live') {
      if (walletBalance < 20000) {
        addToast('Số dư tài khoản không đủ để đặt chỗ! Vui lòng nạp tối thiểu 20.000 đ vào ví.', 'error');
        return;
      }

      try {
        const res = await fetch('http://localhost:5125/api/v1/driver/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            licensePlate: driverBookingForm.licensePlate,
            vehicleTypeId: parseInt(driverBookingForm.vehicleTypeId)
          })
        });
        if (res.ok) {
          const data = await res.json();
          const bk = {
            id: data.booking.id,
            licensePlate: data.booking.licensePlate,
            vehicleTypeId: data.booking.vehicleTypeId,
            slotNumber: data.booking.slotNumber,
            bookingTime: new Date(data.booking.bookingTimeUtc).toLocaleString('vi-VN'),
            status: data.booking.status
          };
          setBookings((prev) => [bk, ...prev]);
          setDriverBookingSuccess(bk);
          setWalletBalance(data.balance || 0); // Cập nhật số dư ví thực tế trả về từ server
          addToast(`Đặt chỗ thành công (Live API)! Vị trí của bạn: ${bk.slotNumber}`, 'success');
          syncLiveConfig();
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Lỗi đặt chỗ từ máy chủ!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để đặt chỗ!', 'error');
      }
      return;
    }

    if (walletBalance < 20000) {
      addToast('Số dư tài khoản không đủ để đặt chỗ! Vui lòng nạp tối thiểu 20.000 đ vào ví.', 'error');
      return;
    }


    const scores = calculateOfflineAIScores(
      parseInt(driverBookingForm.vehicleTypeId),
      false
    );

    if (scores.length === 0) {
      addToast('Xin lỗi! Hệ thống hiện tại đã hết ô đỗ trống.', 'error');
      return;
    }

    const optimalSlot = scores[0].slot;
    const bookingId = `BK-${Math.floor(Math.random() * 900000) + 100000}`;


    setSlots((prev) =>
      prev.map((s) =>
        s.slotNumber === optimalSlot.slotNumber
          ? { ...s, status: 'Reserved', occupiedBy: driverBookingForm.licensePlate, bookingId }
          : s
      )
    );


    const newBooking = {
      id: bookingId,
      licensePlate: driverBookingForm.licensePlate,
      vehicleTypeId: parseInt(driverBookingForm.vehicleTypeId),
      slotNumber: optimalSlot.slotNumber,
      bookingTime: new Date().toLocaleString('vi-VN'),
      status: 'Confirmed'
    };

    setBookings((prev) => [newBooking, ...prev]);
    setDriverBookingSuccess(newBooking);
    setWalletBalance((prev) => prev - 20000);
    addToast(`Lịch đặt ô đỗ đã xác nhận! Vị trí của bạn: ${optimalSlot.slotNumber}. Đã khấu trừ 20.000đ tiền cọc.`, 'success');
  };

  const handleDeposit = async (amount) => {
    if (mode === 'live') {
      try {
        const res = await fetch('http://localhost:5125/api/v1/driver/wallet/deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount })
        });
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(data.wallet.balance);
          addToast(`Nạp thành công ${amount.toLocaleString('vi-VN')} đ vào ví!`, 'success');
        } else {
          const err = await res.json().catch(() => ({}));
          addToast(err.message || 'Không thể nạp tiền!', 'error');
        }
      } catch (err) {
        addToast('Lỗi kết nối khi nạp tiền!', 'error');
      }
    } else {
      setWalletBalance((prev) => prev + amount);
      addToast(`Nạp thành công ${amount.toLocaleString('vi-VN')} đ vào ví! (Offline)`, 'success');
    }
  };

  const trackDriverSession = async () => {
    if (!driverPlate) {
      addToast('Vui lòng nhập biển số xe cần tra cứu!', 'warning');
      return;
    }

    if (mode === 'live') {
      try {
        const res = await fetch(`http://localhost:5125/api/v1/driver/sessions/current?licensePlate=${driverPlate}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          const matchedSlot = slots.find((s) => s.id === data.allocatedSlotId);
          const sName = matchedSlot ? matchedSlot.slotNumber : 'F1-C03';

          setDriverActiveSession({
            correlationId: data.correlationId,
            licensePlate: data.licensePlate,
            checkInTime: data.checkInTime,
            slotNumber: sName,
            durationMinutes: data.durationMinutes,
            tempFee: data.temporaryFee
          });
          addToast('Đồng bộ dữ liệu trực tuyến thành công!', 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          addToast(errData.message || 'Không tìm thấy xe đang gửi (Live API)!', 'warning');
          setDriverActiveSession(null);
        }
      } catch (err) {
        addToast('Lỗi kết nối API Gateway để tra cứu!', 'error');
      }
      return;
    }

    const session = sessions.find((s) => s.licensePlate === driverPlate && s.status === 'Active');
    if (!session) {
      addToast('Không tìm thấy xe của bạn trong bãi đỗ!', 'warning');
      setDriverActiveSession(null);
      return;
    }

    const rule = pricingRules.find((r) => r.vehicleTypeId === session.vehicleTypeId);
    const hourlyRate = rule ? rule.ratePerHour : 20000;

    const durationMs = new Date() - new Date(session.checkInTime);
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
    const tempFee = durationHours * hourlyRate;

    setDriverActiveSession({
      ...session,
      durationMinutes,
      tempFee
    });
    addToast('Tải dữ liệu giám sát offline thành công!', 'success');
  };

  const runLiveDbSetup = async () => {
    try {
      const res = await fetch('http://localhost:5125/api/v1/registry/setup', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        addToast('Khởi tạo dữ liệu bãi xe thành công! Đã tạo 4 tầng, 55 ô đỗ mẫu.', 'success');
        syncLiveConfig();
      } else {
        addToast('Không thể khởi tạo dữ liệu bãi xe. Chỉ tài khoản Manager mới có quyền!', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối API Gateway để setup bãi xe!', 'error');
    }
  };

  const autofillCheckOut = (session) => {
    setCheckOutPlateOrCard(session.licensePlate);
    setActiveTab('gates');
    addToast(`Đã điền biển số ${session.licensePlate} vào làn Check-out!`, 'info');
  };

  return (
    <>
      <div className="top-glow"></div>
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '40px 20px' }}>
        <DriverPortal
          driverActiveTab={driverActiveTab}
          setDriverActiveTab={setDriverActiveTab}
          driverPlate={driverPlate}
          setDriverPlate={setDriverPlate}
          driverBookingForm={driverBookingForm}
          setDriverBookingForm={setDriverBookingForm}
          driverBookingSuccess={driverBookingSuccess}
          driverActiveSession={driverActiveSession}
          handleDriverBooking={handleDriverBooking}
          trackDriverSession={trackDriverSession}
          user={user}
          walletBalance={walletBalance}
          handleDeposit={handleDeposit}
          token={token}
          setToken={setToken}
          setUser={setUser}
          addToast={addToast}
          mode={mode}
        />
      </div>

      <div className="toast-box">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-alert ${toast.type}`}>
            {toast.type === 'success' && <i className="fa-solid fa-circle-check success"></i>}
            {toast.type === 'error' && <i className="fa-solid fa-triangle-exclamation error"></i>}
            {toast.type === 'warning' && <i className="fa-solid fa-circle-exclamation warning"></i>}
            {toast.type === 'info' && <i className="fa-solid fa-circle-info info"></i>}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;