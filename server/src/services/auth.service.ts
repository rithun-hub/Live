import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt';
import { generateOTPCode, hashOTP, verifyOTPHash, sendOTPEmail } from '../utils/otp';
import { DeviceInfo, calculateISTTheme } from '../utils/geo';
import { ENV } from '../config/env';

export class AuthService {
  async register(
    data: {
      email: string;
      username: string;
      password: string;
      displayName: string;
    },
    deviceInfo: DeviceInfo
  ) {
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new Error('An account with this email already exists.');
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUsername) {
      throw new Error('This username is already taken. Please choose another.');
    }

    const passwordHash = await hashPassword(data.password);

    // Initial theme according to IST
    const initialTheme = calculateISTTheme();

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        isEmailVerified: false,
        profile: {
          create: {
            displayName: data.displayName,
          },
        },
        preference: {
          create: {
            theme: initialTheme,
          },
        },
        trustedDevices: {
          create: {
            deviceFingerprint: deviceInfo.deviceFingerprint,
            browserName: deviceInfo.browserName,
            browserVersion: deviceInfo.browserVersion,
            osName: deviceInfo.osName,
            deviceType: deviceInfo.deviceType,
          },
        },
      },
    });

    // Generate Registration OTP
    const rawOtp = generateOTPCode();
    const otpHash = hashOTP(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.oTPVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        otpHash,
        purpose: 'REGISTRATION',
        deviceFingerprint: deviceInfo.deviceFingerprint,
        expiresAt,
      },
    });

    await sendOTPEmail(user.email, rawOtp, 'REGISTRATION');

    return {
      userId: user.id,
      email: user.email,
      requiresVerification: true,
      message: 'Registration successful. A verification OTP has been sent to your email.',
      // For smooth local developer experience, also expose devOtp if in dev mode
      devOtp: ENV.NODE_ENV === 'development' ? rawOtp : undefined,
    };
  }

  async login(
    data: { emailOrUsername: string; password: string },
    deviceInfo: DeviceInfo
  ) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.emailOrUsername.toLowerCase() },
          { username: data.emailOrUsername },
        ],
      },
      include: {
        profile: true,
        preference: true,
        trustedDevices: true,
      },
    });

    if (!user) {
      // Record failed attempt
      await prisma.loginHistory.create({
        data: {
          attemptedEmail: data.emailOrUsername,
          ipAddress: deviceInfo.ipAddress,
          browserName: deviceInfo.browserName,
          browserVersion: deviceInfo.browserVersion,
          osName: deviceInfo.osName,
          deviceType: deviceInfo.deviceType,
          deviceModel: deviceInfo.deviceModel,
          city: deviceInfo.city,
          state: deviceInfo.state,
          country: deviceInfo.country,
          isSuccess: false,
          failureReason: 'User not found',
        },
      });
      throw new Error('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          attemptedEmail: user.email,
          ipAddress: deviceInfo.ipAddress,
          browserName: deviceInfo.browserName,
          browserVersion: deviceInfo.browserVersion,
          osName: deviceInfo.osName,
          deviceType: deviceInfo.deviceType,
          deviceModel: deviceInfo.deviceModel,
          city: deviceInfo.city,
          state: deviceInfo.state,
          country: deviceInfo.country,
          isSuccess: false,
          failureReason: 'Invalid credentials',
        },
      });
      throw new Error('Invalid email or password.');
    }

    // Check if device is trusted
    const isDeviceTrusted = user.trustedDevices.some(
      (td) => td.deviceFingerprint === deviceInfo.deviceFingerprint
    );

    // If new / untrusted device, trigger email OTP
    if (!isDeviceTrusted && user.isEmailVerified) {
      const rawOtp = generateOTPCode();
      const otpHash = hashOTP(rawOtp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.oTPVerification.create({
        data: {
          userId: user.id,
          email: user.email,
          otpHash,
          purpose: 'LOGIN_NEW_DEVICE',
          deviceFingerprint: deviceInfo.deviceFingerprint,
          expiresAt,
        },
      });

      await sendOTPEmail(user.email, rawOtp, 'LOGIN_NEW_DEVICE');

      return {
        requiresOtp: true,
        userId: user.id,
        email: user.email,
        purpose: 'LOGIN_NEW_DEVICE',
        message: 'New device detected. Please verify your identity with the OTP sent to your email.',
        devOtp: ENV.NODE_ENV === 'development' ? rawOtp : undefined,
      };
    }

    // If registered but email not verified yet
    if (!user.isEmailVerified) {
      const rawOtp = generateOTPCode();
      const otpHash = hashOTP(rawOtp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.oTPVerification.create({
        data: {
          userId: user.id,
          email: user.email,
          otpHash,
          purpose: 'REGISTRATION',
          deviceFingerprint: deviceInfo.deviceFingerprint,
          expiresAt,
        },
      });

      await sendOTPEmail(user.email, rawOtp, 'REGISTRATION');

      return {
        requiresOtp: true,
        userId: user.id,
        email: user.email,
        purpose: 'REGISTRATION',
        message: 'Please verify your email address to complete registration.',
        devOtp: ENV.NODE_ENV === 'development' ? rawOtp : undefined,
      };
    }

    // Determine Theme according to IST login rule:
    // 5 AM to 12 PM -> Light theme; other times -> Dark theme
    // If user preference is 'AUTO', apply IST theme; if user explicitly set 'DARK' or 'LIGHT', honor their persisted manual preference
    let activeTheme = user.preference?.theme || 'AUTO';
    if (activeTheme === 'AUTO') {
      activeTheme = calculateISTTheme();
    }

    // Record Successful Login History
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        attemptedEmail: user.email,
        ipAddress: deviceInfo.ipAddress,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        osName: deviceInfo.osName,
        deviceType: deviceInfo.deviceType,
        deviceModel: deviceInfo.deviceModel,
        city: deviceInfo.city,
        state: deviceInfo.state,
        country: deviceInfo.country,
        isSuccess: true,
      },
    });

    // Update or add trusted device
    await prisma.trustedDevice.upsert({
      where: {
        userId_deviceFingerprint: {
          userId: user.id,
          deviceFingerprint: deviceInfo.deviceFingerprint,
        },
      },
      create: {
        userId: user.id,
        deviceFingerprint: deviceInfo.deviceFingerprint,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        osName: deviceInfo.osName,
        deviceType: deviceInfo.deviceType,
      },
      update: {
        lastUsedAt: new Date(),
      },
    });

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save session
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceFingerprint: deviceInfo.deviceFingerprint,
        userAgent: `${deviceInfo.browserName} on ${deviceInfo.osName}`,
        ipAddress: deviceInfo.ipAddress,
        expiresAt: sessionExpiresAt,
      },
    });

    return {
      requiresOtp: false,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.profile,
        preference: {
          ...user.preference,
          activeTheme,
        },
      },
    };
  }

  async verifyOtp(
    data: { email: string; otp: string; purpose: string },
    deviceInfo: DeviceInfo
  ) {
    const record = await prisma.oTPVerification.findFirst({
      where: {
        email: data.email,
        purpose: data.purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { include: { profile: true, preference: true } } },
    });

    if (!record) {
      throw new Error('Invalid or expired OTP. Please request a new code.');
    }

    if (record.attempts >= 5) {
      throw new Error('Maximum OTP attempts exceeded. Please request a new code.');
    }

    const isValid = verifyOTPHash(data.otp, record.otpHash);
    if (!isValid) {
      await prisma.oTPVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new Error('Invalid OTP code. Please check and try again.');
    }

    // Mark OTP as used
    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { isUsed: true },
    });

    if (!record.userId || !record.user) {
      return { success: true, message: 'OTP verified successfully.' };
    }

    // Mark email as verified if registration
    if (data.purpose === 'REGISTRATION') {
      await prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      });
    }

    // Trust this device
    await prisma.trustedDevice.upsert({
      where: {
        userId_deviceFingerprint: {
          userId: record.userId,
          deviceFingerprint: deviceInfo.deviceFingerprint,
        },
      },
      create: {
        userId: record.userId,
        deviceFingerprint: deviceInfo.deviceFingerprint,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        osName: deviceInfo.osName,
        deviceType: deviceInfo.deviceType,
      },
      update: {
        lastUsedAt: new Date(),
      },
    });

    // Record login history
    await prisma.loginHistory.create({
      data: {
        userId: record.userId,
        attemptedEmail: record.email,
        ipAddress: deviceInfo.ipAddress,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        osName: deviceInfo.osName,
        deviceType: deviceInfo.deviceType,
        deviceModel: deviceInfo.deviceModel,
        city: deviceInfo.city,
        state: deviceInfo.state,
        country: deviceInfo.country,
        isSuccess: true,
      },
    });

    const tokenPayload: TokenPayload = {
      userId: record.user.id,
      email: record.user.email,
      username: record.user.username,
      role: record.user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.userSession.create({
      data: {
        userId: record.user.id,
        refreshToken,
        deviceFingerprint: deviceInfo.deviceFingerprint,
        userAgent: `${deviceInfo.browserName} on ${deviceInfo.osName}`,
        ipAddress: deviceInfo.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    let activeTheme = record.user.preference?.theme || 'AUTO';
    if (activeTheme === 'AUTO') {
      activeTheme = calculateISTTheme();
    }

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: record.user.id,
        email: record.user.email,
        username: record.user.username,
        role: record.user.role,
        profile: record.user.profile,
        preference: {
          ...record.user.preference,
          activeTheme,
        },
      },
    };
  }

  async resendOtp(email: string, purpose: string, deviceInfo: DeviceInfo) {
    const rawOtp = generateOTPCode();
    const otpHash = hashOTP(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.findUnique({ where: { email } });

    await prisma.oTPVerification.create({
      data: {
        userId: user?.id,
        email,
        otpHash,
        purpose,
        deviceFingerprint: deviceInfo.deviceFingerprint,
        expiresAt,
      },
    });

    await sendOTPEmail(email, rawOtp, purpose);

    return {
      success: true,
      message: 'A fresh verification code has been sent to your email.',
      devOtp: ENV.NODE_ENV === 'development' ? rawOtp : undefined,
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    const session = await prisma.userSession.findFirst({
      where: {
        refreshToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: { profile: true, preference: true },
        },
      },
    });

    if (!session || !session.user || !session.user.isActive) {
      throw new Error('Session invalid, revoked, or expired. Please sign in again.');
    }

    const tokenPayload: TokenPayload = {
      userId: session.user.id,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Rotate refresh token
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        lastActiveAt: new Date(),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        role: session.user.role,
        profile: session.user.profile,
        preference: session.user.preference,
      },
    };
  }

  async logout(refreshToken: string) {
    await prisma.userSession.updateMany({
      where: { refreshToken },
      data: { revokedAt: new Date() },
    });
    return { success: true, message: 'Logged out successfully.' };
  }

  async getActiveSessions(userId: string) {
    return prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async getTrustedDevices(userId: string) {
    return prisma.trustedDevice.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async removeTrustedDevice(userId: string, deviceId: string) {
    await prisma.trustedDevice.deleteMany({
      where: { id: deviceId, userId },
    });
    return { success: true };
  }

  async getLoginHistory(userId: string) {
    return prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });
  }

  async updateUserPreference(
    userId: string,
    data: {
      theme?: string;
      preferredLanguage?: string;
      emailNotifications?: boolean;
      autoPlayNext?: boolean;
      defaultQuality?: string;
    }
  ) {
    return prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: {
        ...data,
      },
    });
  }
}

export const authService = new AuthService();

