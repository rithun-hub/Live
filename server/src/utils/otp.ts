import crypto from 'crypto';

export function generateOTPCode(length = 6): string {
  // Generate random 6-digit numeric OTP
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function verifyOTPHash(otp: string, storedHash: string): boolean {
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

// Simulated / production email OTP dispatcher
export async function sendOTPEmail(email: string, otp: string, purpose: string): Promise<void> {
  const purposeDescriptions: Record<string, string> = {
    REGISTRATION: 'Verify your new LIVE account registration',
    LOGIN_NEW_DEVICE: 'Authorize login from a new or untrusted device',
    PASSWORD_RESET: 'Reset your LIVE account password',
  };

  const subject = purposeDescriptions[purpose] || 'Your LIVE Verification Code';
  console.log(`\n======================================================`);
  console.log(`[LIVE OTP DISPATCHER]`);
  console.log(`To: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`Code: [ ${otp} ] (Valid for 10 minutes)`);
  console.log(`Purpose: ${purpose}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);
}
