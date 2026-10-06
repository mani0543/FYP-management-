import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import {
  applyEmbeddedSignaturesToDocument,
  resolveDocumentRawBuffer,
} from '../services/documentStampService.js';

// --- CHAT ---
export async function getTeamChatRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    const userId = (req.user?._id || req.user?.id)!;

    // Rule #30: Chat must NOT exist before proposal approval!
    const proposal = await db.Proposals.findOne({ teamId });
    if (!proposal || (proposal.status !== 'SUPERVISOR_APPROVED' && proposal.status !== 'APPROVED' && proposal.status !== 'COORDINATOR_REVIEW')) {
      res.status(403).json({
        success: false,
        message: 'Communication channel is inactive. Chat is only activated after supervisor proposal acceptance.',
      });
      return;
    }

    let room = await db.ChatRooms.findOne({ teamId });
    if (!room) {
      const team = await db.Teams.findById(teamId);
      const studentUsers: string[] = [];
      if (team && team.studentIds) {
        for (const sId of team.studentIds) {
          const s = await db.Students.findById(sId);
          if (s) studentUsers.push(s.userId);
        }
      }
      room = await db.ChatRooms.create({
        teamId,
        teamCode: team?.teamCode || 'TEAM',
        supervisorId: team?.supervisorId || '',
        participants: [team?.supervisorId || '', ...studentUsers].filter(Boolean),
        isActive: true,
      });
    }

    const roomId = room ? (room._id || room.id) : '';
    const messages = await db.Messages.find({ roomId });
    // Sort chronological
    messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({ success: true, room, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function sendChatMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    const { message } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
      return;
    }

    const proposal = await db.Proposals.findOne({ teamId });
    if (!proposal || (proposal.status !== 'SUPERVISOR_APPROVED' && proposal.status !== 'APPROVED' && proposal.status !== 'COORDINATOR_REVIEW')) {
      res.status(403).json({
        success: false,
        message: 'Chat channel is inactive. Proposals must be accepted before communication begins.',
      });
      return;
    }

    const room = await db.ChatRooms.findOne({ teamId });
    if (!room) {
      res.status(404).json({ success: false, message: 'Chat room not found.' });
      return;
    }

    const senderRole = user?.capabilities.includes('STUDENT') ? 'STUDENT' : 'SUPERVISOR';
    const newMsg = await db.Messages.create({
      roomId: room._id || room.id,
      senderId: (user?._id || user?.id)!,
      senderName: user?.name || 'User',
      senderRole,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: newMsg });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// --- MEETINGS ---
export async function getMeetings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId, batchId } = req.query;
    let meetings: any[] = [];

    if (teamId) {
      meetings = await db.Meetings.find({ teamId });
    } else {
      meetings = await db.Meetings.find();
    }

    meetings.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json({ success: true, meetings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createMeeting(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId, title, date, startTime, endTime, location, link, description } = req.body;
    const user = req.user;

    if (!teamId || !title || !date || !startTime || !endTime) {
      res.status(400).json({ success: false, message: 'Team, title, date, and times are required.' });
      return;
    }

    const team = await db.Teams.findById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    const newMeeting = await db.Meetings.create({
      teamId,
      teamCode: team.teamCode,
      createdBy: (user?._id || user?.id)!,
      creatorName: user?.name || 'Faculty',
      creatorRole: user?.capabilities.includes('ADMIN') ? 'ADMIN' : 'SUPERVISOR',
      title,
      date,
      startTime,
      endTime,
      location: location || 'Faculty Office / Online',
      link: link || '',
      description: description || '',
      status: 'SCHEDULED',
    });

    await logAuditEvent({
      actorId: (user?._id || user?.id)!,
      actorName: user?.name || 'Faculty',
      actorRole: 'SUPERVISOR',
      action: 'SCHEDULE_MEETING',
      entityType: 'MEETING',
      entityId: (newMeeting._id || newMeeting.id)!,
      batchId: team.batchId,
      metadata: { teamCode: team.teamCode, title, date },
    });

    res.json({ success: true, message: 'Meeting scheduled.', meeting: newMeeting });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// --- ANNOUNCEMENTS ---
export async function getAnnouncements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { targetType, targetId } = req.query;
    let filter: any = {};
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const announcements = await db.Announcements.find(filter);
    announcements.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, announcements });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createAnnouncement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { targetType, targetId, title, message } = req.body;
    const user = req.user;

    if (!targetType || !targetId || !title || !message) {
      res.status(400).json({ success: false, message: 'All announcement fields are required.' });
      return;
    }

    const newAnnouncement = await db.Announcements.create({
      senderId: (user?._id || user?.id)!,
      senderName: user?.name || 'Staff',
      senderRole: user?.capabilities.includes('ADMIN') ? 'ADMIN' : user?.capabilities.includes('FACULTY') ? 'COORDINATOR/SUPERVISOR' : 'STAFF',
      targetType,
      targetId,
      title,
      message,
    });

    await logAuditEvent({
      actorId: (user?._id || user?.id)!,
      actorName: user?.name || 'Staff',
      actorRole: 'STAFF',
      action: 'PUBLISH_ANNOUNCEMENT',
      entityType: 'ANNOUNCEMENT',
      entityId: (newAnnouncement._id || newAnnouncement.id)!,
      metadata: { title, targetType },
    });

    res.json({ success: true, message: 'Announcement published.', announcement: newAnnouncement });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// --- DOCUMENTS & PRESENTATIONS ---
export async function getTeamDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    const documents = await db.Documents.find({ teamId });
    res.json({ success: true, documents });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getTeamPresentations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    const presentations = await db.Presentations.find({ teamId });
    res.json({ success: true, presentations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// --- FILE SERVING ---
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export async function getDocumentMeta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { docId } = req.params;
    const doc = (await db.Documents.findById(docId)) || (await db.Templates.findById(docId));
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const { ext, downloadName } = resolveDocumentRawBuffer(doc);
    res.json({
      success: true,
      document: {
        _id: doc._id || doc.id,
        id: doc._id || doc.id,
        title: doc.title,
        type: doc.type || doc.category || 'TEMPLATE',
        semesterNumber: doc.semesterNumber || 7,
        version: doc.version || 1,
        uploadedByName: doc.uploadedByName || 'Batch Coordinator',
        status: doc.status || 'OFFICIAL TEMPLATE',
        isLocked: doc.isLocked || false,
        createdAt: doc.createdAt,
        supervisorApproval: doc.supervisorApproval,
        coordinatorApproval: doc.coordinatorApproval,
        ext,
        downloadName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function serveDocumentRaw(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { docId } = req.params;
    const { download } = req.query;
    const doc = (await db.Documents.findById(docId)) || (await db.Templates.findById(docId));
    if (!doc) {
      res.status(404).send('Document not found.');
      return;
    }

    if (doc.supervisorApproval || doc.coordinatorApproval) {
      const stamped = await applyEmbeddedSignaturesToDocument(doc);
      if (stamped.fileDataUrl) {
        doc.fileDataUrl = stamped.fileDataUrl;
      }
    }

    const { buffer: rawBuffer, downloadName } = resolveDocumentRawBuffer(doc);
    if (!rawBuffer) {
      res.status(404).send('Document binary not found.');
      return;
    }

    const mimeType = getMimeType(downloadName);
    res.setHeader('Content-Type', mimeType);
    const disposition =
      download === '1'
        ? 'attachment'
        : mimeType === 'application/pdf' || mimeType.startsWith('image/')
        ? 'inline'
        : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
    res.send(rawBuffer);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
}

export async function serveDocumentById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { docId } = req.params;
    const { format, download } = req.query;
    const doc = (await db.Documents.findById(docId)) || (await db.Templates.findById(docId));
    if (!doc) {
      res.status(404).send('Document not found.');
      return;
    }

    if (doc.supervisorApproval || doc.coordinatorApproval) {
      const stamped = await applyEmbeddedSignaturesToDocument(doc);
      if (stamped.fileDataUrl) {
        doc.fileDataUrl = stamped.fileDataUrl;
      }
    }

    const { buffer: rawBuffer, ext, downloadName } = resolveDocumentRawBuffer(doc);

    if (rawBuffer) {
      if (ext === '.docx' && download !== '1') {
        const printParam = format === 'certificate' || format === 'pdf' ? '?print=1' : '';
        res.redirect(`/document-viewer/${docId}${printParam}`);
        return;
      }

      const mimeType = getMimeType(downloadName);
      res.setHeader('Content-Type', mimeType);
      const disposition =
        download === '1'
          ? 'attachment'
          : mimeType === 'application/pdf' || mimeType.startsWith('image/')
          ? 'inline'
          : 'attachment';
      res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
      res.send(rawBuffer);
      return;
    }

    if (doc.cloudinaryUrl && doc.cloudinaryUrl.startsWith('http')) {
      res.redirect(doc.cloudinaryUrl);
      return;
    }

    res.status(404).send('Document file asset not found on server.');
  } catch (err: any) {
    res.status(500).send(err.message);
  }
}

// --- TEMPLATES (Proposal, Phase 1 / Sem 7, Phase 2 / Sem 8) ---
export async function getTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batchId, phaseCategory } = req.query;
    let templates = await db.Templates.find();

    if (batchId) {
      templates = templates.filter((t: any) => !t.batchId || t.batchId === batchId || t.batchId === 'ALL');
    }
    if (phaseCategory) {
      templates = templates.filter((t: any) => t.phaseCategory === phaseCategory);
    }

    templates.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, templates });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { batchId, title, description, phaseCategory, semesterNumber, fileBase64, fileName } = req.body;

    if (!title || !fileBase64 || !fileName) {
      res.status(400).json({
        success: false,
        message: 'Template title and document file are required.',
      });
      return;
    }

    const buffer = Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const uploadRes = await uploadToCloudinary(buffer, fileName, 'fyp/templates');

    const newTemplate = await db.Templates.create({
      batchId: batchId || 'ALL',
      title: title.trim(),
      description: (description || '').trim(),
      phaseCategory: phaseCategory || 'PROPOSAL', // 'PROPOSAL' | 'SEMESTER_7' | 'SEMESTER_8' | 'GENERAL'
      semesterNumber: Number(semesterNumber) || (phaseCategory === 'SEMESTER_8' ? 8 : 7),
      cloudinaryUrl: uploadRes.url,
      fileDataUrl: fileBase64,
      fileName,
      uploadedBy: (user?._id || user?.id)!,
      uploadedByName: user?.name || 'Coordinator',
      createdAt: new Date().toISOString(),
    });

    await logAuditEvent({
      actorId: (user?._id || user?.id)!,
      actorName: user?.name || 'Coordinator',
      actorRole: 'COORDINATOR',
      action: 'UPLOAD_FYP_TEMPLATE',
      entityType: 'TEMPLATE',
      entityId: (newTemplate._id || newTemplate.id)!,
      batchId: batchId || 'ALL',
      metadata: { title, phaseCategory, fileName },
    });

    res.json({
      success: true,
      message: `Template "${title}" published for students.`,
      template: newTemplate,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { templateId } = req.params;
    await db.Templates.findByIdAndDelete(templateId);
    res.json({ success: true, message: 'Template removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function serveLocalFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { folder, subFolder, filename } = req.params as any;
    let resolvedFolder = decodeURIComponent(folder || '');
    let resolvedFilename = decodeURIComponent(filename || '');

    if (subFolder) {
      resolvedFolder = `${resolvedFolder}/${decodeURIComponent(subFolder)}`;
    } else if (resolvedFolder.startsWith('fyp-')) {
      resolvedFolder = resolvedFolder.replace(/^fyp-/, 'fyp/');
    }

    const safeFilePath = path.resolve(process.cwd(), 'uploads', resolvedFolder, resolvedFilename);
    if (fs.existsSync(safeFilePath)) {
      const mimeType = getMimeType(resolvedFilename);
      res.setHeader('Content-Type', mimeType);
      const disposition = mimeType === 'application/pdf' || mimeType.startsWith('image/') ? 'inline' : 'attachment';
      res.setHeader('Content-Disposition', `${disposition}; filename="${resolvedFilename}"`);
      res.sendFile(safeFilePath);
      return;
    }

    // Fallback: check if any document in DB matches this filename and has fileDataUrl
    const allDocs = await db.Documents.find();
    const matchedDoc = allDocs.find(
      (d: any) => (d.cloudinaryUrl && d.cloudinaryUrl.includes(resolvedFilename)) || d.fileName === resolvedFilename
    );
    if (matchedDoc && matchedDoc.fileDataUrl && matchedDoc.fileDataUrl.startsWith('data:')) {
      const matches = matchedDoc.fileDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        const disposition = mimeType === 'application/pdf' || mimeType.startsWith('image/') ? 'inline' : 'attachment';
        res.setHeader('Content-Disposition', `${disposition}; filename="${resolvedFilename}"`);
        res.send(buffer);
        return;
      }
    }

    res.status(404).json({ success: false, message: 'Asset file not found.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}


