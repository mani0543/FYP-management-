import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { applyEmbeddedSignaturesToDocument } from '../services/documentStampService.js';

export async function getCoordinatorBatches(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const isSuperAdmin = req.user?.capabilities.includes('ADMIN');

    let batchIds: string[] = [];

    if (isSuperAdmin) {
      const allBatches = await db.Batches.find();
      res.json({ success: true, batches: allBatches });
      return;
    }

    const assignments = await db.AcademicAssignments.find({
      userId,
      responsibility: 'COORDINATOR',
      status: 'ACTIVE',
    });

    batchIds = [...new Set(assignments.map((a: any) => a.batchId))];
    const batches = await db.Batches.find((b: any) => batchIds.includes(b._id || b.id));

    res.json({ success: true, batches, assignments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getBatchStudents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const students = await db.Students.find({ batchId });
    const enrichedStudents = [];
    for (const s of students) {
      const u = s.userId ? await db.Users.findById(s.userId) : null;
      enrichedStudents.push({
        ...s,
        portalPassword: (u as any)?.visiblePassword || (s as any).portalPassword || 'Student@123',
      });
    }
    res.json({ success: true, students: enrichedStudents });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function registerBatchStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const { registrationNo, name, email, password } = req.body;

    if (!registrationNo || !name || !email) {
      res.status(400).json({ success: false, message: 'Registration number, name, and email are required.' });
      return;
    }

    const regNoUpper = registrationNo.toUpperCase().trim();
    const existingStudent = await db.Students.findOne({ registrationNo: regNoUpper });

    if (existingStudent) {
      res.status(400).json({
        success: false,
        message: `Student with registration number ${regNoUpper} is already registered.`,
      });
      return;
    }

    const initialPassword = password && String(password).trim() ? String(password).trim() : 'Student@123';

    // Check if user account exists or create one
    let user = await db.Users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      const defaultPasswordHash = await bcrypt.hash(initialPassword, 10);
      user = await db.Users.create({
        name,
        email: email.toLowerCase().trim(),
        passwordHash: defaultPasswordHash,
        visiblePassword: initialPassword,
        accountStatus: 'ACTIVE',
        capabilities: ['STUDENT'],
      });
    }

    const userId = user ? ((user._id || user.id) || '') : '';
    const newStudent = await db.Students.create({
      userId,
      batchId,
      registrationNo: regNoUpper,
      name,
      email: email.toLowerCase().trim(),
      portalPassword: (user as any)?.visiblePassword || initialPassword,
      status: 'ACTIVE',
    });

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Coordinator',
      actorRole: 'COORDINATOR',
      action: 'REGISTER_STUDENT',
      entityType: 'STUDENT',
      entityId: (newStudent._id || newStudent.id)!,
      batchId,
      metadata: { registrationNo: regNoUpper, name },
    });

    res.json({
      success: true,
      message: `Student ${name} (${regNoUpper}) registered successfully. Initial password: ${initialPassword}`,
      student: newStudent,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function setTeamRegistrationDeadline(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const { registrationDeadline, registrationOpen } = req.body;

    if (!registrationDeadline) {
      res.status(400).json({ success: false, message: 'Deadline timestamp is required.' });
      return;
    }

    const updated = await db.Batches.findByIdAndUpdate(
      batchId,
      {
        registrationDeadline,
        registrationOpen: registrationOpen !== undefined ? !!registrationOpen : true,
      },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Batch not found.' });
      return;
    }

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Coordinator',
      actorRole: 'COORDINATOR',
      action: 'SET_TEAM_REGISTRATION_DEADLINE',
      entityType: 'BATCH',
      entityId: batchId,
      batchId,
      metadata: { registrationDeadline, registrationOpen },
    });

    res.json({
      success: true,
      message: 'Team registration deadline configured successfully.',
      batch: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getTeamRegistrationRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const requests = await db.TeamRegistrationRequests.find({ batchId });
    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPortals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const batch = await db.Batches.findById(batchId);

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found.' });
      return;
    }

    // Find all pending team registration requests
    const requests = await db.TeamRegistrationRequests.find({ batchId, status: 'PENDING' });

    for (const reqDoc of requests) {
      // Find the team
      const team = await db.Teams.findById(reqDoc.teamId);
      if (team) {
        await db.Teams.findByIdAndUpdate(reqDoc.teamId, { status: 'PORTAL_ACTIVE' });

        // Initialize Semester 7 Phase
        await db.Phases.create({
          teamId: reqDoc.teamId,
          semesterNumber: 7,
          phaseNumber: 1,
          status: 'OPEN',
          startDate: new Date().toISOString(),
        });
      }

      await db.TeamRegistrationRequests.findByIdAndUpdate((reqDoc._id || reqDoc.id)!, {
        status: 'PORTAL_CREATED',
      });
    }

    await db.Batches.findByIdAndUpdate(batchId, {
      portalsCreated: true,
      registrationOpen: false, // Close team registration once portals are activated
    });

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Coordinator',
      actorRole: 'COORDINATOR',
      action: 'CREATE_PORTALS',
      entityType: 'BATCH',
      entityId: batchId,
      batchId,
      metadata: { activatedRequestsCount: requests.length },
    });

    res.json({
      success: true,
      message: `Successfully created and activated portals for ${requests.length} team(s). Student dashboards are now unlocked.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getBatchTeams(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const teams = await db.Teams.find({ batchId });
    res.json({ success: true, teams });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getBatchProposals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const proposals = await db.Proposals.find({ batchId });
    res.json({ success: true, proposals });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function reviewProposalByCoordinator(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { proposalId } = req.params;
    const { decision, feedback } = req.body; // 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'

    const proposal = await db.Proposals.findById(proposalId);
    if (!proposal) {
      res.status(404).json({ success: false, message: 'Proposal not found.' });
      return;
    }

    const actorId = (req.user?._id || req.user?.id)!;
    const actorName = req.user?.name || 'Coordinator';

    let newStatus = proposal.status;
    if (decision === 'APPROVE') {
      newStatus = 'APPROVED';

      // Ensure team has supervisorId, supervisorName, and projectTitle set
      const targetSupervisorId = proposal.supervisorId || actorId;
      let targetSupervisorName = actorName;
      if (proposal.supervisorId) {
        const supUser = await db.Users.findById(proposal.supervisorId);
        if (supUser) targetSupervisorName = supUser.name;
      }

      await db.Teams.findByIdAndUpdate(proposal.teamId, {
        supervisorId: targetSupervisorId,
        supervisorName: targetSupervisorName,
        projectTitle: proposal.title,
      });

      if (proposal.selectedTopicId) {
        await db.SupervisorTopics.findByIdAndUpdate(proposal.selectedTopicId, {
          status: 'OCCUPIED',
          occupiedByTeamId: proposal.teamId,
        });
      }

      // Activate ChatRoom if not already created
      const existingRoom = await db.ChatRooms.findOne({ teamId: proposal.teamId });
      const team = await db.Teams.findById(proposal.teamId);
      const studentUsers: string[] = [];
      if (team && team.studentIds) {
        for (const sId of team.studentIds) {
          const s = await db.Students.findById(sId);
          if (s) studentUsers.push(s.userId);
        }
      }

      if (!existingRoom) {
        await db.ChatRooms.create({
          teamId: proposal.teamId,
          teamCode: team?.teamCode || 'TEAM',
          supervisorId: targetSupervisorId,
          participants: [targetSupervisorId, ...studentUsers].filter(Boolean),
          isActive: true,
        });
      }
    } else if (decision === 'REQUEST_CHANGES') {
      newStatus = 'CHANGES_REQUIRED';
    } else if (decision === 'REJECT') {
      newStatus = 'REJECTED';
    }

    await db.Proposals.findByIdAndUpdate(proposalId, {
      status: newStatus,
      coordinatorFeedback: feedback || '',
      approvedByCoordinatorId: decision === 'APPROVE' ? actorId : undefined,
      approvedByCoordinatorAt: decision === 'APPROVE' ? new Date().toISOString() : undefined,
    });

    await logAuditEvent({
      actorId,
      actorName,
      actorRole: 'COORDINATOR',
      action: `COORDINATOR_PROPOSAL_${decision}`,
      entityType: 'PROPOSAL',
      entityId: proposalId,
      batchId: proposal.batchId,
      semesterNumber: proposal.semesterNumber,
      metadata: { decision, feedback },
    });

    res.json({
      success: true,
      message: `Proposal review status updated to: ${newStatus}.${decision === 'APPROVE' ? ' Team-Supervisor Chat is now active.' : ''}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function signDocumentByCoordinator(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentId } = req.params;
    const { comments } = req.body;

    const document = await db.Documents.findById(documentId);
    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const coordinator = req.user;
    if (!coordinator?.signatureUrl || !coordinator?.stampUrl) {
      res.status(400).json({
        success: false,
        message: 'Please upload your official signature and university stamp in your profile before approving official documents.',
      });
      return;
    }

    const actorId = (coordinator._id || coordinator.id)!;
    const approvedAt = new Date().toISOString();

    const coordinatorApproval = {
      approvedBy: actorId,
      approvedByName: coordinator.name,
      approvedAt,
      signatureUrl: coordinator.signatureUrl,
      signatureDataUrl: (coordinator as any).signatureDataUrl || '',
      stampUrl: coordinator.stampUrl,
      stampDataUrl: (coordinator as any).stampDataUrl || '',
      comments: comments || '',
    };

    const stampedResult = await applyEmbeddedSignaturesToDocument({
      ...document,
      coordinatorApproval,
    });

    await db.Documents.findByIdAndUpdate(documentId, {
      status: 'APPROVED',
      isLocked: true, // Approved documents are permanently locked!
      coordinatorApproval,
      ...(stampedResult.fileDataUrl ? { fileDataUrl: stampedResult.fileDataUrl } : {}),
    });

    await logAuditEvent({
      actorId,
      actorName: coordinator.name,
      actorRole: 'COORDINATOR',
      action: 'SIGN_AND_STAMP_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: documentId,
      semesterNumber: document.semesterNumber,
      metadata: {
        documentType: document.type,
        signedBy: coordinator.name,
        approvedAt,
      },
    });

    res.json({
      success: true,
      message: 'Official signature & departmental seal attached directly inside the document and locked as official evidence.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getPresentations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const presentations = await db.Presentations.find({ batchId });
    res.json({ success: true, presentations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function schedulePresentation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const { teamId, semesterNumber, title, examinerId, scheduledDate } = req.body;

    const team = await db.Teams.findById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    let examinerName = '';
    if (examinerId) {
      const examiner = await db.Users.findById(examinerId);
      if (examiner) examinerName = examiner.name;
    }

    const presentation = await db.Presentations.create({
      teamId,
      teamCode: team.teamCode,
      batchId,
      semesterNumber: Number(semesterNumber) || 7,
      title: title || `Semester ${semesterNumber || 7} FYP Defense`,
      examinerId,
      examinerName,
      scheduledDate,
      result: 'PENDING',
    });

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Coordinator',
      actorRole: 'COORDINATOR',
      action: 'SCHEDULE_PRESENTATION',
      entityType: 'PRESENTATION',
      entityId: (presentation._id || presentation.id)!,
      batchId,
      semesterNumber: Number(semesterNumber) || 7,
      metadata: { teamCode: team.teamCode, examinerName },
    });

    res.json({
      success: true,
      message: 'Defense presentation session scheduled.',
      presentation,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getBatchTopics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const topics = await db.SupervisorTopics.find({ batchId });
    res.json({ success: true, topics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getFacultyList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await db.Users.find();
    const faculty = users
      .filter((u: any) => u.capabilities?.includes('FACULTY') && u.accountStatus === 'ACTIVE')
      .map((u: any) => ({
        id: u._id || u.id,
        name: u.name,
        email: u.email,
        capabilities: u.capabilities,
      }));
    res.json({ success: true, faculty });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

