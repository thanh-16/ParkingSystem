import { useState, useEffect } from 'react';
import './App.css';


const INITIAL_SLOTS = [

  ...Array.from({ length: 20 }, (_, i) => ({
    id: `slot-b1-${i + 1}`,
    slotNumber: `B1-M${(i + 1).toString().padStart(2, '0')}`,
    floorNumber: -1,
    allowedVehicleTypeId: 1,
    distanceMetric: (i + 1) * 3,
    status: 'Available',
    occupiedBy: null,
    bookingId: null
  })),

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
  { vehicleTypeId: 1, ratePerHour: 5000, name: 'Xe Máy (Motorbike)' },
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

  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState('offline');
  const [apiOnline, setApiOnline] = useState(false);


  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedFloor, setSelectedFloor] = useState(1);


  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [pricingRules, setPricingRules] = useState(INITIAL_PRICING);
  const [aiWeights, setAiWeights] = useState(INITIAL_WEIGHTS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [bookings, setBookings] = useState([]);
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


  const [toasts, setToasts] = useState([]);


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


      const sRes = await fetch('http://localhost:5125/api/v1/transaction/sessions/active', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (sRes.ok) {
        const liveSessions = await sRes.json();
        setSessions(liveSessions);
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
              return {
                ...s,
                id: lSlot.id,
                floorId: lSlot.floorId,
                status: lSlot.status,
                distanceMetric: lSlot.distanceMetric
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
          setToken(data.token);
          setUser(data.user);
          addToast(`Chào mừng trở lại, ${data.user.fullName}! (Live API)`, 'success');

          syncLiveConfig();
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


  const calculateOfflineAIScores = (vehicleTypeId, isMonthly) => {

    const candidateSlots = slots.filter(
      (s) => s.allowedVehicleTypeId === vehicleTypeId && s.status === 'Available'
    );

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


    if (parseInt(checkInForm.vehicleTypeId) === 1) {
      const occupiedMotorbikes = slots.filter(s => s.allowedVehicleTypeId === 1 && s.status === 'Occupied').length;
      if (occupiedMotorbikes >= 20) {
        addToast('Cảnh báo: Hầm xe máy B1 đã đầy chỗ (20/20)! Hệ thống dừng nhận xe máy.', 'error');
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


    if (vTypeId === 1) {
      const occupiedMotorbikes = slots.filter(s => s.allowedVehicleTypeId === 1 && s.status === 'Occupied').length;
      if (occupiedMotorbikes >= 20) {
        addToast('Cảnh báo: Hầm xe máy B1 đã đầy chỗ (20/20)! Hệ thống dừng nhận xe máy.', 'error');
        setLedScreenData({
          licensePlate: plate,
          slotNumber: '⚠️ FULL',
          floor: 'HẦM B1 ĐẦY CHỖ',
          status: 'STOP - FULL'
        });
        setTimeout(() => setLedScreenData(null), 4000);
        return;
      }
    }


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
    addToast(`Lịch đặt ô đỗ đã xác nhận! Vị trí của bạn: ${optimalSlot.slotNumber}`, 'success');
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
    addToast('Tải dữ liệu giám sát trực tuyến thành công!', 'success');
  };

  const runLiveDbSetup = async () => {
    try {
      const res = await fetch('http://localhost:5125/api/v1/registry/setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
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

      {}
      {!user && (
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

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Tên đăng nhập / Username</label>
                <input
                  type="text"
                  placeholder="Nhập tài khoản"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu / Password</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn" style={{ marginTop: '8px' }}>
                <i className="fa-solid fa-right-to-bracket"></i> Đăng Nhập
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 'bold' }}>
                ĐĂNG NHẬP NHANH DEMO (BYPASS)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => {
                    setUser({ username: 'manager1', fullName: 'Nguyễn Văn A', role: 'Manager' });
                    setMode('offline');
                    addToast('Bypass: Quản Lý (Nguyễn Văn A)', 'success');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '11.5px', padding: '8px' }}
                >
                  🔑 Quản Lý
                </button>
                <button
                  onClick={() => {
                    setUser({ username: 'staff1', fullName: 'Trần Thị B', role: 'Staff' });
                    setMode('offline');
                    addToast('Bypass: Nhân Viên (Trần Thị B)', 'success');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '11.5px', padding: '8px' }}
                >
                  🔑 Nhân Viên
                </button>
              </div>
              <button
                onClick={() => {
                  setUser({ username: 'driver1', fullName: 'Phạm Văn C', role: 'Driver' });
                  setMode('offline');
                  addToast('Bypass: Lái Xe (Phạm Văn C)', 'success');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '8px', width: '100%' }}
              >
                🚗 Cổng Thông Tin Lái Xe (Driver Portal)
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {user && (
        <div className="app-layout">
          {}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <i className="fa-solid fa-square-parking logo-icon"></i>
              <h3>PBMS PORTAL</h3>
            </div>

            <div className="user-profile">
              <div className="avatar">
                {user.fullName.split(' ').pop().charAt(0)}
              </div>
              <div className="info">
                <span>{user.fullName}</span>
                <span className="badge">{user.role}</span>
              </div>
            </div>

            <nav className="nav-menu">
              <button
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <i className="fa-solid fa-chart-line"></i> Bảng Giám Sát Dashboard
              </button>
              <button
                className={`nav-item ${activeTab === 'gates' ? 'active' : ''}`}
                onClick={() => setActiveTab('gates')}
              >
                <i className="fa-solid fa-door-open"></i> Làn Xe & Cổng Simulator
              </button>
              <button
                className={`nav-item ${activeTab === 'driver' ? 'active' : ''}`}
                onClick={() => setActiveTab('driver')}
              >
                <i className="fa-solid fa-mobile-screen-button"></i> Mobile App Lái Xe
              </button>
            </nav>

            <div className="sidebar-footer">
              <button className="btn-logout" onClick={handleLogout}>
                <i className="fa-solid fa-power-off"></i> Đăng xuất
              </button>
            </div>
          </aside>

          {}
          <main className="workspace">
            {}
            <div className="workspace-header">
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hệ thống Quản lý Bãi xe Thông minh</span>
                <h1>
                  {activeTab === 'dashboard' && 'Bảng Giám Sát Của Quản Lý (Manager Panel)'}
                  {activeTab === 'gates' && 'Mô Phỏng Cổng Làn Check-In / Check-Out'}
                  {activeTab === 'driver' && 'Cổng Thông Tin Lái Xe & Đặt Chỗ Trước'}
                </h1>
              </div>

              <div className="header-right">
                {}
                <div className="mode-toggle-pill">
                  <button
                    className={`mode-toggle-btn ${mode === 'offline' ? 'active' : ''}`}
                    onClick={() => setMode('offline')}
                  >
                    Mô phỏng (Local)
                  </button>
                  <button
                    className={`mode-toggle-btn ${mode === 'live' ? 'active' : ''}`}
                    onClick={() => setMode('live')}
                  >
                    API Gateway (Live)
                  </button>
                </div>

                {mode === 'live' && (
                  <button
                    onClick={syncLiveConfig}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    title="Làm mới dữ liệu từ API"
                  >
                    <i className="fa-solid fa-arrows-rotate"></i> Làm mới
                  </button>
                )}

                <div className={`status-indicator ${mode === 'offline' ? 'offline' : ''}`}>
                  <span className="pulse-dot"></span>
                  <span>{mode === 'live' ? (apiOnline ? 'Live Gateway Online' : 'Gateway Offline') : 'Mô Phỏng Offline'}</span>
                </div>
              </div>
            </div>

            {}
            {mode === 'live' && !apiOnline && (
              <div className="alert-box error" style={{ padding: '16px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '24px', color: 'var(--danger)' }}></i>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#7f1d1d' }}>Kết Nối Live API Gateway Ngoại Tuyến (Offline)</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#991b1b', lineHeight: '1.4' }}>
                      Cổng API Gateway (<code>http:
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMode('offline');
                    addToast('Đã chuyển sang chế độ Mô Phỏng Offline!', 'info');
                  }}
                  className="btn"
                  style={{
                    background: 'var(--danger)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    marginLeft: '16px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-power-off"></i> Mô Phỏng Offline
                </button>
              </div>
            )}

            {}
            {activeTab === 'dashboard' && (
              <>
                {}
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
                      <h2>{Math.round((slots.filter((s) => s.status === 'Occupied').length / slots.length) * 100)}%</h2>
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
                  <div className="metric-card">
                    <div className="icon-box cyan" style={{ background: 'rgba(6, 182, 212, 0.08)', color: '#06b6d4' }}>
                      <i className="fa-solid fa-motorcycle"></i>
                    </div>
                    <div className="data">
                      <h3>Hầm xe máy B1</h3>
                      <h2>{slots.filter((s) => s.allowedVehicleTypeId === 1 && s.status === 'Occupied').length} / 20</h2>
                      <p>{slots.filter((s) => s.allowedVehicleTypeId === 1 && s.status === 'Available').length === 0 ? '⚠️ ĐÃ ĐẦY CHỖ' : `Còn lại ${slots.filter((s) => s.allowedVehicleTypeId === 1 && s.status === 'Available').length} ô trống`}</p>
                    </div>
                  </div>
                </div>

                <div className="content-split-layout">
                  {}
                  <div className="glass-panel">
                    <div className="panel-header">
                      <h2><i className="fa-solid fa-layer-group"></i> Sơ đồ vị trí bãi gửi xe</h2>
                      <div className="floor-selector">
                        <button
                          className={`floor-btn ${selectedFloor === -1 ? 'active' : ''}`}
                          onClick={() => setSelectedFloor(-1)}
                        >
                          Tầng B1 (Xe máy)
                        </button>
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
                  </div>

                  {}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {}
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

                      <button onClick={saveAiWeights} className="btn">
                        <i className="fa-solid fa-floppy-disk"></i> Cập Nhật Trọng Số AI
                      </button>
                    </div>

                    {}
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

                    {}
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

                  </div>
                </div>
              </>
            )}

            {}
            {activeTab === 'gates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="simulator-grid">
                  {}
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

                    {}
                    <div className={`barrier-bar ${gateOpenCheckIn ? 'open' : ''}`}>
                      <i className="fa-solid fa-traffic-light" style={{ marginRight: '8px', color: gateOpenCheckIn ? 'var(--success)' : 'var(--danger)' }}></i>
                      <span>Thanh chắn cổng vào: {gateOpenCheckIn ? 'ĐANG MỞ (GO)' : 'ĐANG ĐÓNG (WAIT)'}</span>
                      <div className="barrier-gate-arm"></div>
                    </div>

                    {}
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
                            {checkInForm.vehicleTypeId.toString() === "1" && (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: slots.filter(s => s.allowedVehicleTypeId === 1 && s.status === 'Available').length === 0 ? 'var(--danger)' : 'var(--success)'
                              }}>
                                Hầm B1: {slots.filter(s => s.allowedVehicleTypeId === 1 && s.status === 'Occupied').length}/20 {slots.filter(s => s.allowedVehicleTypeId === 1 && s.status === 'Available').length === 0 ? '⚠️ ĐẦY CHỖ' : '🟢 CÒN TRỐNG'}
                              </span>
                            )}
                          </div>
                          <select
                            value={checkInForm.vehicleTypeId}
                            onChange={(e) =>
                              setCheckInForm((prev) => ({ ...prev, vehicleTypeId: e.target.value }))
                            }
                          >
                            <option value="1">Xe Máy (Motorbike)</option>
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

                    {}
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

                  {}
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

                    {}
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

                {}
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
                                {session.vehicleTypeId === 1 && 'Xe Máy'}
                                {session.vehicleTypeId === 2 && 'Sedan'}
                                {session.vehicleTypeId === 3 && 'SUV'}
                                {session.vehicleTypeId === 4 && 'Xe Điện'}
                              </td>
                              <td>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                  {session.slotNumber}
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

                {}
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
            )}

            {}
            {activeTab === 'driver' && (
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

                {}
                <div className="phone-mockup">
                  {}
                  <div className="phone-header">
                    <span>15:45</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <i className="fa-solid fa-wifi"></i>
                      <i className="fa-solid fa-battery-three-quarters"></i>
                    </div>
                  </div>

                  {}
                  <div className="phone-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                      <i className="fa-solid fa-circle-user" style={{ fontSize: '28px', color: 'var(--primary)' }}></i>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>Chào bạn, Phạm Văn C</h4>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Thành viên PBMS App</span>
                      </div>
                    </div>

                    {}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '8px' }}>
                      <button
                        onClick={() => setDriverActiveTab('book')}
                        style={{
                          flex: 1,
                          background: driverActiveTab === 'book' ? 'var(--primary)' : 'transparent',
                          color: 'white',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Đặt Chỗ Trước
                      </button>
                      <button
                        onClick={() => setDriverActiveTab('track')}
                        style={{
                          flex: 1,
                          background: driverActiveTab === 'track' ? 'var(--primary)' : 'transparent',
                          color: 'white',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Tra Cứu Gửi Xe
                      </button>
                    </div>

                    {}
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
                              <option value="1">Xe Máy</option>
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

                    {}
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
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {}
      {showExceptionModal && (
        <div className="overlay-dialog">
          <div className="dialog-content">
            <div className="dialog-header">
              <h3>🚨 Lập Biên Bản Xử Lý Sự Cố Ngoại Lệ</h3>
              <button className="close-btn" onClick={() => setShowExceptionModal(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="alert-box error">
              Biên bản này sẽ giải phóng ô đỗ <strong>{showExceptionModal.slotNumber}</strong> ngay lập tức để bãi xe hoạt động bình thường, và lưu lại ghi chú giải trình của bạn.
            </div>

            <div className="form-group">
              <label>Biển số xe gặp sự cố</label>
              <input type="text" disabled value={showExceptionModal.licensePlate} />
            </div>

            <div className="form-group">
              <label>Ghi chú lý do / Biên bản sự cố (Notes)</label>
              <textarea
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  outline: 'none',
                  minHeight: '80px',
                  fontFamily: 'inherit'
                }}
                placeholder="Ví dụ: Lái xe làm mất thẻ từ, đã xác minh hình ảnh đối chiếu khớp biển số..."
                value={exceptionNotes}
                onChange={(e) => setExceptionNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Thu phí thực tế (nếu có) - VND</label>
              <input
                type="number"
                placeholder="Ví dụ: 50000"
                value={exceptionFee}
                onChange={(e) => setExceptionFee(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setShowExceptionModal(null)} style={{ flex: 1 }}>
                Hủy Bỏ
              </button>
              <button className="btn btn-danger" onClick={submitException} style={{ flex: 1 }}>
                Xác Nhận Giải Quyết
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedSlotDetails && (
        <div className="overlay-dialog">
          <div className="dialog-content">
            <div className="dialog-header">
              <h3><i className="fa-solid fa-circle-info"></i> Chi Tiết Vị Trí Đỗ: {selectedSlotDetails.slotNumber}</h3>
              <button className="close-btn" onClick={() => setSelectedSlotDetails(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Tầng</label>
                  <input type="text" disabled value={
                    selectedSlotDetails.floorNumber === -1 ? 'Tầng B1 (Hầm)' : `Tầng ${selectedSlotDetails.floorNumber}`
                  } />
                </div>
                <div className="form-group">
                  <label>Khoảng cách tới cổng</label>
                  <input type="text" disabled value={`${selectedSlotDetails.distanceMetric}m`} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Loại xe cho phép</label>
                  <input type="text" disabled value={
                    (selectedSlotDetails.allowedVehicleTypeId === 1 && 'Xe Máy (Motorbike)') ||
                    (selectedSlotDetails.allowedVehicleTypeId === 2 && 'Compact/Sedan') ||
                    (selectedSlotDetails.allowedVehicleTypeId === 3 && 'SUV/Crossover') ||
                    (selectedSlotDetails.allowedVehicleTypeId === 4 && 'Xe Điện EV') || 'Mọi loại xe'
                  } />
                </div>
                <div className="form-group">
                  <label>Trạng thái hiện tại</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <span className="status-indicator" style={{
                      border: 'none',
                      padding: '4px 10px',
                      fontSize: '12px',
                      background: selectedSlotDetails.status === 'Available' ? 'rgba(16, 185, 129, 0.08)' :
                                  selectedSlotDetails.status === 'Occupied' ? 'rgba(239, 68, 68, 0.08)' :
                                  selectedSlotDetails.status === 'Reserved' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(6, 182, 212, 0.08)',
                      borderColor: selectedSlotDetails.status === 'Available' ? 'rgba(16, 185, 129, 0.2)' :
                                   selectedSlotDetails.status === 'Occupied' ? 'rgba(239, 68, 68, 0.2)' :
                                   selectedSlotDetails.status === 'Reserved' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                      color: selectedSlotDetails.status === 'Available' ? 'var(--success)' :
                             selectedSlotDetails.status === 'Occupied' ? 'var(--danger)' :
                             selectedSlotDetails.status === 'Reserved' ? 'var(--warning)' : 'var(--info)'
                    }}>
                      {selectedSlotDetails.status === 'Available' && '🟢 Trống (Available)'}
                      {selectedSlotDetails.status === 'Occupied' && '🔴 Đang đỗ (Occupied)'}
                      {selectedSlotDetails.status === 'Reserved' && '🟡 Đặt trước (Reserved)'}
                      {selectedSlotDetails.status === 'Maintenance' && '🛠️ Bảo trì (Maintenance)'}
                    </span>
                  </div>
                </div>
              </div>

              {}
              {selectedSlotDetails.status === 'Occupied' && (() => {
                const activeSession = sessions.find(
                  (s) => s.slotNumber === selectedSlotDetails.slotNumber && s.status === 'Active'
                );
                if (!activeSession) return <div className="alert-box info">Đang đỗ xe (không tìm thấy phiên gửi chi tiết).</div>;

                const inTime = new Date(activeSession.checkInTime);
                const durationMs = new Date() - inTime;
                const durationMins = Math.round(durationMs / (1000 * 60));

                return (
                  <div className="phone-app-card" style={{ background: 'rgba(239, 68, 68, 0.04)', borderColor: 'rgba(239, 68, 68, 0.15)', marginTop: '8px' }}>
                    <h4 style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '8px' }}><i className="fa-solid fa-car"></i> Thông Tin Phiên Gửi Xe</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Biển số xe:</span>
                        <strong>{activeSession.licensePlate}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Mã thẻ từ:</span>
                        <code>{activeSession.cardNumber}</code>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Thời gian vào:</span>
                        <span>{inTime.toLocaleString('vi-VN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Thời lượng đỗ:</span>
                        <span>{durationMins} phút</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedSlotDetails.status === 'Reserved' && (() => {
                const activeBooking = bookings.find(
                  (b) => b.slotNumber === selectedSlotDetails.slotNumber && b.status === 'Confirmed'
                );
                if (!activeBooking) return <div className="alert-box info">Vị trí đã được đặt trước bởi lái xe.</div>;

                return (
                  <div className="phone-app-card" style={{ background: 'rgba(245, 158, 11, 0.04)', borderColor: 'rgba(245, 158, 11, 0.15)', marginTop: '8px' }}>
                    <h4 style={{ color: 'var(--warning)', fontSize: '13px', marginBottom: '8px' }}><i className="fa-solid fa-clock"></i> Thông Tin Đặt Chỗ</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Biển số xe:</span>
                        <strong>{activeBooking.licensePlate}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Giờ đặt chỗ:</span>
                        <span>{activeBooking.bookingTime}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
                        <span style={{ color: 'var(--warning)' }}>Đã Xác Nhận (Confirmed)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {}
              {(user.role === 'Manager' || user.role === 'Staff') && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  {selectedSlotDetails.status === 'Available' && (
                    <button
                      onClick={() => handleToggleMaintenance(selectedSlotDetails, true)}
                      className="btn btn-secondary"
                      style={{ flex: 1, borderColor: 'var(--info)' }}
                    >
                      <i className="fa-solid fa-wrench" style={{ color: 'var(--info)' }}></i> Bảo Trì Ô Đỗ
                    </button>
                  )}

                  {selectedSlotDetails.status === 'Maintenance' && (
                    <button
                      onClick={() => handleToggleMaintenance(selectedSlotDetails, false)}
                      className="btn"
                      style={{ flex: 1, background: 'var(--success)' }}
                    >
                      <i className="fa-solid fa-circle-check"></i> Khôi Phục Trống (Available)
                    </button>
                  )}

                  {selectedSlotDetails.status === 'Occupied' && (() => {
                    const activeSession = sessions.find(
                      (s) => s.slotNumber === selectedSlotDetails.slotNumber && s.status === 'Active'
                    );
                    if (!activeSession) return null;
                    return (
                      <>
                        <button
                          onClick={() => {
                            setSelectedSlotDetails(null);
                            autofillCheckOut(activeSession);
                          }}
                          className="btn"
                          style={{ flex: 1 }}
                        >
                          <i className="fa-solid fa-credit-card"></i> Check-out nhanh
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSlotDetails(null);
                            triggerReportException(activeSession);
                          }}
                          className="btn btn-danger"
                          style={{ flex: 1 }}
                        >
                          <i className="fa-solid fa-triangle-exclamation"></i> Báo sự cố
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
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