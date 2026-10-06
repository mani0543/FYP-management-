import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { db } from '../config/db.js';

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.capabilities.includes('ADMIN')) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Requires Super Admin authority.',
    });
    return;
  }
  next();
}

export function requireCoordinatorAccess(getBatchAndSemester?: (req: AuthRequest) => { batchId?: string; semester?: number }) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Super Admin has system-wide override
    if (req.user.capabilities.includes('ADMIN')) {
      next();
      return;
    }

    const userId = req.user._id || req.user.id;
    let targetBatchId: string | undefined;
    let targetSemester: number | undefined;

    if (getBatchAndSemester) {
      const target = getBatchAndSemester(req);
      targetBatchId = target.batchId;
      targetSemester = target.semester;
    } else {
      targetBatchId = (req.params.batchId || req.query.batchId || req.body.batchId) as string;
      const semStr = (req.params.semester || req.query.semester || req.body.semester) as string;
      if (semStr) targetSemester = parseInt(semStr, 10);
    }

    // Check if user has an active COORDINATOR assignment
    const query: any = {
      userId,
      responsibility: 'COORDINATOR',
      status: 'ACTIVE',
    };

    if (targetBatchId) {
      query.batchId = targetBatchId;
    }
    if (targetSemester) {
      query.semesterNumber = targetSemester;
    }

    const matchingAssignment = await db.AcademicAssignments.findOne(query);

    if (!matchingAssignment) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You are not assigned as Coordinator for this batch and semester.',
      });
      return;
    }

    req.activeAssignment = matchingAssignment;
    next();
  };
}

export function requireSupervisorAccess(getTeamId?: (req: AuthRequest) => string | undefined) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.capabilities.includes('ADMIN')) {
      next();
      return;
    }

    const userId = req.user._id || req.user.id;
    const teamId = getTeamId ? getTeamId(req) : (req.params.teamId || req.body.teamId || req.query.teamId) as string;

    if (teamId) {
      const team = await db.Teams.findById(teamId);
      if (!team) {
        res.status(404).json({ success: false, message: 'Team not found' });
        return;
      }

      // Check if user is the assigned supervisor of this specific team
      if (team.supervisorId === userId) {
        next();
        return;
      }
    }

    // Check if user is assigned as SUPERVISOR or COORDINATOR (Coordinators automatically have Supervisor privileges)
    const batchId = (req.params.batchId || req.query.batchId || req.body.batchId) as string;
    const userAssignments = await db.AcademicAssignments.find({
      userId,
      status: 'ACTIVE',
    });

    const hasAssignment = userAssignments.find(
      (a: any) =>
        (a.responsibility === 'SUPERVISOR' || a.responsibility === 'COORDINATOR') &&
        (!batchId || a.batchId === batchId)
    );

    if (hasAssignment) {
      req.activeAssignment = hasAssignment;
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Access denied: You are not assigned as Supervisor or Coordinator for this team or batch.',
    });
  };
}

export function requireTeamMember(req: AuthRequest, res: Response, next: NextFunction): void {
  (async () => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.capabilities.includes('ADMIN')) {
      next();
      return;
    }

    const userId = req.user._id || req.user.id;
    const student = await db.Students.findOne({ userId });

    if (!student) {
      res.status(403).json({ success: false, message: 'Only registered students can perform this action.' });
      return;
    }

    const teamId = (req.params.teamId || req.body.teamId || req.query.teamId) as string;
    if (teamId && student.teamId && student.teamId !== teamId) {
      res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team.' });
      return;
    }

    next();
  })().catch(next);
}
