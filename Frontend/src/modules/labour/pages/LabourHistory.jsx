import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiUser, FiArrowLeft, FiFilter } from 'react-icons/fi';
import api from '../../../services/api';

const LabourHistory = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('labourAccessToken');

  useEffect(() => {
    if (!token) {
      navigate('/labour/login', { replace: true });
      return;
    }
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/labour/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('[Labour History] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header - Scrollable */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-4 pt-12 pb-8 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white/20 rounded-xl text-white hover:bg-white/30 transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider">Booking History</h1>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-0.5">Your lifetime track record</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse shadow-sm" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-4">
              <FiClock className="w-10 h-10 text-teal-300" />
            </div>
            <h3 className="text-lg font-black text-gray-800">No History Yet</h3>
            <p className="text-sm text-gray-500 mt-1 px-10">Your bookings will appear here once you start receiving requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <FiUser className="w-6 h-6 text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-black text-gray-900 text-sm truncate">{b.bookedByName || 'Customer'}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                      b.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                      b.status === 'completed' ? 'bg-green-100 text-green-700' :
                      b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{b.bookedByRole || 'User'}</p>
                    <p className="text-[10px] text-gray-500 font-bold">{new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {b.note && (
                    <p className="mt-2 text-[11px] text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-100 line-clamp-2 leading-relaxed">
                      "{b.note}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabourHistory;
