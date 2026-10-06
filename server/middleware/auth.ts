import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { UserDoc, AcademicAssignmentDoc } from '../models/types.js';

export interface AuthRequest extends Request {
  user?: UserDoc;
  assignments?: AcademicAssignmentDoc[];
  activeAssignment?: AcademicAssignmentDoc;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fyp-jwt-secret-key-change-in-production';

export function signToken(user: UserDoc): string {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      capabilities: user.capabilities,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string };
    let user = await db.Users.findById(decoded.id);

    // Fallback to email lookup if user ID changed after database re-initialization
    if (!user && decoded.email) {
      user = await db.Users.findOne({ email: decoded.email.toLowerCase().trim() });
      if (user) {
        const currentUserId = (user._id || user.id)!;
        if (decoded.id && decoded.id !== currentUserId) {
          await db.AcademicAssignments.updateMany({ userId: decoded.id }, { userId: currentUserId });
          await db.Students.updateMany({ userId: decoded.id }, { userId: currentUserId });
        }
      }
    }

    if (!user || user.accountStatus !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'Invalid token or account is deactivated.' });
      return;
    }

    req.user = user;

    // Fetch user's active academic assignments
    const userId = user._id || user.id;
    const assignments = await db.AcademicAssignments.find({
      userId: userId!,
      status: 'ACTIVE',
    });
    req.assignments = assignments;

    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

export function requireCapability(required: 'ADMIN' | 'FACULTY' | 'STUDENT') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.capabilities.includes('ADMIN') || req.user.capabilities.includes(required)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Access forbidden: Requires ${required} capability.`,
    });
  };
}
