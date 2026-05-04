import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiPhone, FiArrowRight, FiChevronLeft, FiCheckCircle, FiTool } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import api from '../../../services/api';

const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
});

const BRAND = '#347989';

const LabourLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const phoneRef = useRef(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (localStorage.getItem('labourAccessToken')) {
      navigate('/labour/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (step === 'phone') setTimeout(() => phoneRef.current?.focus(), 100);
    else setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [step]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const result = phoneSchema.safeParse({ phone: phoneNumber });
    if (!result.success) { toast.error(result.error.issues[0].message); return; }

    setIsLoading(true);
    try {
      const res = await api.post('/workers/auth/send-otp', { phone: phoneNumber });
      if (res.data.success) {
        setStep('otp');
        setResendTimer(120);
        toast.success('OTP sent successfully');
      } else {
        toast.error(res.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = clean;
    setOtp(newOtp);
    if (clean && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  useEffect(() => {
    const val = otp.join('');
    if (val.length === 6 && !isLoading) handleOtpSubmit();
  }, [otp]);

  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Please enter complete OTP'); return; }

    setIsLoading(true);
    try {
      const res = await api.post('/workers/auth/verify-login', {
        phone: phoneNumber,
        otp: otpValue
      });

      if (res.data.success) {
        setIsLoading(false);
        if (res.data.isNewUser) {
          // New labour → go to register
          navigate('/labour/register', {
            state: { phone: phoneNumber, verificationToken: res.data.verificationToken }
          });
        } else {
          // Existing labour → store tokens and go to dashboard
          localStorage.setItem('labourAccessToken', res.data.accessToken);
          localStorage.setItem('labourRefreshToken', res.data.refreshToken);
          localStorage.setItem('labourData', JSON.stringify(res.data.worker || res.data.vendor || {}));
          toast.success('Welcome back!');
          navigate('/labour/dashboard', { replace: true });
        }
      } else {
        setIsLoading(false);
        toast.error(res.data.message || 'Login failed');
      }
    } catch (err) {
      setIsLoading(false);
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 flex flex-col justify-center py-12 px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-teal-400 opacity-[0.04] rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400 opacity-[0.05] rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-teal-200">
            <FiTool className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
            {step === 'phone' ? (isRegisterMode ? 'Register as Labour' : 'Labour Sign In') : 'Verify OTP'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            {step === 'phone' 
              ? (isRegisterMode ? 'Enter your number to create an account' : 'Login to start receiving booking requests') 
              : `Code sent to +91 ${phoneNumber}`}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/60 p-8 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-400 rounded-t-[2.5rem]" />

          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Phone Number</label>
                <div className="relative rounded-2xl shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold border-r border-gray-200 pr-3">+91</span>
                  </div>
                  <input
                    ref={phoneRef}
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="block w-full pl-28 pr-4 py-4 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all font-bold text-sm"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || phoneNumber.length < 10}
                className="w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-xl shadow-teal-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
              >
                {isLoading ? 'Sending OTP...' : (<>Get Started <FiArrowRight className="w-5 h-5" /></>)}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-xs font-black uppercase tracking-widest text-teal-600 hover:text-teal-700"
                >
                  {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register Now"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => { setOtp(['','','','','','']); setStep('phone'); }}
                className="flex items-center text-xs font-black uppercase tracking-widest text-gray-400 hover:text-teal-600 transition-colors"
              >
                <FiChevronLeft className="mr-1" /> Edit number
              </button>
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-full h-14 text-center text-xl font-black border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                      style={{ backgroundColor: digit ? '#F0FDFA' : 'white' }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (resendTimer > 0) return;
                      try {
                        const res = await api.post('/workers/auth/send-otp', { phone: phoneNumber });
                        if (res.data.success) { setResendTimer(120); toast.success('Code resent!'); }
                      } catch { toast.error('Failed to resend'); }
                    }}
                    disabled={resendTimer > 0}
                    className="text-xs font-black uppercase tracking-widest text-teal-600 disabled:opacity-50"
                  >
                    {resendTimer > 0 ? `Resend in ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,'0')}` : 'Resend code'}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-xl shadow-teal-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isLoading ? 'Verifying...' : (<>Login <FiArrowRight className="w-5 h-5" /></>)}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Back to vendor login */}
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 mt-8">
          Are you a vendor?{' '}
          <Link to="/vendor/login" className="text-teal-600 hover:text-teal-700 transition-colors ml-1">
            Vendor Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LabourLogin;
