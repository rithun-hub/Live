import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  deviceFingerprint: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  deviceType: string;
  deviceModel: string;
  ipAddress: string;
  city: string;
  state: string;
  country: string;
}

export function parseClientInfo(req: Request): DeviceInfo {
  const userAgentString = req.headers['user-agent'] || 'Unknown Agent';
  const parser = new UAParser(userAgentString);
  const ua = parser.getResult();

  // Extract IP
  const forwarded = req.headers['x-forwarded-for'];
  let ipAddress = '127.0.0.1';
  if (typeof forwarded === 'string') {
    ipAddress = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded)) {
    ipAddress = forwarded[0].trim();
  } else if (req.socket.remoteAddress) {
    ipAddress = req.socket.remoteAddress;
  }
  if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
    ipAddress = '127.0.0.1';
  }

  const browserName = ua.browser.name || 'Unknown Browser';
  const browserVersion = ua.browser.version || 'Unknown Version';
  const osName = ua.os.name ? `${ua.os.name} ${ua.os.version || ''}`.trim() : 'Unknown OS';
  const deviceType = ua.device.type ? ua.device.type.charAt(0).toUpperCase() + ua.device.type.slice(1) : 'Desktop';
  const deviceModel = ua.device.model || 'Standard Device';

  // Deterministic device fingerprint
  const fingerprintSource = `${browserName}-${ua.browser.major || ''}-${ua.os.name || ''}-${deviceType}`;
  const deviceFingerprint = Buffer.from(fingerprintSource).toString('base64');

  // Approximate location (honoring requirement: never claim precise location when only approximate IP is available)
  let city = 'Local Development Area';
  let state = 'Local Region';
  let country = 'Localhost';

  if (ipAddress !== '127.0.0.1') {
    city = 'Approx. Region';
    state = 'Approx. State';
    country = 'Approx. Country';
  }

  return {
    deviceFingerprint,
    browserName,
    browserVersion,
    osName,
    deviceType,
    deviceModel,
    ipAddress,
    city,
    state,
    country,
  };
}

/**
 * Determine theme based on IST (Asia/Kolkata) login time:
 * 5:00 AM to 12:00 PM: light theme
 * All other times: dark theme
 */
export function calculateISTTheme(): 'LIGHT' | 'DARK' {
  // Compute current date & time in IST (UTC + 5:30)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffsetHours = 5.5;
  const istDate = new Date(utc + 3600000 * istOffsetHours);

  const istHour = istDate.getHours();
  // 5:00 AM (inclusive) to 12:00 PM (12:00 noon, exclusive of afternoon)
  if (istHour >= 5 && istHour < 12) {
    return 'LIGHT';
  }
  return 'DARK';
}
