import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface OtpModalProps {
  isOpen: boolean;
  email: string;
  purpose: 'REGISTRATION' | 'LOGIN_NEW_DEVICE' | 'PASSWORD_RESET';
  devOtp?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  email,
  purpose,
  devOtp,
  onClose,
  onSuccess,
}) => {
  const { verifyOtp, resendOtp } = useAuth();
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await verifyOtp({
        email,
        otp: fullOtp,
        purpose,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      await resendOtp(email, purpose);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const fillDevOtp = () => {
    if (devOtp && devOtp.length === 6) {
      setOtpDigits(devOtp.split(''));
    }
  };

  const titleMap = {
    REGISTRATION: 'Verify Your Email Address',
    LOGIN_NEW_DEVICE: 'New Device Verification',
    PASSWORD_RESET: 'Password Reset Verification',
  };

  const descMap = {
    REGISTRATION: `We sent a 6-digit verification code to ${email} to activate your LIVE account.`,
    LOGIN_NEW_DEVICE: `A login from an untrusted browser/device was detected. Please verify your identity code sent to ${email}.`,
    PASSWORD_RESET: `Enter the 6-digit recovery code sent to ${email}.`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#181a1d] rounded-2xl border border-zinc-200 dark:border-[#26292e] shadow-2xl p-6 text-center">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Header Icon */}
        <div className="w-14 h-14 mx-auto -mt-2 mb-3 rounded-2xl bg-[#e04f38]/12 text-[#e04f38] border border-[#e04f38]/20 flex items-center justify-center">
          <ShieldCheck size={28} />
        </div>

        <h3 className="font-heading font-bold text-lg text-zinc-900 dark:text-zinc-100">
          {titleMap[purpose]}
        </h3>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
          {descMap[purpose]}
        </p>

        {devOtp && (
          <div className="mt-3 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs flex items-center justify-between">
            <span className="text-zinc-500 font-mono">Dev Code: <strong className="text-[#e04f38]">{devOtp}</strong></span>
            <button
              type="button"
              onClick={fillDevOtp}
              className="text-[#e04f38] hover:underline font-semibold flex items-center gap-1"
            >
              <KeyRound size={12} /> Auto-Fill
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-left">
            {error}
          </div>
        )}

        {/* 6 Digits Input */}
        <form onSubmit={handleVerify} className="mt-6 space-y-5">
          <div className="flex justify-center gap-2">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 text-center text-xl font-bold font-mono rounded-xl bg-zinc-50 dark:bg-[#111316] border border-zinc-300 dark:border-[#2a2e35] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38] focus:ring-1 focus:ring-[#e04f38] transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isVerifying || otpDigits.join('').length !== 6}
            className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-[#e04f38] hover:bg-[#cc422d] disabled:opacity-40 transition-colors shadow-md"
          >
            {isVerifying ? 'Verifying Code...' : 'Confirm & Authenticate'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
          <span>Didn't receive a code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isResending}
            className="text-[#e04f38] hover:underline font-semibold disabled:text-zinc-500 disabled:no-underline flex items-center gap-1"
          >
            <RefreshCw size={12} className={isResending ? 'animate-spin' : ''} />
            <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

