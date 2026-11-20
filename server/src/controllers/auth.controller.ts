import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { parseClientInfo } from '../utils/geo';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  refreshTokenSchema,
  updatePreferenceSchema,
} from '../validators/auth.validator';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const deviceInfo = parseClientInfo(req);
      const result = await authService.register(validated, deviceInfo);

      return res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const deviceInfo = parseClientInfo(req);
      const result = await authService.login(validated, deviceInfo);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = verifyOtpSchema.parse(req.body);
      const deviceInfo = parseClientInfo(req);
      const result = await authService.verifyOtp(validated, deviceInfo);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resendOtpSchema.parse(req.body);
      const deviceInfo = parseClientInfo(req);
      const result = await authService.resendOtp(validated.email, validated.purpose, deviceInfo);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const result = await authService.refresh(validated.refreshToken);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessions = await authService.getActiveSessions(req.user!.userId);
      return res.status(200).json({ success: true, sessions });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      await authService.revokeSession(req.user!.userId, sessionId);
      return res.status(200).json({ success: true, message: 'Session revoked successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async getTrustedDevices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const devices = await authService.getTrustedDevices(req.user!.userId);
      return res.status(200).json({ success: true, devices });
    } catch (error) {
      next(error);
    }
  }

  async removeTrustedDevice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { deviceId } = req.params;
      await authService.removeTrustedDevice(req.user!.userId, deviceId);
      return res.status(200).json({ success: true, message: 'Device removed from trusted list.' });
    } catch (error) {
      next(error);
    }
  }

  async getLoginHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const history = await authService.getLoginHistory(req.user!.userId);
      return res.status(200).json({ success: true, history });
    } catch (error) {
      next(error);
    }
  }

  async updatePreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = updatePreferenceSchema.parse(req.body);
      const updated = await authService.updateUserPreference(req.user!.userId, validated);
      return res.status(200).json({ success: true, preference: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

