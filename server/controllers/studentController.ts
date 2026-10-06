import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { analyzeProposalSimilarity } from '../services/aiService.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

export async function getStudentStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const student = await db.Students.findOne({ userId });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found for this account.' });
      return;
    }

    const batch = await db.Batches.findById(student.batchId);
    let team: any = null;
    let registrationRequest: any = null;
    let proposal: any = null;
    let chatActive = false;
    let s7Phase: any = null;
    let s8Phase: any = null;

    if (student.teamId) {
      team = await db.Teams.findById(student.teamId);
      registrationRequest = await db.TeamRegistrationRequests.findOne({ teamId: student.teamId });
      proposal = await db.Proposals.findOne({ teamId: student.teamId });

      if (proposal && (proposal.status === 'SUPERVISOR_APPROVED' || proposal.status === 'APPROVED' || proposal.status === 'COORDINATOR_REVIEW')) {
        chatActive = true;
      }

      s7Phase = await db.Phases.findOne({ teamId: student.teamId, semesterNumber: 7 });
      s8Phase = await db.Phases.findOne({ teamId: student.teamId, semesterNumber: 8 });
    } else {
      // Check if there is a pending request where student is member
      const existingReq = await db.TeamRegistrationRequests.findOne((r: any) =>
        r.batchId === student.batchId &&
        (r.student1RegNo === student.registrationNo || r.student2RegNo === student.registrationNo)
      );
      if (existingReq) {
        registrationRequest = existingReq;
      }
    }

    res.json({
      success: true,
      student,
      batch,
      team,
      registrationRequest,
      proposal,
      chatActive,
      phases: {
        semester7: s7Phase,
        semester8: s8Phase,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function registerTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const { ownRegNo, teammateRegNo } = req.body;

    if (!ownRegNo || !teammateRegNo) {
      res.status(400).json({ success: false, message: 'Both student registration numbers are required.' });
      return;
    }

    const normOwn = ownRegNo.toUpperCase().trim();
    const normTeammate = teammateRegNo.toUpperCase().trim();

    // Rule: Cannot select self
    if (normOwn === normTeammate) {
      res.status(400).json({ success: false, message: 'You cannot select yourself as teammate.' });
      return;
    }

    // Verify own student profile matches
    const ownStudent = await db.Students.findOne({ registrationNo: normOwn });
    if (!ownStudent) {
      res.status(400).json({ success: false, message: `Registration number ${normOwn} not found in database.` });
      return;
    }

    if (ownStudent.userId !== userId && !req.user?.capabilities.includes('ADMIN')) {
      res.status(403).json({ success: false, message: 'You can only register for your own registration number.' });
      return;
    }

    const batch = await db.Batches.findById(ownStudent.batchId);
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found.' });
      return;
    }

    // Rule: Backend enforces deadline! Never trust browser time!
    if (batch.registrationDeadline) {
      const deadlineDate = new Date(batch.registrationDeadline).getTime();
      const now = Date.now();
      if (now > deadlineDate) {
        res.status(400).json({
          success: false,
          message: 'The team registration deadline for this batch has expired. Registrations are closed.',
        });
        return;
      }
    }

    // Rule: Teammate exists in same batch
    const teammateStudent = await db.Students.findOne({ registrationNo: normTeammate });
    if (!teammateStudent) {
      res.status(400).json({
        success: false,
        message: `Teammate registration number ${normTeammate} is not registered in the system.`,
      });
      return;
    }

    if (teammateStudent.batchId !== ownStudent.batchId) {
      res.status(400).json({
        success: false,
        message: 'Both team members must belong to the exact same academic batch.',
      });
      return;
    }

    // Rule: Student is not already assigned to another team
    if (ownStudent.teamId) {
      res.status(400).json({ success: false, message: 'You are already a member of a registered team.' });
      return;
    }

    // Rule: Teammate is not already assigned to another team
    if (teammateStudent.teamId) {
      res.status(400).json({
        success: false,
        message: `Teammate ${teammateStudent.name} (${normTeammate}) is already assigned to another team.`,
      });
      return;
    }

    // Rule: Check existing pending requests
    const pendingReq = await db.TeamRegistrationRequests.findOne((r: any) =>
      r.batchId === ownStudent.batchId &&
      r.status === 'PENDING' &&
      (r.student1RegNo === normOwn ||
        r.student2RegNo === normOwn ||
        r.student1RegNo === normTeammate ||
        r.student2RegNo === normTeammate)
    );

    if (pendingReq) {
      res.status(400).json({
        success: false,
        message: 'A registration request for one or both of these students is already pending review.',
      });
      return;
    }

    // Create Team record
    const teamsCount = await db.Teams.countDocuments({ batchId: ownStudent.batchId });
    const teamCode = `FYP-${batch.academicYear.split('-')[0] || '2026'}-${String(teamsCount + 1).padStart(3, '0')}`;

    const newTeam = await db.Teams.create({
      teamCode,
      batchId: ownStudent.batchId,
      batchName: batch.name,
      studentIds: [(ownStudent._id || ownStudent.id)!, (teammateStudent._id || teammateStudent.id)!],
      studentRegNos: [normOwn, normTeammate],
      studentNames: [ownStudent.name, teammateStudent.name],
      semesterNumber: batch.currentSemester || 7,
      status: 'PENDING_REGISTRATION',
    });

    const teamId = (newTeam._id || newTeam.id)!;

    // Link teamId to students
    await db.Students.findByIdAndUpdate((ownStudent._id || ownStudent.id)!, { teamId });
    await db.Students.findByIdAndUpdate((teammateStudent._id || teammateStudent.id)!, { teamId });

    // Create registration request record
    const reqDoc = await db.TeamRegistrationRequests.create({
      batchId: ownStudent.batchId,
      teamId,
      teamCode,
      student1RegNo: normOwn,
      student1Name: ownStudent.name,
      student2RegNo: normTeammate,
      student2Name: teammateStudent.name,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
    });

    await logAuditEvent({
      actorId: userId,
      actorName: ownStudent.name,
      actorRole: 'STUDENT',
      action: 'REGISTER_TEAM_REQUEST',
      entityType: 'TEAM',
      entityId: teamId,
      batchId: ownStudent.batchId,
      metadata: { teamCode, member1: normOwn, member2: normTeammate },
    });

    res.json({
      success: true,
      message: `Team registration request submitted for ${teamCode}. Awaiting Coordinator portal activation.`,
      team: newTeam,
      request: reqDoc,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getStudentSupervisorsAndTopics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const student = await db.Students.findOne({ userId });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const batch = await db.Batches.findById(student.batchId);
    if (!batch || !batch.portalsCreated) {
      res.status(403).json({
        success: false,
        message: 'Portals have not been activated yet by the batch Coordinator.',
      });
      return;
    }

    const settings = (await db.SystemSettings.findOne()) || { maxTeamsPerSupervisor: 5 };

    // Get all supervisors and coordinators assigned to this batch (Coordinators are automatically Supervisors too)
    const allBatchAssignments = await db.AcademicAssignments.find({
      batchId: student.batchId,
      status: 'ACTIVE',
    });

    const supervisorAssignments = allBatchAssignments.filter(
      (a: any) => a.responsibility === 'SUPERVISOR' || a.responsibility === 'COORDINATOR'
    );

    // Deduplicate by userId so a faculty member holding both isn't listed twice
    const uniqueSupervisorMap = new Map<string, any>();
    for (const a of supervisorAssignments) {
      if (!uniqueSupervisorMap.has(a.userId) || a.responsibility === 'COORDINATOR') {
        uniqueSupervisorMap.set(a.userId, a);
      }
    }

    const supervisorsList = [];
    for (const a of uniqueSupervisorMap.values()) {
      const user = await db.Users.findById(a.userId);
      const teamCount = await db.Teams.countDocuments({
        batchId: student.batchId,
        supervisorId: a.userId,
      });

      const isFull = teamCount >= settings.maxTeamsPerSupervisor;

      supervisorsList.push({
        id: a.userId,
        name: a.userName || user?.name,
        email: a.userEmail || user?.email,
        roleLabel: a.responsibility === 'COORDINATOR' ? 'Batch Coordinator & Supervisor' : 'Faculty Supervisor',
        currentTeamCount: teamCount,
        maxCapacity: settings.maxTeamsPerSupervisor,
        isFull,
        availableCapacity: Math.max(0, settings.maxTeamsPerSupervisor - teamCount),
      });
    }

    // Get supervisor topics for this batch
    const topics = await db.SupervisorTopics.find({ batchId: student.batchId });

    res.json({
      success: true,
      supervisors: supervisorsList,
      topics,
      settings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function checkProposalAI(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, description, problemStatement, objectives, methodology, technologies } = req.body;

    if (!title || !description || !problemStatement) {
      res.status(400).json({
        success: false,
        message: 'Title, description, and problem statement are required for AI analysis.',
      });
      return;
    }

    const analysis = await analyzeProposalSimilarity({
      title,
      description,
      problemStatement,
      objectives: objectives || '',
      methodology: methodology || '',
      technologies: technologies || '',
    });

    await logAuditEvent({
      actorId: (req.user?._id || req.user?.id)!,
      actorName: req.user?.name || 'Student',
      actorRole: 'STUDENT',
      action: 'RUN_AI_PROPOSAL_ANALYSIS',
      entityType: 'PROPOSAL_DRAFT',
      entityId: 'draft',
      metadata: {
        title,
        similarityScore: analysis.similarityScore,
        riskLevel: analysis.riskLevel,
      },
    });

    res.json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function submitProposal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const student = await db.Students.findOne({ userId });

    if (!student || !student.teamId) {
      res.status(403).json({ success: false, message: 'You must belong to an active team to submit a proposal.' });
      return;
    }

    const {
      title,
      description,
      problemStatement,
      objectives,
      methodology,
      technologies,
      expectedOutcome,
      supervisorId,
      selectedTopicId,
      isCustomTopic,
      aiAnalysis,
    } = req.body;

    if (!title || !description || !problemStatement || !supervisorId) {
      res.status(400).json({
        success: false,
        message: 'Title, description, problem statement, and selected supervisor are required.',
      });
      return;
    }

    // Check supervisor capacity
    const settings = (await db.SystemSettings.findOne()) || { maxTeamsPerSupervisor: 5 };
    const currentSupervisorTeams = await db.Teams.countDocuments({ supervisorId });
    if (currentSupervisorTeams >= settings.maxTeamsPerSupervisor) {
      res.status(400).json({
        success: false,
        message: 'Selected supervisor has already reached their maximum team allocation capacity (FULL).',
      });
      return;
    }

    // Check if topic is occupied
    if (selectedTopicId && !isCustomTopic) {
      const topic = await db.SupervisorTopics.findById(selectedTopicId);
      if (topic && topic.status === 'OCCUPIED' && topic.occupiedByTeamId !== student.teamId) {
        res.status(400).json({
          success: false,
          message: 'This supervisor topic is already occupied by another team.',
        });
        return;
      }
    }

    const team = await db.Teams.findById(student.teamId);
    let proposal = await db.Proposals.findOne({ teamId: student.teamId });

    // Automatically run Gemini AI originality analysis on submit
    const computedAnalysis = await analyzeProposalSimilarity({
      title,
      description,
      problemStatement,
      objectives: objectives || '',
      methodology: methodology || '',
      technologies: technologies || '',
    });

    const proposalData = {
      teamId: student.teamId,
      batchId: student.batchId,
      semesterNumber: team?.semesterNumber || 7,
      title,
      description,
      problemStatement,
      objectives: objectives || '',
      methodology: methodology || '',
      technologies: technologies || '',
      expectedOutcome: expectedOutcome || '',
      supervisorId,
      selectedTopicId: isCustomTopic ? undefined : selectedTopicId,
      isCustomTopic: !!isCustomTopic,
      aiAnalysis: computedAnalysis,
      similarityScore: computedAnalysis.similarityScore || 0,
      status: 'SUBMITTED_TO_SUPERVISOR' as const,
      updatedAt: new Date().toISOString(),
    };

    if (proposal) {
      proposal = await db.Proposals.findByIdAndUpdate((proposal._id || proposal.id)!, proposalData, { new: true });
    } else {
      proposal = await db.Proposals.create({
        ...proposalData,
        createdAt: new Date().toISOString(),
      });
    }

    await logAuditEvent({
      actorId: userId,
      actorName: req.user?.name || 'Student',
      actorRole: 'STUDENT',
      action: 'SUBMIT_PROPOSAL_TO_SUPERVISOR',
      entityType: 'PROPOSAL',
      entityId: proposal ? ((proposal._id || proposal.id) || 'prop') : 'prop',
      batchId: student.batchId,
      semesterNumber: team?.semesterNumber || 7,
      metadata: {
        title,
        supervisorId,
        similarityScore: computedAnalysis.similarityScore,
        riskLevel: computedAnalysis.riskLevel,
      },
    });

    res.json({
      success: true,
      message: 'Gemini AI originality analysis completed and proposal submitted to supervisor for review.',
      proposal,
      analysis: computedAnalysis,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function uploadTeamDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const student = await db.Students.findOne({ userId });

    if (!student || !student.teamId) {
      res.status(403).json({ success: false, message: 'You must belong to an active team to submit documents.' });
      return;
    }

    const { type, title, semesterNumber, repoUrl, liveUrl, fileBase64, fileName, confirmReplace } = req.body;

    if (!type || !title) {
      res.status(400).json({ success: false, message: 'Document type and title are required.' });
      return;
    }

    // Check if phase is locked (Rule #36, #38)
    const semNum = Number(semesterNumber) || 7;
    const phase = await db.Phases.findOne({ teamId: student.teamId, semesterNumber: semNum });
    if (phase && phase.status === 'LOCKED') {
      res.status(403).json({
        success: false,
        message: `Semester ${semNum} has been officially locked and finalized. No document submissions or modifications are allowed.`,
      });
      return;
    }

    let cloudinaryUrl = repoUrl || '';

    if (fileBase64 && fileName) {
      const folder =
        type === 'PROPOSAL'
          ? 'fyp/proposals'
          : type === 'THESIS'
          ? 'fyp/thesis'
          : type.includes('PRESENTATION')
          ? 'fyp/presentations'
          : 'fyp/documents';

      const buffer = Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      const uploadRes = await uploadToCloudinary(buffer, fileName, folder as any);
      cloudinaryUrl = uploadRes.url;
    }

    const existingDocs = await db.Documents.find({ teamId: student.teamId, type, semesterNumber: semNum });
    const version = existingDocs.length + 1;

    // Check if previous document was already locked/approved (Rule #36)
    const lockedDoc = existingDocs.find((d: any) => d.isLocked && d.status === 'APPROVED');
    if (lockedDoc && !confirmReplace) {
      res.status(403).json({
        success: false,
        message: 'This document type is officially approved and locked. Explicit confirmation is required to replace it and reset approval.',
      });
      return;
    }

    if (lockedDoc && confirmReplace) {
      await db.Documents.findByIdAndUpdate((lockedDoc._id || lockedDoc.id)!, {
        isLocked: false,
        status: 'CHANGES_REQUESTED',
      });
    }

    const newDoc = await db.Documents.create({
      teamId: student.teamId,
      phaseId: phase?._id || phase?.id,
      semesterNumber: semNum,
      type,
      title,
      cloudinaryUrl,
      fileDataUrl: fileBase64 || '',
      fileName: fileName || '',
      repoUrl,
      liveUrl,
      version,
      uploadedBy: userId,
      uploadedByName: student.name,
      status: 'UPLOADED',
      isLocked: false,
      createdAt: new Date().toISOString(),
    });

    await logAuditEvent({
      actorId: userId,
      actorName: student.name,
      actorRole: 'STUDENT',
      action: 'UPLOAD_TEAM_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: (newDoc._id || newDoc.id)!,
      semesterNumber: semNum,
      metadata: { type, title, version, cloudinaryUrl },
    });

    res.json({
      success: true,
      message: `Document "${title}" (v${version}) submitted successfully.`,
      document: newDoc,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
