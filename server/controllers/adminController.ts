import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { seedInitialData, purgeAllDummyData } from '../seed/seedData.js';

export async function getAdminStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalUsers = await db.Users.countDocuments();
    const totalBatches = await db.Batches.countDocuments();
    const totalTeams = await db.Teams.countDocuments();
    const totalProposals = await db.Proposals.countDocuments();
    const activeAssignments = await db.AcademicAssignments.find({ status: 'ACTIVE' });
    const auditCount = await db.AuditLogs.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBatches,
        totalTeams,
        totalProposals,
        activeAssignmentsCount: activeAssignments.length,
        auditCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await db.Users.find();
    const sanitized = users.map((u: any) => ({
      id: u._id || u.id,
      name: u.name,
      email: u.email,
      capabilities: u.capabilities,
      accountStatus: u.accountStatus,
      visiblePassword:
        u.visiblePassword ||
        (u.capabilities?.includes('STUDENT')
          ? 'Student@123'
          : u.capabilities?.includes('ADMIN')
          ? 'Admin@123'
          : 'Faculty@123'),
      signatureUrl: u.signatureUrl,
      stampUrl: u.stampUrl,
      createdAt: u.createdAt,
    }));
    res.json({ success: true, users: sanitized });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, capabilities, registrationNo, batchId } = req.body;

    if (!name || !email || !password || !capabilities || capabilities.length === 0) {
      res.status(400).json({ success: false, message: 'All required fields must be provided.' });
      return;
    }

    const existing = await db.Users.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const trimmedPassword = String(password).trim();
    const passwordHash = await bcrypt.hash(trimmedPassword, 10);
    const newUser = await db.Users.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      visiblePassword: trimmedPassword,
      accountStatus: 'ACTIVE',
      capabilities,
    });

    const actorId = (req.user?._id || req.user?.id)!;
    const newUserId = (newUser._id || newUser.id)!;

    // If student capability, create student record
    if (capabilities.includes('STUDENT') && registrationNo && batchId) {
      await db.Students.create({
        userId: newUserId,
        batchId,
        registrationNo: registrationNo.toUpperCase().trim(),
        name,
        email: email.toLowerCase().trim(),
        portalPassword: trimmedPassword,
        status: 'ACTIVE',
      });
    }

    await logAuditEvent({
      actorId,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'ADMIN',
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUserId,
      metadata: { email, capabilities },
    });

    res.json({
      success: true,
      message: 'Academic account created successfully.',
      user: {
        id: newUserId,
        name: newUser.name,
        email: newUser.email,
        capabilities: newUser.capabilities,
        accountStatus: newUser.accountStatus,
        visiblePassword: trimmedPassword,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(accountStatus)) {
      res.status(400).json({ success: false, message: 'Invalid status.' });
      return;
    }

    const updated = await db.Users.findByIdAndUpdate(id, { accountStatus }, { new: true });
    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'ADMIN',
      action: 'UPDATE_USER_STATUS',
      entityType: 'USER',
      entityId: id,
      metadata: { newStatus: accountStatus },
    });

    res.json({ success: true, message: `User status changed to ${accountStatus}.`, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getBatches(req: AuthRequest, res: Response): Promise<void> {
  try {
    const batches = await db.Batches.find();
    res.json({ success: true, batches });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createBatch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, program, academicYear, currentSemester } = req.body;

    if (!name || !program || !academicYear) {
      res.status(400).json({ success: false, message: 'Name, program, and academic year are required.' });
      return;
    }

    const newBatch = await db.Batches.create({
      name,
      program,
      academicYear,
      currentSemester: currentSemester || 7,
      status: 'ACTIVE',
      registrationOpen: false,
      portalsCreated: false,
    });

    const batchId = (newBatch._id || newBatch.id)!;

    // Create semester records
    await db.Semesters.create([
      { batchId, semesterNumber: 7, status: currentSemester === 8 ? 'LOCKED' : 'ACTIVE' },
      { batchId, semesterNumber: 8, status: currentSemester === 8 ? 'ACTIVE' : 'UPCOMING' },
    ]);

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'ADMIN',
      action: 'CREATE_BATCH',
      entityType: 'BATCH',
      entityId: batchId,
      metadata: { name, program, academicYear },
    });

    res.json({ success: true, message: 'Batch initialized successfully.', batch: newBatch });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateBatch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db.Batches.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      res.status(404).json({ success: false, message: 'Batch not found.' });
      return;
    }

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'ADMIN',
      action: 'UPDATE_BATCH',
      entityType: 'BATCH',
      entityId: id,
      metadata: updates,
    });

    res.json({ success: true, message: 'Batch updated successfully.', batch: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function advanceBatchSemester(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { targetSemester } = req.body;

    const batch = await db.Batches.findById(id);
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found.' });
      return;
    }

    const prevSemester = batch.currentSemester;
    await db.Batches.findByIdAndUpdate(id, { currentSemester: targetSemester });

    if (targetSemester === 8) {
      // Mark Sem 7 as LOCKED, Sem 8 as ACTIVE
      await db.Semesters.updateOne({ batchId: id, semesterNumber: 7 }, { status: 'LOCKED' });
      await db.Semesters.updateOne({ batchId: id, semesterNumber: 8 }, { status: 'ACTIVE' });
    }

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'ADMIN',
      action: 'ADVANCE_BATCH_SEMESTER',
      entityType: 'BATCH',
      entityId: id,
      batchId: id,
      semesterNumber: targetSemester,
      metadata: { fromSemester: prevSemester, toSemester: targetSemester },
    });

    res.json({
      success: true,
      message: `Batch transitioned to Semester ${targetSemester}. Historical Semester ${prevSemester} records are strictly preserved and locked.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAssignments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId, semester } = req.query;
    const filter: any = {};
    if (batchId) filter.batchId = batchId;
    if (semester) filter.semesterNumber = parseInt(semester as string, 10);

    const assignments = await db.AcademicAssignments.find(filter);
    res.json({ success: true, assignments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createAcademicAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId, batchId, semesterNumber, responsibility } = req.body;

    if (!userId || !batchId || !semesterNumber || !responsibility) {
      res.status(400).json({
        success: false,
        message: 'User, batch, semester number, and responsibility are required.',
      });
      return;
    }

    const user = await db.Users.findById(userId);
    const batch = await db.Batches.findById(batchId);

    if (!user || !batch) {
      res.status(404).json({ success: false, message: 'User or Batch not found.' });
      return;
    }

    // Check if there is already an active coordinator for this batch + semester
    if (responsibility === 'COORDINATOR') {
      const existingCoordinator = await db.AcademicAssignments.findOne({
        batchId,
        semesterNumber,
        responsibility: 'COORDINATOR',
        status: 'ACTIVE',
      });

      if (existingCoordinator && existingCoordinator.userId !== userId) {
        const existId = (existingCoordinator._id || existingCoordinator.id)!;
        // Change coordinator without altering historical logs
        await db.AcademicAssignments.findByIdAndUpdate(existId, {
          status: 'COMPLETED',
          endDate: new Date().toISOString(),
        });

        await logAuditEvent({
          actorId: (req.user?._id || req.user?.id)!,
          actorName: req.user?.name || 'Super Admin',
          actorRole: 'ADMIN',
          action: 'COORDINATOR_REASSIGNMENT',
          entityType: 'ACADEMIC_ASSIGNMENT',
          entityId: existId,
          batchId,
          semesterNumber,
          metadata: {
            previousCoordinator: existingCoordinator.userName,
            newCoordinator: user.name,
            reason: 'Semester Coordinator Transition. Historical approvals remain attributed to original coordinator.',
          },
        });
      }
    }

    // Check if exact same assignment already active
    const duplicate = await db.AcademicAssignments.findOne({
      userId,
      batchId,
      semesterNumber,
      responsibility,
      status: 'ACTIVE',
    });

    if (duplicate) {
      res.status(400).json({
        success: false,
        message: 'This user is already actively assigned to this responsibility for this batch and semester.',
      });
      return;
    }

    const actorId = (req.user?._id || req.user?.id)!;
    const actorName = req.user?.name || 'Super Admin';

    const newAssignment = await db.AcademicAssignments.create({
      userId,
      userName: user.name,
      userEmail: user.email,
      batchId,
      batchName: batch.name,
      semesterNumber,
      responsibility,
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: actorId,
      assignedByName: actorName,
    });

    await logAuditEvent({
      actorId,
      actorName,
      actorRole: 'ADMIN',
      action: `ASSIGN_${responsibility}`,
      entityType: 'ACADEMIC_ASSIGNMENT',
      entityId: (newAssignment._id || newAssignment.id)!,
      batchId,
      semesterNumber,
      metadata: { userName: user.name, responsibility, batchName: batch.name },
    });

    res.json({
      success: true,
      message: `${user.name} assigned as ${responsibility} for ${batch.name} (Semester ${semesterNumber}).`,
      assignment: newAssignment,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function revokeAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const assignment = await db.AcademicAssignments.findById(id);

    if (!assignment) {
      res.status(404).json({ success: false, message: 'Assignment record not found.' });
      return;
    }

    await db.AcademicAssignments.findByIdAndUpdate(id, {
      status: 'REVOKED',
      endDate: new Date().toISOString(),
    });

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'ADMIN',
      action: 'REVOKE_ASSIGNMENT',
      entityType: 'ACADEMIC_ASSIGNMENT',
      entityId: id,
      batchId: assignment.batchId,
      semesterNumber: assignment.semesterNumber,
      metadata: { responsibility: assignment.responsibility, user: assignment.userName },
    });

    res.json({ success: true, message: 'Assignment successfully revoked.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSystemSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    let settings = await db.SystemSettings.findOne();
    if (!settings) {
      settings = await db.SystemSettings.create({
        maxTeamsPerSupervisor: 5,
        teamSize: 2,
        proposalSimilarityThreshold: 60,
        allowOwnTopic: true,
      });
    }
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSystemSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { maxTeamsPerSupervisor, teamSize, proposalSimilarityThreshold, allowOwnTopic } = req.body;
    let settings = await db.SystemSettings.findOne();

    const updates = {
      maxTeamsPerSupervisor: Number(maxTeamsPerSupervisor) || 5,
      teamSize: Number(teamSize) || 2,
      proposalSimilarityThreshold: Number(proposalSimilarityThreshold) || 60,
      allowOwnTopic: allowOwnTopic !== undefined ? !!allowOwnTopic : true,
      updatedAt: new Date().toISOString(),
    };

    if (settings) {
      settings = await db.SystemSettings.findByIdAndUpdate((settings._id || settings.id)!, updates, { new: true });
    } else {
      settings = await db.SystemSettings.create(updates);
    }

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'ADMIN',
      action: 'UPDATE_SYSTEM_SETTINGS',
      entityType: 'SYSTEM_SETTINGS',
      entityId: settings ? ((settings._id || settings.id) || 'settings') : 'settings',
      metadata: updates,
    });

    res.json({ success: true, message: 'System settings saved.', settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId, entityType } = req.query;
    const filter: any = {};
    if (batchId) filter.batchId = batchId;
    if (entityType) filter.entityType = entityType;

    const logs = await db.AuditLogs.find(filter);
    // Sort descending by timestamp
    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function resetAndSeedDemoData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { mode } = req.body || {};
    if (mode === 'seed') {
      await seedInitialData(true);
      res.json({
        success: true,
        message: 'University FYP Academic Dataset initialized.',
      });
    } else {
      await purgeAllDummyData();
      res.json({
        success: true,
        message: 'All dummy records purged. System is now in a clean state (Super Admin preserved).',
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

