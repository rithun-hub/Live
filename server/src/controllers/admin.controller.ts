import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';

export class AdminController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      return res.status(200).json({ success: true, stats });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const search = req.query.search as string;

      const result = await adminService.listUsers({ page, limit, search });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async toggleUserActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const user = await adminService.toggleUserActive(id, Boolean(isActive));

      return res.status(200).json({
        success: true,
        message: `User account has been ${isActive ? 'activated' : 'deactivated'}.`,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = await adminService.updateUserRole(id, role);

      return res.status(200).json({ success: true, message: 'User role updated.', user });
    } catch (error) {
      next(error);
    }
  }

  async updateDownloadLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { dailyDownloadLimit } = req.body;
      const user = await adminService.updateUserDownloadLimit(id, parseInt(dailyDownloadLimit, 10));

      return res.status(200).json({
        success: true,
        message: 'Daily download limit updated.',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await adminService.listReportedComments();
      return res.status(200).json({ success: true, reports });
    } catch (error) {
      next(error);
    }
  }

  async resolveReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'DISMISS' | 'DELETE_COMMENT'
      const updated = await adminService.resolveReport(id, action);

      return res.status(200).json({
        success: true,
        message: `Report ${action === 'DELETE_COMMENT' ? 'resolved and comment removed' : 'dismissed'}.`,
        report: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async listDownloads(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await adminService.listDownloads({ page, limit });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async listLogins(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await adminService.listLoginHistory({ page, limit });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async listMeetings(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;
      const meetings = await adminService.listActiveMeetings(status);
      return res.status(200).json({ success: true, meetings });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();

