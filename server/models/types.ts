export interface UserDoc {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  visiblePassword?: string;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  capabilities: ('ADMIN' | 'FACULTY' | 'STUDENT')[];
  signatureUrl?: string;
  signatureDataUrl?: string;
  stampUrl?: string;
  stampDataUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BatchDoc {
  _id?: string;
  id?: string;
  name: string; // e.g. "BSCS Spring 2026"
  program: string; // e.g. "BS Computer Science"
  academicYear: string; // e.g. "2025-2026"
  currentSemester: number; // 7 or 8
  registrationDeadline?: string; // ISO date string
  registrationOpen: boolean;
  portalsCreated: boolean;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
}

export interface SemesterDoc {
  _id?: string;
  id?: string;
  batchId: string;
  semesterNumber: number; // 7 or 8
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'LOCKED';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicAssignmentDoc {
  _id?: string;
  id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  batchId: string;
  batchName?: string;
  semesterNumber: number; // 7 or 8
  responsibility: 'COORDINATOR' | 'SUPERVISOR' | 'EXAMINER';
  status: 'ACTIVE' | 'COMPLETED' | 'REVOKED';
  startDate?: string;
  endDate?: string;
  assignedBy: string; // user id of Super Admin or authorized administrator
  assignedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentDoc {
  _id?: string;
  id?: string;
  userId: string;
  batchId: string;
  registrationNo: string; // e.g. "SP22-BCS-001"
  name: string;
  email: string;
  portalPassword?: string;
  teamId?: string;
  status: 'ACTIVE' | 'GRADUATED' | 'DROPPED';
  createdAt?: string;
  updatedAt?: string;
}

export interface SupervisorTopicDoc {
  _id?: string;
  id?: string;
  supervisorId: string;
  supervisorName: string;
  batchId: string;
  semesterNumber: number;
  title: string;
  description: string;
  technologies?: string[];
  status: 'AVAILABLE' | 'OCCUPIED';
  occupiedByTeamId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamDoc {
  _id?: string;
  id?: string;
  teamCode: string; // e.g. "TEAM-001"
  batchId: string;
  batchName?: string;
  studentIds: string[]; // student doc IDs
  studentRegNos: string[];
  studentNames: string[];
  supervisorId?: string;
  supervisorName?: string;
  semesterNumber: number;
  projectTitle?: string;
  status: 'PENDING_REGISTRATION' | 'PORTAL_ACTIVE' | 'COMPLETED';
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamRegistrationRequestDoc {
  _id?: string;
  id?: string;
  batchId: string;
  teamId: string;
  teamCode: string;
  student1RegNo: string;
  student1Name: string;
  student2RegNo: string;
  student2Name: string;
  submittedAt: string;
  status: 'PENDING' | 'PORTAL_CREATED' | 'REJECTED';
}

export interface AIAnalysisResult {
  similarityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  similarProjects: string[];
  matchingAreas: string[];
  reasoning: string;
  improvementSuggestions: string[];
  isLikelyDuplicate: boolean;
}

export interface ProposalDoc {
  _id?: string;
  id?: string;
  teamId: string;
  batchId: string;
  semesterNumber: number;
  title: string;
  description: string;
  problemStatement: string;
  objectives: string;
  methodology: string;
  technologies: string;
  expectedOutcome: string;
  supervisorId: string;
  selectedTopicId?: string;
  isCustomTopic: boolean;
  aiAnalysis?: AIAnalysisResult;
  similarityScore: number;
  status:
    | 'DRAFT'
    | 'AI_REVIEW_REQUIRED'
    | 'AI_REVIEWED'
    | 'CHANGES_REQUIRED'
    | 'SUBMITTED_TO_SUPERVISOR'
    | 'SUPERVISOR_REVIEW'
    | 'SUPERVISOR_CHANGES_REQUESTED'
    | 'SUPERVISOR_APPROVED'
    | 'COORDINATOR_REVIEW'
    | 'APPROVED'
    | 'REJECTED';
  supervisorFeedback?: string;
  coordinatorFeedback?: string;
  approvedBySupervisorId?: string;
  approvedBySupervisorAt?: string;
  approvedByCoordinatorId?: string;
  approvedByCoordinatorAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PhaseDoc {
  _id?: string;
  id?: string;
  teamId: string;
  semesterNumber: number; // 7 or 8
  phaseNumber: number; // 1 for Sem 7, 2 for Sem 8
  status: 'LOCKED' | 'OPEN' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUIRED' | 'APPROVED' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentDoc {
  _id?: string;
  id?: string;
  teamId: string;
  phaseId?: string;
  semesterNumber: number; // 7 or 8
  type: 'PROPOSAL' | 'PRESENTATION_S7' | 'CODE_REPO' | 'THESIS' | 'PRESENTATION_S8' | 'OTHER';
  title: string;
  cloudinaryUrl: string;
  fileDataUrl?: string;
  fileName?: string;
  repoUrl?: string;
  liveUrl?: string;
  version: number;
  uploadedBy: string; // user id
  uploadedByName: string;
  status: 'UPLOADED' | 'SUPERVISOR_SIGNED' | 'COORDINATOR_SIGNED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'LOCKED';
  isLocked: boolean;
  supervisorApproval?: {
    approvedBy: string; // User ID
    approvedByName: string;
    approvedAt: string;
    signatureUrl: string;
    signatureDataUrl?: string;
    comments?: string;
  };
  coordinatorApproval?: {
    approvedBy: string; // User ID
    approvedByName: string;
    approvedAt: string;
    signatureUrl: string;
    signatureDataUrl?: string;
    stampUrl: string;
    stampDataUrl?: string;
    comments?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatRoomDoc {
  _id?: string;
  id?: string;
  teamId: string;
  teamCode: string;
  supervisorId: string;
  participants: string[]; // user IDs
  createdAt?: string;
}

export interface MessageDoc {
  _id?: string;
  id?: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

export interface AnnouncementDoc {
  _id?: string;
  id?: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  targetType: 'BATCH' | 'TEAM' | 'SUPERVISOR_TEAMS';
  targetId: string; // batchId or teamId or supervisorId
  title: string;
  message: string;
  createdAt?: string;
}

export interface MeetingDoc {
  _id?: string;
  id?: string;
  teamId: string;
  teamCode: string;
  createdBy: string;
  creatorName: string;
  creatorRole: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  link?: string;
  description: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt?: string;
}

export interface PresentationDoc {
  _id?: string;
  id?: string;
  teamId: string;
  teamCode: string;
  batchId: string;
  semesterNumber: number; // 7 or 8
  title: string;
  examinerId?: string;
  examinerName?: string;
  marks?: number;
  maxMarks?: number;
  comments?: string;
  result: 'PASS' | 'FAIL_IDEA' | 'PENDING';
  scheduledDate?: string;
  gradedAt?: string;
  createdAt?: string;
}

export interface AuditLogDoc {
  _id?: string;
  id?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  batchId?: string;
  semesterNumber?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface PreviousProjectDoc {
  _id?: string;
  id?: string;
  title: string;
  academicYear: string;
  batchName: string;
  description: string;
  problemStatement: string;
  methodology: string;
  technologies: string[];
}

export interface SystemSettingsDoc {
  _id?: string;
  id?: string;
  maxTeamsPerSupervisor: number;
  teamSize: number;
  proposalSimilarityThreshold: number;
  allowOwnTopic: boolean;
  updatedAt?: string;
}
