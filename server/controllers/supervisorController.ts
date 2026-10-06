import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { applyEmbeddedSignaturesToDocument } from '../services/documentStampService.js';

export async function getSupervisorTeams(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const isSuperAdmin = req.user?.capabilities.includes('ADMIN');

    if (isSuperAdmin) {
      const teams = await db.Teams.find();
      res.json({ success: true, teams });
      return;
    }

    // Also check if user is an active Coordinator for any batch
    const coordAssignments = await db.AcademicAssignments.find({
      userId,
      responsibility: 'COORDINATOR',
      status: 'ACTIVE',
    });
    const coordBatchIds = coordAssignments.map((a: any) => a.batchId);

    // Find all approved proposals where this user is supervisor OR in their coordinated batch
    const allProposals = await db.Proposals.find();
    const relevantApprovedProposals = allProposals.filter(
      (p: any) =>
        ['SUPERVISOR_APPROVED', 'COORDINATOR_REVIEW', 'APPROVED'].includes(p.status) &&
        (p.supervisorId === userId || (!p.supervisorId && coordBatchIds.includes(p.batchId)))
    );

    // Sync any team that had its proposal approved via Coordinator review before team.supervisorId was populated
    for (const prop of relevantApprovedProposals) {
      const team = await db.Teams.findById(prop.teamId);
      if (team && (!team.supervisorId || !team.projectTitle)) {
        const supId = prop.supervisorId || userId;
        const supUser = await db.Users.findById(supId);
        await db.Teams.findByIdAndUpdate(prop.teamId, {
          supervisorId: supId,
          supervisorName: supUser?.name || req.user?.name || 'Supervisor',
          projectTitle: prop.title,
        });
      }
    }

    const allTeams = await db.Teams.find();
    const approvedTeamIds = new Set(relevantApprovedProposals.map((p: any) => p.teamId));

    const teams = allTeams.filter(
      (t: any) =>
        t.supervisorId === userId ||
        approvedTeamIds.has(t._id || t.id)
    );

    res.json({ success: true, teams });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSupervisorTopics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const { batchId } = req.query;

    const filter: any = { supervisorId: userId };
    if (batchId) filter.batchId = batchId;

    const topics = await db.SupervisorTopics.find(filter);
    res.json({ success: true, topics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createSupervisorTopic(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const userName = req.user?.name || 'Supervisor';
    const { batchId, semesterNumber, title, description, technologies } = req.body;

    if (!batchId || !title || !description) {
      res.status(400).json({ success: false, message: 'Batch ID, title, and description are required.' });
      return;
    }

    const topic = await db.SupervisorTopics.create({
      supervisorId: userId,
      supervisorName: userName,
      batchId,
      semesterNumber: Number(semesterNumber) || 7,
      title,
      description,
      technologies: Array.isArray(technologies) ? technologies : (technologies ? [technologies] : []),
      status: 'AVAILABLE',
    });

    await logAuditEvent({
      actorId: userId,
      actorName: userName,
      actorRole: 'SUPERVISOR',
      action: 'CREATE_SUPERVISOR_TOPIC',
      entityType: 'SUPERVISOR_TOPIC',
      entityId: (topic._id || topic.id)!,
      batchId,
      metadata: { title },
    });

    res.json({ success: true, message: 'Project topic published.', topic });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSupervisorProposals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const isSuperAdmin = req.user?.capabilities.includes('ADMIN');

    let proposals: any[] = [];
    if (isSuperAdmin) {
      proposals = await db.Proposals.find();
    } else {
      proposals = await db.Proposals.find({ supervisorId: userId });
    }

    res.json({ success: true, proposals });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function reviewProposalBySupervisor(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { proposalId } = req.params;
    const { decision, feedback } = req.body; // 'ACCEPT' | 'REJECT' | 'REQUEST_CHANGES'
    const userId = (req.user?._id || req.user?.id)!;
    const userName = req.user?.name || 'Supervisor';

    const proposal = await db.Proposals.findById(proposalId);
    if (!proposal) {
      res.status(404).json({ success: false, message: 'Proposal not found.' });
      return;
    }

    // Security check: only assigned supervisor can review
    if (proposal.supervisorId !== userId && !req.user?.capabilities.includes('ADMIN')) {
      res.status(403).json({ success: false, message: 'You are not the designated supervisor for this proposal.' });
      return;
    }

    let newStatus = proposal.status;
    if (decision === 'ACCEPT') {
      // Check supervisor team capacity limit
      const settings = (await db.SystemSettings.findOne()) || { maxTeamsPerSupervisor: 5 };
      const currentTeamCount = await db.Teams.countDocuments({ supervisorId: userId });
      if (currentTeamCount >= settings.maxTeamsPerSupervisor) {
        res.status(400).json({
          success: false,
          message: `Supervisor capacity limit of ${settings.maxTeamsPerSupervisor} teams has been reached. Cannot accept more teams.`,
        });
        return;
      }

      newStatus = 'SUPERVISOR_APPROVED';

      // Update team with supervisor and project title
      await db.Teams.findByIdAndUpdate(proposal.teamId, {
        supervisorId: userId,
        supervisorName: userName,
        projectTitle: proposal.title,
      });

      // If occupied topic
      if (proposal.selectedTopicId) {
        await db.SupervisorTopics.findByIdAndUpdate(proposal.selectedTopicId, {
          status: 'OCCUPIED',
          occupiedByTeamId: proposal.teamId,
        });
      }

      // CRITICAL: Activate Chat Room now! (Rule #30: "Chat must NOT exist before proposal approval")
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
          supervisorId: userId,
          participants: [userId, ...studentUsers],
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
      supervisorFeedback: feedback || '',
      approvedBySupervisorId: decision === 'ACCEPT' ? userId : undefined,
      approvedBySupervisorAt: decision === 'ACCEPT' ? new Date().toISOString() : undefined,
    });

    await logAuditEvent({
      actorId: userId,
      actorName: userName,
      actorRole: 'SUPERVISOR',
      action: `SUPERVISOR_PROPOSAL_${decision}`,
      entityType: 'PROPOSAL',
      entityId: proposalId,
      batchId: proposal.batchId,
      semesterNumber: proposal.semesterNumber,
      metadata: { decision, feedback, teamId: proposal.teamId },
    });

    res.json({
      success: true,
      message: `Proposal evaluation submitted: ${newStatus}.${decision === 'ACCEPT' ? ' Private Team-Supervisor Chat is now activated.' : ''}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function signDocumentBySupervisor(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentId } = req.params;
    const { comments } = req.body;
    const supervisor = req.user;

    if (!supervisor?.signatureUrl) {
      res.status(400).json({
        success: false,
        message: 'Please upload your digital signature in your profile first.',
      });
      return;
    }

    const document = await db.Documents.findById(documentId);
    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const actorId = (supervisor._id || supervisor.id)!;
    const approvedAt = new Date().toISOString();

    const supervisorApproval = {
      approvedBy: actorId,
      approvedByName: supervisor.name,
      approvedAt,
      signatureUrl: supervisor.signatureUrl,
      signatureDataUrl: (supervisor as any).signatureDataUrl || '',
      comments: comments || '',
    };

    const stampedResult = await applyEmbeddedSignaturesToDocument({
      ...document,
      supervisorApproval,
    });

    await db.Documents.findByIdAndUpdate(documentId, {
      status: 'SUPERVISOR_SIGNED',
      supervisorApproval,
      ...(stampedResult.fileDataUrl ? { fileDataUrl: stampedResult.fileDataUrl } : {}),
    });

    await logAuditEvent({
      actorId,
      actorName: supervisor.name,
      actorRole: 'SUPERVISOR',
      action: 'SIGN_DOCUMENT_SUPERVISOR',
      entityType: 'DOCUMENT',
      entityId: documentId,
      semesterNumber: document.semesterNumber,
      metadata: {
        documentType: document.type,
        signedBy: supervisor.name,
        approvedAt,
      },
    });

    res.json({
      success: true,
      message: 'Digital signature attached directly inside the document and forwarded to Coordinator for official seal.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
