import express from 'express';
import { authenticate, requireCapability } from '../middleware/auth.js';
import {
  requireSuperAdmin,
  requireCoordinatorAccess,
  requireSupervisorAccess,
} from '../middleware/authorization.js';

import * as authCtrl from '../controllers/authController.js';
import * as adminCtrl from '../controllers/adminController.js';
import * as coordCtrl from '../controllers/coordinatorController.js';
import * as supCtrl from '../controllers/supervisorController.js';
import * as studCtrl from '../controllers/studentController.js';
import * as examCtrl from '../controllers/examinerController.js';
import * as commonCtrl from '../controllers/commonController.js';

const router = express.Router();

// ----------------- AUTHENTICATION -----------------
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticate, authCtrl.getCurrentUser);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.put('/auth/profile', authenticate, authCtrl.updateProfile);
router.post('/auth/change-password', authenticate, authCtrl.changePassword);
router.post('/auth/upload-credential', authenticate, authCtrl.uploadSignatureOrStamp);

// ----------------- SUPER ADMIN -----------------
router.get('/admin/stats', authenticate, requireSuperAdmin, adminCtrl.getAdminStats);
router.get('/admin/users', authenticate, requireSuperAdmin, adminCtrl.getUsers);
router.post('/admin/users', authenticate, requireSuperAdmin, adminCtrl.createUser);
router.put('/admin/users/:id/status', authenticate, requireSuperAdmin, adminCtrl.updateUserStatus);

router.get('/admin/batches', authenticate, requireSuperAdmin, adminCtrl.getBatches);
router.post('/admin/batches', authenticate, requireSuperAdmin, adminCtrl.createBatch);
router.put('/admin/batches/:id', authenticate, requireSuperAdmin, adminCtrl.updateBatch);
router.post('/admin/batches/:id/advance-semester', authenticate, requireSuperAdmin, adminCtrl.advanceBatchSemester);

router.get('/admin/assignments', authenticate, requireSuperAdmin, adminCtrl.getAssignments);
router.post('/admin/assignments', authenticate, requireSuperAdmin, adminCtrl.createAcademicAssignment);
router.delete('/admin/assignments/:id', authenticate, requireSuperAdmin, adminCtrl.revokeAssignment);

router.get('/admin/settings', authenticate, adminCtrl.getSystemSettings);
router.put('/admin/settings', authenticate, requireSuperAdmin, adminCtrl.updateSystemSettings);

router.get('/admin/audit-logs', authenticate, requireSuperAdmin, adminCtrl.getAuditLogs);
router.post('/admin/seed-demo', authenticate, requireSuperAdmin, adminCtrl.resetAndSeedDemoData);

// ----------------- COORDINATOR -----------------
// Access check enforces user is assigned coordinator for batch/semester or admin
router.get('/coordinator/batches', authenticate, coordCtrl.getCoordinatorBatches);
router.get('/coordinator/batch/:batchId/students', authenticate, requireCoordinatorAccess(), coordCtrl.getBatchStudents);
router.post('/coordinator/batch/:batchId/students', authenticate, requireCoordinatorAccess(), coordCtrl.registerBatchStudent);
router.post('/coordinator/batch/:batchId/deadline', authenticate, requireCoordinatorAccess(), coordCtrl.setTeamRegistrationDeadline);
router.get('/coordinator/batch/:batchId/team-requests', authenticate, requireCoordinatorAccess(), coordCtrl.getTeamRegistrationRequests);
router.post('/coordinator/batch/:batchId/create-portals', authenticate, requireCoordinatorAccess(), coordCtrl.createPortals);
router.get('/coordinator/batch/:batchId/teams', authenticate, requireCoordinatorAccess(), coordCtrl.getBatchTeams);
router.get('/coordinator/batch/:batchId/proposals', authenticate, requireCoordinatorAccess(), coordCtrl.getBatchProposals);
router.post('/coordinator/proposals/:proposalId/review', authenticate, coordCtrl.reviewProposalByCoordinator);
router.post('/coordinator/documents/:documentId/sign', authenticate, coordCtrl.signDocumentByCoordinator);
router.get('/coordinator/batch/:batchId/presentations', authenticate, requireCoordinatorAccess(), coordCtrl.getPresentations);
router.post('/coordinator/batch/:batchId/presentations', authenticate, requireCoordinatorAccess(), coordCtrl.schedulePresentation);
router.get('/coordinator/batch/:batchId/topics', authenticate, coordCtrl.getBatchTopics);
router.get('/coordinator/faculty', authenticate, coordCtrl.getFacultyList);

// ----------------- SUPERVISOR -----------------
router.get('/supervisor/teams', authenticate, supCtrl.getSupervisorTeams);
router.get('/supervisor/topics', authenticate, supCtrl.getSupervisorTopics);
router.post('/supervisor/topics', authenticate, supCtrl.createSupervisorTopic);
router.get('/supervisor/proposals', authenticate, supCtrl.getSupervisorProposals);
router.post('/supervisor/proposals/:proposalId/review', authenticate, supCtrl.reviewProposalBySupervisor);
router.post('/supervisor/documents/:documentId/sign', authenticate, supCtrl.signDocumentBySupervisor);

// ----------------- STUDENT -----------------
router.get('/student/status', authenticate, studCtrl.getStudentStatus);
router.post('/student/register-team', authenticate, studCtrl.registerTeam);
router.get('/student/supervisors-and-topics', authenticate, studCtrl.getStudentSupervisorsAndTopics);
router.post('/student/proposal/ai-check', authenticate, studCtrl.checkProposalAI);
router.post('/student/proposal/submit', authenticate, studCtrl.submitProposal);
router.post('/student/documents/upload', authenticate, studCtrl.uploadTeamDocument);

// ----------------- EXAMINER -----------------
router.get('/examiner/presentations', authenticate, examCtrl.getExaminerPresentations);
router.post('/examiner/presentations/:presentationId/grade', authenticate, examCtrl.gradePresentation);

// ----------------- CHAT (Team <-> Supervisor) -----------------
router.get('/chat/:teamId', authenticate, commonCtrl.getTeamChatRoom);
router.post('/chat/:teamId', authenticate, commonCtrl.sendChatMessage);

// ----------------- MEETINGS, ANNOUNCEMENTS & TEMPLATES -----------------
router.get('/meetings', authenticate, commonCtrl.getMeetings);
router.post('/meetings', authenticate, commonCtrl.createMeeting);
router.get('/announcements', authenticate, commonCtrl.getAnnouncements);
router.post('/announcements', authenticate, commonCtrl.createAnnouncement);
router.get('/templates', authenticate, commonCtrl.getTemplates);
router.post('/templates', authenticate, commonCtrl.createTemplate);
router.delete('/templates/:templateId', authenticate, commonCtrl.deleteTemplate);

// ----------------- DOCUMENTS & FILES -----------------
router.get('/teams/:teamId/documents', authenticate, commonCtrl.getTeamDocuments);
router.get('/teams/:teamId/presentations', authenticate, commonCtrl.getTeamPresentations);
router.get('/documents/:docId/meta', commonCtrl.getDocumentMeta);
router.get('/documents/:docId/raw', commonCtrl.serveDocumentRaw);
router.get('/documents/:docId/view', commonCtrl.serveDocumentById);
router.get('/files/download/:folder/:filename', commonCtrl.serveLocalFile);
router.get('/files/download/:folder/:subFolder/:filename', commonCtrl.serveLocalFile);

export default router;

