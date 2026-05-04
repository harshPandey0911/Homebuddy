import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTool, FiLogOut, FiPhone, FiBriefcase, FiStar, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
import { HiLightningBolt } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import api from '../../../services/api';
import { playAlertRing, stopAlertRing } from '../../../utils/notificationSound';


const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

const LabourDashboard = () => {
  const navigate = useNavigate();
  const [labour, setLabour] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingPopup, setBookingPopup] = useState(null); // incoming booking request
  const [recentBookings, setRecentBookings] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const socketRef = useRef(null);
  const popupTimerRef = useRef(null);
  const [popupCountdown, setPopupCountdown] = useState(30);

  // Web Audio API alert removed, using shared notificationSound mp3 instead

  const token = localStorage.getItem('labourAccessToken');

  useEffect(() => {
    if (!token) {
      navigate('/labour/login', { replace: true });
      return;
    }
    fetchProfile();
    fetchRecentBookings();
    initSocket();

    return () => {
      socketRef.current?.disconnect();
      clearInterval(popupTimerRef.current);
    };
  }, []);

  const initSocket = () => {
    const socket = io(API_BASE, {
      auth: { token },
      transports: ['polling', 'websocket']
    });

    socket.on('connect', () => {
      console.log('[Labour Socket] Connected:', socket.id);
    });

    socket.on('labour_booking_request', (data) => {
      console.log('[Labour] New booking request:', data);
      setBookingPopup(data);
      // Play shared vendor alert mp3 (looped)
      playAlertRing(true);
      startPopupTimer();
    });

    socket.on('disconnect', () => {
      console.log('[Labour Socket] Disconnected');
    });

    socketRef.current = socket;
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/labour/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const l = res.data.labour;
        setLabour(l);
        setIsOnline(l.status === 'ONLINE');
      }
    } catch (err) {
      console.error('[Labour] Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const res = await api.get('/labour/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setRecentBookings(res.data.bookings.slice(0, 5));
    } catch {}
  };

  const toggleOnline = async () => {
    // Unlock iOS Audio on first interaction
    try {
      const unlockAudio = new Audio('/booking-alert.mp3');
      unlockAudio.volume = 0;
      unlockAudio.play().then(() => unlockAudio.pause()).catch(() => {});
    } catch(e) {}

    if (labour?.status === 'BUSY') {
      toast.error('Cannot change status while on a job');
      return;
    }

    const newStatus = labour?.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await api.put('/labour/status', { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLabour(prev => ({ ...prev, status: newStatus }));
      setIsOnline(newStatus === 'ONLINE');
      toast.success(`You are now ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAccept = async () => {
    if (!bookingPopup?.bookingId) return;

    // Stop alert sound immediately for better UX
    stopAlertRing();
    clearInterval(popupTimerRef.current);

    setActionLoading(true);
    try {
      await api.post(`/labour/accept/${bookingPopup.bookingId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookingPopup(null);
      toast.success('Booking accepted!');
      fetchRecentBookings();
      fetchProfile(); // Update status to BUSY
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (bookingId) => {
    setActionLoading(true);
    try {
      await api.post(`/labour/complete/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Job marked as completed!');
      fetchRecentBookings();
      fetchProfile(); // Refresh stats and status
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!bookingPopup?.bookingId) return;
    
    // Stop alert sound immediately
    stopAlertRing();
    clearInterval(popupTimerRef.current);

    setActionLoading(true);
    try {
      await api.post(`/labour/reject/${bookingPopup.bookingId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookingPopup(null);
      toast.success('Booking declined');
      fetchRecentBookings();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const startPopupTimer = () => {
    clearInterval(popupTimerRef.current);
    setPopupCountdown(30);
    popupTimerRef.current = setInterval(() => {
      setPopupCountdown(prev => {
        if (prev <= 1) {
          clearInterval(popupTimerRef.current);
          setBookingPopup(null);
          stopAlertRing();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleReopenPopup = (b) => {
    setBookingPopup({
      bookingId: b._id,
      bookerName: b.bookedByName,
      bookerPhone: b.bookedByPhone,
      bookerRole: b.bookedByRole,
      note: b.note,
      createdAt: b.createdAt
    });
    startPopupTimer();
  };

  const handleLogout = () => {
    localStorage.removeItem('labourAccessToken');
    localStorage.removeItem('labourRefreshToken');
    localStorage.removeItem('labourData');
    navigate('/labour/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColor = labour?.status === 'ONLINE' ? '#0d9488' : labour?.status === 'BUSY' ? '#d97706' : '#6b7280';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/10 pb-8">

      {/* Header - Scrollable */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-4 pt-12 pb-16 relative overflow-hidden shadow-lg shadow-teal-900/10">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FiTool className="text-white/80 w-4 h-4" />
              <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Labour Dashboard</span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">{labour?.name || 'Labour'}</h1>
            <p className="text-white/70 text-sm font-bold mt-0.5 tracking-tight">+91 {labour?.phone}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards - Adjusted margin for sticky header */}
      <div className="px-4 -mt-8 relative z-[41]">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { icon: FiBriefcase, label: 'Total Jobs', value: labour?.totalJobs || 0 },
            { icon: FiCheckCircle, label: 'Completed', value: labour?.completedJobs || 0 },
            { icon: FiStar, label: 'Rating', value: labour?.rating ? labour.rating.toFixed(1) : '—' }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Icon className="w-5 h-5 text-teal-500 mx-auto mb-1" />
              <div className="text-xl font-black text-gray-900">{value}</div>
              <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        {/* Online Toggle */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-gray-900 text-lg">Your Status</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
                <span className="text-sm font-bold" style={{ color: statusColor }}>
                  {labour?.status === 'ONLINE' ? 'ONLINE — Accepting bookings' : 
                   labour?.status === 'BUSY' ? 'BUSY — On a job' : 
                   'OFFLINE — Not visible to clients'}
                </span>
              </div>
            </div>
            <button
              onClick={toggleOnline}
              disabled={labour?.status === 'BUSY'}
              className={`relative w-16 h-8 rounded-full transition-all duration-300 ${labour?.status === 'ONLINE' ? 'bg-teal-500' : labour?.status === 'BUSY' ? 'bg-amber-500 opacity-50 cursor-not-allowed' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${labour?.status === 'ONLINE' ? 'left-9' : 'left-1'}`} />
            </button>
          </div>
          {!isOnline && (
            <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-xl p-3">
              💡 Toggle ON to appear in the Labour list so users & vendors can book you.
            </p>
          )}
        </div>

        {/* Skills */}
        {labour?.serviceCategories?.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4">
            <h3 className="font-black text-gray-900 mb-3 text-sm uppercase tracking-wider">Your Skills</h3>
            <div className="flex flex-wrap gap-2">
              {labour.serviceCategories.map(s => (
                <span key={s} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-black rounded-xl border border-orange-100">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <FiClock className="text-orange-500" /> Recent Bookings
          </h3>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <FiTool className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No bookings yet</p>
              <p className="text-xs text-gray-300 mt-1">Go online to start receiving requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map(b => (
                <div 
                  key={b._id} 
                  onClick={() => b.status === 'pending' && handleReopenPopup(b)}
                  className={`flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 transition-all ${
                    b.status === 'pending' ? 'cursor-pointer hover:bg-amber-50 active:scale-[0.98] border-amber-100' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    b.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'
                  }`}>
                    <FiUser className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate">{b.bookedByName || 'Customer'}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{b.bookedByRole || 'User'} • {new Date(b.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                      b.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                      b.status === 'completed' ? 'bg-green-100 text-green-700' :
                      b.status === 'pending' ? 'bg-amber-500 text-white shadow-sm animate-pulse' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {b.status}
                    </span>
                    {b.status === 'accepted' && (
                      <button
                        onClick={() => handleComplete(b._id)}
                        disabled={actionLoading}
                        className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <FiCheckCircle className="w-3 h-3" /> Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Request Popup */}
      {bookingPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-[320px] bg-white rounded-[2.5rem] p-4 shadow-2xl animate-in fade-in zoom-in duration-300 border border-white/20">
            {/* Animated ring */}
            <div className="flex items-center justify-center mb-2">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-xl">
                  <HiLightningBolt className="w-6 h-6 text-white" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-teal-400 animate-ping opacity-40" />
              </div>
            </div>
 
            <div className="text-center mb-3">
              <span className="inline-block bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mb-1">
                New Booking Request
              </span>
              <h2 className="text-lg font-black text-gray-900 leading-tight">Incoming!</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">Someone wants to book you</p>
            </div>
 
            <div className="bg-gray-50 rounded-2xl p-3 mb-3 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <FiUser className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-xs truncate">{bookingPopup.bookerName || 'Customer'}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase truncate">{bookingPopup.bookerRole || 'User'} • {bookingPopup.bookerPhone}</p>
                </div>
              </div>
            </div>
 
            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 mb-5 px-2">
              <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${(popupCountdown / 30) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-teal-600 w-6 text-right">{popupCountdown}s</span>
            </div>
 
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 transition-all active:scale-95 border border-red-100"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-200 hover:from-green-600 hover:to-emerald-700 transition-all active:scale-95"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabourDashboard;
