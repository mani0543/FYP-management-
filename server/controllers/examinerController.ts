import { Response } from 'express';
import { db } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';

export async function getExaminerPresentations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req.user?._id || req.user?.id)!;
    const isSuperAdmin = req.user?.capabilities.includes('ADMIN');

    let presentations: any[] = [];
    if (isSuperAdmin) {
      presentations = await db.Presentations.find();
    } else {
      // Find presentations assigned to this user OR all presentations in batches where user is assigned as EXAMINER
      const examinerAssignments = await db.AcademicAssignments.find({
        userId,
        responsibility: 'EXAMINER',
        status: 'ACTIVE',
      });
      const batchIds = examinerAssignments.map((a: any) => a.batchId);

      presentations = await db.Presentations.find((p: any) =>
        p.examinerId === userId || batchIds.includes(p.batchId)
      );
    }

    // Enhance presentations with team and proposal details
    const enhanced = [];
    for (const p of presentations) {
      const team = await db.Teams.findById(p.teamId);
      const proposal = await db.Proposals.findOne({ teamId: p.teamId });
      const documents = await db.Documents.find({ teamId: p.teamId, semesterNumber: p.semesterNumber });

      enhanced.push({
        ...p,
        team,
        proposal,
        documents,
      });
    }

    res.json({ success: true, presentations: enhanced });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function gradePresentation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { presentationId } = req.params;
    const { marks, comments, result } = req.body; // result: 'PASS' | 'FAIL_IDEA'
    const examiner = req.user;

    if (!result || !['PASS', 'FAIL_IDEA'].includes(result)) {
      res.status(400).json({ success: false, message: 'Valid result (PASS or FAIL_IDEA) is required.' });
      return;
    }

    const presentation = await db.Presentations.findById(presentationId);
    if (!presentation) {
      res.status(404).json({ success: false, message: 'Defense presentation session not found.' });
      return;
    }

    const actorId = (examiner?._id || examiner?.id)!;
    const gradedAt = new Date().toISOString();

    await db.Presentations.findByIdAndUpdate(presentationId, {
      marks: Number(marks) || 0,
      comments: comments || '',
      result,
      examinerId: actorId,
      examinerName: examiner?.name,
      gradedAt,
    });

    // Rule #38: If PASS in Semester 7, Semester 7 becomes LOCKED!
    // And Semester 8 becomes active!
    if (result === 'PASS' && presentation.semesterNumber === 7) {
      // Lock Phase 1
      await db.Phases.updateOne(
        { teamId: presentation.teamId, semesterNumber: 7 },
        { status: 'LOCKED', endDate: gradedAt }
      );

      // Lock all Semester 7 approved documents
      await db.Documents.updateMany(
        { teamId: presentation.teamId, semesterNumber: 7 },
        { isLocked: true }
      );

      // Create or activate Phase 2 (Semester 8)
      const existingPhase2 = await db.Phases.findOne({ teamId: presentation.teamId, semesterNumber: 8 });
      if (!existingPhase2) {
        await db.Phases.create({
          teamId: presentation.teamId,
          semesterNumber: 8,
          phaseNumber: 2,
          status: 'OPEN',
          startDate: gradedAt,
        });
      } else {
        await db.Phases.findByIdAndUpdate((existingPhase2._id || existingPhase2.id)!, { status: 'OPEN' });
      }

      // Update Team semester to 8
      await db.Teams.findByIdAndUpdate(presentation.teamId, { semesterNumber: 8 });
    }

    await logAuditEvent({
      actorId,
      actorName: examiner?.name || 'Examiner',
      actorRole: 'EXAMINER',
      action: 'GRADE_PRESENTATION',
      entityType: 'PRESENTATION',
      entityId: presentationId,
      batchId: presentation.batchId,
      semesterNumber: presentation.semesterNumber,
      metadata: {
        teamCode: presentation.teamCode,
        marks,
        result,
        semester7Locked: result === 'PASS' && presentation.semesterNumber === 7,
      },
    });

    res.json({
      success: true,
      message: `Evaluation submitted successfully: ${result}.${result === 'PASS' && presentation.semesterNumber === 7 ? ' Semester 7 locked and Semester 8 activated.' : ''}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
