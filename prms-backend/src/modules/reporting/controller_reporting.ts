import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as reportingService from './service_reporting';
import { successResponse } from '../../utils/response';

export class ReportingController {
  dashboard = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await reportingService.getDashboardStats();
      res.json(successResponse(stats));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  revenue = async (req: Request, res: Response) => {
    try {
      const report = await reportingService.getRevenueReport(req.query.month as any, req.query.year as any);
      res.json(successResponse(report));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  properties = async (req: Request, res: Response) => {
    try {
      const report = await reportingService.getPropertyReport();
      res.json(successResponse(report));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  occupancy = async (req: Request, res: Response) => {
    try {
      const report = await reportingService.getOccupancyReport();
      res.json(successResponse(report));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
