import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { vendorTheme as themeColors } from '../../../../theme';
import Logo from '../../../../components/common/Logo';
import api from '../../../../services/api';
import { vendorDashboardService } from '../../services/dashboardService';
import { toast } from 'react-hot-toast';

const Header = memo(({
  title,
  onBack,
  showBack = true,
  showSearch = false,
  showNotifications = true,
  notificationCount = 0,
  showOnlineToggle = true
}) => {
  const navigate = useNavigate();
  const [count, setCount] = useState(notificationCount);

  // Sync prop changes
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Fetch unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications/vendor');
        if (res.data.success && typeof res.data.unreadCount === 'number') {
          setCount(res.data.unreadCount);
        }
      } catch (error) {
        // Silent fail
      }
    };

    if (showNotifications) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [showNotifications]);

  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Sync online status
  useEffect(() => {
    const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
    if (vendorData.isOnline !== undefined) {
      setIsOnline(vendorData.isOnline);
    }

    const handleStatusUpdate = (e) => {
      if (e.detail?.isOnline !== undefined) {
        setIsOnline(e.detail.isOnline);
      }
    };

    window.addEventListener('vendorStatusChanged', handleStatusUpdate);
    return () => window.removeEventListener('vendorStatusChanged', handleStatusUpdate);
  }, []);

  const handleToggleOnline = async (e) => {
    e.stopPropagation();
    try {
      setIsToggling(true);
      const newStatus = !isOnline;
      const response = await vendorDashboardService.updateStatus(newStatus);
      if (response.success) {
        setIsOnline(newStatus);
        toast.success(`You are now ${newStatus ? 'Online' : 'Offline'}`);
        
        // Update localStorage
        const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        vendorData.isOnline = newStatus;
        localStorage.setItem('vendorData', JSON.stringify(vendorData));

        // Dispatch event for other components (like Dashboard)
        window.dispatchEvent(new CustomEvent('vendorStatusChanged', { detail: { isOnline: newStatus } }));
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleNotifications = () => {
    navigate('/vendor/notifications');
  };

  const handleLogoClick = () => {
    navigate('/vendor/dashboard');
  };

  return (
    <header
      className="w-full bg-[#fdfbff]"
      style={{
        borderBottom: '1.5px solid rgba(150, 52, 247, 0.15)',
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <motion.button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-white/30 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <FiArrowLeft className="w-5 h-5" style={{ color: themeColors.button }} />
            </motion.button>
          ) : (
            <motion.div
              className="cursor-pointer"
              onClick={handleLogoClick}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Logo className="h-12 w-auto" />
            </motion.div>
          )}
          {showBack && <h1 className="text-lg font-bold text-gray-800">{title || 'Vendor'}</h1>}
        </div>

        {/* Right: Search and Notifications */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <button
              className="p-2 rounded-full hover:bg-white/30 transition-colors active:scale-95"
              onClick={() => navigate('/vendor/jobs')}
            >
              <FiSearch className="w-5 h-5" style={{ color: themeColors.button }} />
            </button>
          )}
          
          {showOnlineToggle && (
            <div className="flex items-center gap-2 mr-1">
              <button
                onClick={handleToggleOnline}
                disabled={isToggling}
                className={`relative w-11 h-6 rounded-full transition-all duration-500 flex items-center px-1 shadow-inner ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <motion.div
                  animate={{ x: isOnline ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center"
                >
                  {isToggling ? (
                    <div className="w-2 h-2 border-2 border-[#9634f7] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  )}
                </motion.div>
              </button>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter w-14">
                {isOnline ? 'Go Offline' : 'Go Online'}
              </span>
            </div>
          )}

          {showNotifications && (
            <motion.div
              className="relative cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.button
                onClick={handleNotifications}
                className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              >
                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-center"
                >
                  <img 
                    src="https://cdn-icons-gif.flaticon.com/8721/8721062.gif" 
                    alt="Notifications" 
                    className="w-7 h-7 object-contain"
                    style={{
                      mixBlendMode: 'multiply',
                      filter: count > 0 
                        ? 'drop-shadow(0 2px 8px rgba(239, 68, 68, 0.4))' 
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                  />
                </motion.div>
              </motion.button>
              {/* 4. Active Badge (Moved outside for robustness and to prevent clipping) */}
              {count > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center z-20"
                  style={{
                    minWidth: '20px',
                    height: '20px',
                    boxShadow: '0 3px 8px rgba(239, 68, 68, 0.5), 0 0 0 2px #fff',
                    border: '2px solid #fff'
                  }}
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'VendorHeader';
export default Header;
