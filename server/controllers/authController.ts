import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { AuthRequest, signToken } from '../middleware/auth.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { logAuditEvent } from '../services/auditService.js';

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await db.Users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid academic credentials.' });
      return;
    }

    if (user.accountStatus !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'This academic account has been deactivated.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid academic credentials.' });
      return;
    }

    const userId = user._id || user.id;
    const token = signToken(user);

    // Fetch active assignments
    const assignments = await db.AcademicAssignments.find({
      userId: userId!,
      status: 'ACTIVE',
    });

    // Check if user is a student
    const student = await db.Students.findOne({ userId });

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        capabilities: user.capabilities,
        signatureUrl: user.signatureUrl,
        stampUrl: user.stampUrl,
      },
      assignments,
      student,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server login error' });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userId = req.user._id || req.user.id;
    const assignments = await db.AcademicAssignments.find({
      userId: userId!,
      status: 'ACTIVE',
    });

    const student = await db.Students.findOne({ userId });

    res.json({
      success: true,
      user: {
        id: userId,
        name: req.user.name,
        email: req.user.email,
        capabilities: req.user.capabilities,
        signatureUrl: req.user.signatureUrl,
        stampUrl: req.user.stampUrl,
      },
      assignments,
      student,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userId = (req.user._id || req.user.id)!;
    const { signatureUrl, stampUrl, name } = req.body;

    const updates: any = {};
    if (signatureUrl !== undefined) updates.signatureUrl = signatureUrl;
    if (stampUrl !== undefined) updates.stampUrl = stampUrl;
    if (name) updates.name = name;

    const updatedUser = await db.Users.findByIdAndUpdate(userId, updates, { new: true });

    await logAuditEvent({
      actorId: userId,
      actorName: req.user.name,
      actorRole: req.user.capabilities[0],
      action: 'UPDATE_PROFILE_CREDENTIALS',
      entityType: 'USER',
      entityId: userId,
      metadata: { signatureUpdated: !!signatureUrl, stampUpdated: !!stampUrl },
    });

    res.json({
      success: true,
      message: 'Profile credentials updated successfully.',
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function uploadSignatureOrStamp(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userId = (req.user._id || req.user.id)!;
    const { type, imageBase64, fileName } = req.body;

    if (!type || !imageBase64) {
      res.status(400).json({ success: false, message: 'Asset type and base64 data required.' });
      return;
    }

    const folder = type === 'stamp' ? 'fyp/stamps' : 'fyp/signatures';
    const rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');
    const isSvg = imageBase64.startsWith('data:image/svg');
    const ext = isSvg ? 'svg' : 'png';
    const uploadRes = await uploadToCloudinary(buffer, fileName || `${type}_${userId}.${ext}`, folder);

    const updateField =
      type === 'stamp'
        ? { stampUrl: uploadRes.url, stampDataUrl: imageBase64 }
        : { signatureUrl: uploadRes.url, signatureDataUrl: imageBase64 };
    await db.Users.findByIdAndUpdate(userId, updateField);

    await logAuditEvent({
      actorId: userId,
      actorName: req.user.name,
      actorRole: req.user.capabilities[0],
      action: `UPLOAD_${type.toUpperCase()}`,
      entityType: 'USER',
      entityId: userId,
      metadata: { url: uploadRes.url },
    });

    res.json({
      success: true,
      url: uploadRes.url,
      message: `${type === 'stamp' ? 'Official stamp' : 'Digital signature'} saved to Cloudinary storage.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userId = (req.user._id || req.user.id)!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are required.' });
      return;
    }

    if (String(newPassword).trim().length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const fullUser = await db.Users.findById(userId);
    if (!fullUser) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current portal password is incorrect.' });
      return;
    }

    const trimmedNew = String(newPassword).trim();
    const newHash = await bcrypt.hash(trimmedNew, 10);

    await db.Users.findByIdAndUpdate(userId, {
      passwordHash: newHash,
      visiblePassword: trimmedNew,
    });

    // Also update student record if this user is a student so Coordinator Student Roster always reflects the latest password
    const student = await db.Students.findOne({ userId });
    if (student) {
      await db.Students.findByIdAndUpdate((student._id || student.id)!, {
        portalPassword: trimmedNew,
      });
    }

    await logAuditEvent({
      actorId: userId,
      actorName: req.user.name,
      actorRole: req.user.capabilities[0],
      action: 'CHANGE_PORTAL_PASSWORD',
      entityType: 'USER',
      entityId: userId,
      metadata: { email: req.user.email },
    });

    res.json({
      success: true,
      message: 'Your portal password has been changed successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
}

