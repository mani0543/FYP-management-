import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

export async function seedInitialData(force = false): Promise<void> {
  // Ensure default System Settings exist
  const existingSettings = await db.SystemSettings.find();
  if (!existingSettings || existingSettings.length === 0) {
    await db.SystemSettings.create({
      maxTeamsPerSupervisor: 5,
      teamSize: 2,
      proposalSimilarityThreshold: 60,
      allowOwnTopic: true,
    });
  }

  // Ensure Super Admin exists
  const adminCheck = await db.Users.findOne({ email: 'admin@university.edu' });
  if (!adminCheck) {
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    await db.Users.create({
      name: 'System Administrator',
      email: 'admin@university.edu',
      passwordHash: adminPasswordHash,
      accountStatus: 'ACTIVE',
      capabilities: ['ADMIN'],
    });
  }

  // By default on server startup (force = false), keep the database completely free of dummy data.
  if (!force) {
    return;
  }

  const existingAdmin = await db.Users.findOne({ email: 'admin@university.edu' });
  const preservedAdminId = existingAdmin ? (existingAdmin._id || existingAdmin.id) : undefined;

  await db.Batches.deleteMany({});
  await db.Semesters.deleteMany({});
  await db.AcademicAssignments.deleteMany({});
  await db.Students.deleteMany({});
  await db.SupervisorTopics.deleteMany({});
  await db.Teams.deleteMany({});
  await db.TeamRegistrationRequests.deleteMany({});
  await db.Proposals.deleteMany({});
  await db.Phases.deleteMany({});
  await db.Documents.deleteMany({});
  await db.ChatRooms.deleteMany({});
  await db.Messages.deleteMany({});
  await db.Announcements.deleteMany({});
  await db.Meetings.deleteMany({});
  await db.Presentations.deleteMany({});
  await db.AuditLogs.deleteMany({});
  await db.PreviousProjects.deleteMany({});
  await db.Users.deleteMany({});

  if (preservedAdminId) {
    const adminHash = await bcrypt.hash('Admin@123', 10);
    await db.Users.create({
      _id: preservedAdminId,
      id: preservedAdminId,
      name: 'System Administrator',
      email: 'admin@university.edu',
      passwordHash: adminHash,
      accountStatus: 'ACTIVE',
      capabilities: ['ADMIN'],
    });
  }

  // Ensure Archive of Previous Completed FYP Projects exists for Gemini AI Originality Comparison
  const existingArchives = await db.PreviousProjects.find();
  if (existingArchives.length === 0) {
    await db.PreviousProjects.create([
      {
        title: 'Autonomous Drone-Based Crop Disease Detection System',
        batchName: 'BSCS Class of 2024',
        academicYear: '2023-2024',
        description: 'UAV quadcopter equipped with multispectral cameras and embedded YOLOv8 computer vision to detect early blight and leaf rust in wheat fields.',
        problemStatement: 'Manual agricultural crop scouting is slow, labor-intensive, and misses early-stage plant pathology across large farms.',
        methodology: 'Drone waypoint navigation using PX4 autopilot with onboard Raspberry Pi running quantized YOLOv8 inference and telemetry dashboard.',
        technologies: ['Python', 'PyTorch', 'YOLOv8', 'OpenCV', 'PX4', 'React'],
      },
      {
        title: 'Blockchain-Verified Academic Credential & Transcript Ledger',
        batchName: 'BSCS Class of 2024',
        academicYear: '2023-2024',
        description: 'Decentralized university degree issuance and instant employer verification portal using Ethereum smart contracts and IPFS storage.',
        problemStatement: 'Counterfeit academic degrees and slow manual registrar verification processes cause delays in graduate background checks.',
        methodology: 'Solidity smart contracts with ERC-721 verifiable credentials, IPFS encrypted document pinning, and Web3 React verifier.',
        technologies: ['Solidity', 'Ethereum', 'IPFS', 'Node.js', 'React'],
      },
      {
        title: 'Real-Time Hospital ICU Patient Vital Sign Anomaly Alerting',
        batchName: 'BSCS Class of 2025',
        academicYear: '2024-2025',
        description: 'IoT bedside telemetry aggregator with LSTM time-series forecasting to predict sepsis and cardiac distress 4 hours before clinical onset.',
        problemStatement: 'ICU nurses experience alarm fatigue from static threshold monitors that fail to capture multi-vital correlation trends.',
        methodology: 'MQTT sensor ingestion pipeline, Bidirectional LSTM anomaly detector, and clinician mobile escalation alerts.',
        technologies: ['Python', 'TensorFlow', 'MQTT', 'FastAPI', 'React'],
      },
    ]);
  }

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const facultyHash = await bcrypt.hash('Faculty@123', 10);
  const studentHash = await bcrypt.hash('Student@123', 10);

  // Sample SVG Data URLs for reusable digital signatures & departmental stamp
  const sampleSigAhmed = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50"><text x="10" y="35" font-family="cursive" font-size="22" fill="#1e3a8a">Dr. Ahmed Khan</text></svg>');
  const sampleSigBilal = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50"><text x="10" y="35" font-family="cursive" font-size="22" fill="#0f172a">Dr. Bilal Raza</text></svg>');
  const sampleStamp = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect x="4" y="4" width="112" height="52" rx="6" fill="none" stroke="#1d4ed8" stroke-width="3"/><text x="60" y="26" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1d4ed8" text-anchor="middle">CS DEPARTMENT</text><text x="60" y="42" font-family="sans-serif" font-size="9" font-weight="bold" fill="#1d4ed8" text-anchor="middle">OFFICIAL SEAL</text></svg>');

  // 1. Ensure Super Admin
  let admin = await db.Users.findOne({ email: 'admin@university.edu' });
  if (!admin) {
    admin = await db.Users.create({
      name: 'System Administrator',
      email: 'admin@university.edu',
      passwordHash: adminHash,
      accountStatus: 'ACTIVE',
      capabilities: ['ADMIN'],
    });
  }
  const adminId = (admin?._id || admin?.id || 'admin_1')!;

  // 2. Create Faculty Accounts (Demonstrating Rule #5, #7, #8, #9, #10, #59)
  const drAhmed = await db.Users.create({
    name: 'Dr. Ahmed Khan',
    email: 'ahmed@university.edu',
    passwordHash: facultyHash,
    accountStatus: 'ACTIVE',
    capabilities: ['FACULTY'],
    signatureUrl: sampleSigAhmed,
    stampUrl: sampleStamp,
  });
  const ahmedId = (drAhmed._id || drAhmed.id)!;

  const drBilal = await db.Users.create({
    name: 'Dr. Bilal Raza',
    email: 'bilal@university.edu',
    passwordHash: facultyHash,
    accountStatus: 'ACTIVE',
    capabilities: ['FACULTY'],
    signatureUrl: sampleSigBilal,
    stampUrl: sampleStamp,
  });
  const bilalId = (drBilal._id || drBilal.id)!;

  const drHamza = await db.Users.create({
    name: 'Dr. Hamza Tariq',
    email: 'hamza@university.edu',
    passwordHash: facultyHash,
    accountStatus: 'ACTIVE',
    capabilities: ['FACULTY'],
    signatureUrl: sampleSigAhmed,
    stampUrl: sampleStamp,
  });
  const hamzaId = (drHamza._id || drHamza.id)!;

  const drUsman = await db.Users.create({
    name: 'Dr. Usman Malik',
    email: 'usman@university.edu',
    passwordHash: facultyHash,
    accountStatus: 'ACTIVE',
    capabilities: ['FACULTY'],
    signatureUrl: sampleSigBilal,
  });
  const usmanId = (drUsman._id || drUsman.id)!;

  // 3. Create Batches (Senior Batch 2026 & Junior Batch 2027)
  const futureDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const batch2026 = await db.Batches.create({
    name: 'BSCS Class of 2026',
    program: 'BS Computer Science',
    academicYear: '2025-2026',
    currentSemester: 7,
    status: 'ACTIVE',
    registrationDeadline: futureDeadline,
    registrationOpen: false,
    portalsCreated: true,
  });
  const batch2026Id = (batch2026._id || batch2026.id)!;

  await db.Semesters.create([
    { batchId: batch2026Id, semesterNumber: 7, status: 'ACTIVE' },
    { batchId: batch2026Id, semesterNumber: 8, status: 'UPCOMING' },
  ]);

  const batch2027 = await db.Batches.create({
    name: 'BSCS Class of 2027 (Junior Batch)',
    program: 'BS Computer Science',
    academicYear: '2026-2027',
    currentSemester: 7,
    status: 'ACTIVE',
    registrationDeadline: futureDeadline,
    registrationOpen: true,
    portalsCreated: false,
  });
  const batch2027Id = (batch2027._id || batch2027.id)!;

  await db.Semesters.create([
    { batchId: batch2027Id, semesterNumber: 7, status: 'ACTIVE' },
    { batchId: batch2027Id, semesterNumber: 8, status: 'UPCOMING' },
  ]);

  // 4. Create Dynamic Academic Assignments (Exact scenario from Rule #59)
  // Batch 2026 Sem 7: Coordinator = Dr. Ahmed, Supervisors = Dr. Ahmed, Dr. Bilal, Dr. Usman, Examiner = Dr. Usman
  // Batch 2026 Sem 8: Coordinator = Dr. Bilal, Supervisors = Dr. Ahmed, Dr. Usman, Dr. Hamza
  // Batch 2027 Sem 7: Coordinator = Dr. Hamza, Supervisors = Dr. Ahmed, Dr. Bilal, Dr. Usman
  await db.AcademicAssignments.create([
    {
      userId: ahmedId,
      userName: drAhmed.name,
      userEmail: drAhmed.email,
      batchId: batch2026Id,
      batchName: batch2026.name,
      semesterNumber: 7,
      responsibility: 'COORDINATOR',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
    {
      userId: ahmedId,
      userName: drAhmed.name,
      userEmail: drAhmed.email,
      batchId: batch2026Id,
      batchName: batch2026.name,
      semesterNumber: 7,
      responsibility: 'SUPERVISOR',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
    {
      userId: bilalId,
      userName: drBilal.name,
      userEmail: drBilal.email,
      batchId: batch2026Id,
      batchName: batch2026.name,
      semesterNumber: 7,
      responsibility: 'SUPERVISOR',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
    {
      userId: usmanId,
      userName: drUsman.name,
      userEmail: drUsman.email,
      batchId: batch2026Id,
      batchName: batch2026.name,
      semesterNumber: 7,
      responsibility: 'EXAMINER',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
    // Semester 8 Assignments for Batch 2026 (Dr. Bilal is Coordinator in Sem 8, Dr. Ahmed is Supervisor)
    {
      userId: bilalId,
      userName: drBilal.name,
      userEmail: drBilal.email,
      batchId: batch2026Id,
      batchName: batch2026.name,
      semesterNumber: 8,
      responsibility: 'COORDINATOR',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
    {
      userId: ahmedId,
      userName: drAhmed.name,
      userEmail: drAhmed.email,
      batchId: batch2026Id,
      batchName: batch2026.name,
      semesterNumber: 8,
      responsibility: 'SUPERVISOR',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
    // Junior Batch 2027 Assignments (Dr. Hamza is Coordinator, Dr. Ahmed & Dr. Bilal are Supervisors)
    {
      userId: hamzaId,
      userName: drHamza.name,
      userEmail: drHamza.email,
      batchId: batch2027Id,
      batchName: batch2027.name,
      semesterNumber: 7,
      responsibility: 'COORDINATOR',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
    {
      userId: ahmedId,
      userName: drAhmed.name,
      userEmail: drAhmed.email,
      batchId: batch2027Id,
      batchName: batch2027.name,
      semesterNumber: 7,
      responsibility: 'SUPERVISOR',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      assignedBy: adminId,
      assignedByName: 'System Administrator',
    },
  ]);

  // 5. Create Students & Teams for Senior Batch 2026
  const aliUser = await db.Users.create({
    name: 'Ali Khan',
    email: 'ali.khan@student.university.edu',
    passwordHash: studentHash,
    accountStatus: 'ACTIVE',
    capabilities: ['STUDENT'],
  });
  const saraUser = await db.Users.create({
    name: 'Sara Ahmed',
    email: 'sara.ahmed@student.university.edu',
    passwordHash: studentHash,
    accountStatus: 'ACTIVE',
    capabilities: ['STUDENT'],
  });

  const aliStudent = await db.Students.create({
    userId: (aliUser._id || aliUser.id)!,
    batchId: batch2026Id,
    registrationNo: 'SP22-BCS-001',
    name: 'Ali Khan',
    email: 'ali.khan@student.university.edu',
    status: 'ACTIVE',
  });
  const saraStudent = await db.Students.create({
    userId: (saraUser._id || saraUser.id)!,
    batchId: batch2026Id,
    registrationNo: 'SP22-BCS-002',
    name: 'Sara Ahmed',
    email: 'sara.ahmed@student.university.edu',
    status: 'ACTIVE',
  });

  const team001 = await db.Teams.create({
    teamCode: 'FYP-2026-001',
    batchId: batch2026Id,
    batchName: batch2026.name,
    studentIds: [(aliStudent._id || aliStudent.id)!, (saraStudent._id || saraStudent.id)!],
    studentRegNos: ['SP22-BCS-001', 'SP22-BCS-002'],
    studentNames: ['Ali Khan', 'Sara Ahmed'],
    supervisorId: bilalId,
    supervisorName: drBilal.name,
    semesterNumber: 7,
    projectTitle: 'Federated Learning Intrusion Detection for Smart Grid Sub-Stations',
    status: 'PORTAL_ACTIVE',
  });
  const team001Id = (team001._id || team001.id)!;

  await db.Students.findByIdAndUpdate((aliStudent._id || aliStudent.id)!, { teamId: team001Id });
  await db.Students.findByIdAndUpdate((saraStudent._id || saraStudent.id)!, { teamId: team001Id });

  await db.TeamRegistrationRequests.create({
    batchId: batch2026Id,
    teamId: team001Id,
    teamCode: 'FYP-2026-001',
    student1RegNo: 'SP22-BCS-001',
    student1Name: 'Ali Khan',
    student2RegNo: 'SP22-BCS-002',
    student2Name: 'Sara Ahmed',
    submittedAt: new Date().toISOString(),
    status: 'PORTAL_CREATED',
  });

  const phase1 = await db.Phases.create({
    teamId: team001Id,
    semesterNumber: 7,
    phaseNumber: 1,
    status: 'OPEN',
    startDate: new Date().toISOString(),
  });

  // Supervisor Topics
  const topic1 = await db.SupervisorTopics.create({
    supervisorId: bilalId,
    supervisorName: drBilal.name,
    batchId: batch2026Id,
    semesterNumber: 7,
    title: 'Federated Learning Intrusion Detection for Smart Grid Sub-Stations',
    description: 'Privacy-preserving anomaly detection across distributed IEC-61850 electrical grid nodes without centralizing raw packet captures.',
    technologies: ['Python', 'PyTorch', 'Flower Federated', 'Docker'],
    status: 'OCCUPIED',
    occupiedByTeamId: team001Id,
  });

  await db.SupervisorTopics.create({
    supervisorId: ahmedId,
    supervisorName: drAhmed.name,
    batchId: batch2026Id,
    semesterNumber: 7,
    title: 'Zero-Knowledge Proof Identity Verification for Healthcare Portals',
    description: 'Cryptographic patient authentication using zk-SNARKs to verify insurance eligibility without exposing PII.',
    technologies: ['Rust', 'Circom', 'SnarkJS', 'React'],
    status: 'AVAILABLE',
  });

  // Approved Proposal for Team 001
  await db.Proposals.create({
    teamId: team001Id,
    batchId: batch2026Id,
    semesterNumber: 7,
    title: 'Federated Learning Intrusion Detection for Smart Grid Sub-Stations',
    description: 'Distributed intrusion detection system utilizing federated averaging across regional electrical substations.',
    problemStatement: 'Centralized training of smart grid security models violates utility data sovereignty and introduces high WAN bandwidth overhead.',
    objectives: '1. Implement Flower federated learning pipeline. 2. Achieve >94% F1 score on ICS cyber-attack datasets.',
    methodology: 'Local 1D-CNN models trained on substation gateways with differential privacy noise and central weight aggregation.',
    technologies: 'Python, PyTorch, Flower, Docker, React',
    expectedOutcome: 'Deployable federated IDS dashboard with real-time attack classification.',
    supervisorId: bilalId,
    selectedTopicId: (topic1._id || topic1.id)!,
    isCustomTopic: false,
    similarityScore: 18,
    aiAnalysis: {
      similarityScore: 18,
      riskLevel: 'LOW',
      similarProjects: [],
      matchingAreas: ['Telemetry dashboard visualization'],
      reasoning: 'High academic novelty. Unlike prior IoT telemetry projects, this proposal focuses on Federated Learning and IEC-61850 grid protocols.',
      improvementSuggestions: [
        'Include adversarial poisoning resilience benchmarks during federated weight aggregation.',
        'Evaluate communication overhead under constrained cellular links.',
      ],
      isLikelyDuplicate: false,
    },
    status: 'SUPERVISOR_APPROVED',
    supervisorFeedback: 'Strong problem formulation. Approved for Semester 7 execution.',
    approvedBySupervisorId: bilalId,
    approvedBySupervisorAt: new Date().toISOString(),
  });

  // Active Chat Room for Team 001 (since proposal is SUPERVISOR_APPROVED)
  const room = await db.ChatRooms.create({
    teamId: team001Id,
    teamCode: 'FYP-2026-001',
    supervisorId: bilalId,
    participants: [bilalId, (aliUser._id || aliUser.id)!, (saraUser._id || saraUser.id)!],
    isActive: true,
  });

  await db.Messages.create({
    roomId: (room._id || room.id)!,
    senderId: bilalId,
    senderName: drBilal.name,
    senderRole: 'SUPERVISOR',
    message: 'Welcome to the FYP-2026-001 consultation room. Your proposal has been accepted.',
    timestamp: new Date().toISOString(),
  });

  // Official Signed & Stamped Semester 7 Proposal Document (attributed to Dr. Ahmed as Sem 7 Coordinator)
  await db.Documents.create({
    teamId: team001Id,
    phaseId: (phase1._id || phase1.id)!,
    semesterNumber: 7,
    type: 'PROPOSAL',
    title: 'Official FYP Proposal Document — FYP-2026-001',
    cloudinaryUrl: sampleStamp,
    version: 1,
    uploadedBy: (aliUser._id || aliUser.id)!,
    uploadedByName: 'Ali Khan',
    status: 'APPROVED',
    isLocked: true,
    supervisorApproval: {
      approvedBy: bilalId,
      approvedByName: drBilal.name,
      approvedAt: new Date().toISOString(),
      signatureUrl: sampleSigBilal,
      comments: 'Methodology and dataset benchmarks verified.',
    },
    coordinatorApproval: {
      approvedBy: ahmedId,
      approvedByName: drAhmed.name,
      approvedAt: new Date().toISOString(),
      signatureUrl: sampleSigAhmed,
      stampUrl: sampleStamp,
      comments: 'Officially approved and sealed for Semester 7.',
    },
  });

  // Scheduled Presentation for Team 001
  await db.Presentations.create({
    teamId: team001Id,
    teamCode: 'FYP-2026-001',
    batchId: batch2026Id,
    semesterNumber: 7,
    title: 'Semester 7 FYP Proposal Defense',
    examinerId: usmanId,
    examinerName: drUsman.name,
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    result: 'PENDING',
  });

  // 6. Create Junior Batch 2027 Students (Pre-portal Team Registration state)
  const zainUser = await db.Users.create({
    name: 'Zainab Malik',
    email: 'zainab@student.university.edu',
    passwordHash: studentHash,
    accountStatus: 'ACTIVE',
    capabilities: ['STUDENT'],
  });
  const omarUser = await db.Users.create({
    name: 'Omar Farooq',
    email: 'omar@student.university.edu',
    passwordHash: studentHash,
    accountStatus: 'ACTIVE',
    capabilities: ['STUDENT'],
  });

  await db.Students.create([
    {
      userId: (zainUser._id || zainUser.id)!,
      batchId: batch2027Id,
      registrationNo: 'SP23-BCS-010',
      name: 'Zainab Malik',
      email: 'zainab@student.university.edu',
      status: 'ACTIVE',
    },
    {
      userId: (omarUser._id || omarUser.id)!,
      batchId: batch2027Id,
      registrationNo: 'SP23-BCS-011',
      name: 'Omar Farooq',
      email: 'omar@student.university.edu',
      status: 'ACTIVE',
    },
  ]);

  await db.AuditLogs.create({
    actorId: adminId,
    actorName: 'System Administrator',
    actorRole: 'ADMIN',
    action: 'INITIALIZE_UNIVERSITY_FYP_SYSTEM',
    entityType: 'SYSTEM',
    entityId: 'root',
    metadata: { description: 'Initialized batches, dynamic faculty assignments, students, and historical archives.' },
    timestamp: new Date().toISOString(),
  });

  console.log('University FYP Management System academic records initialized.');
}

export async function purgeAllDummyData(): Promise<void> {
  console.log('Purging all dummy data across all collections...');

  const existingAdmin = await db.Users.findOne({ email: 'admin@university.edu' });
  const preservedAdminId = existingAdmin ? (existingAdmin._id || existingAdmin.id) : undefined;

  await db.Batches.deleteMany({});
  await db.Semesters.deleteMany({});
  await db.AcademicAssignments.deleteMany({});
  await db.Students.deleteMany({});
  await db.SupervisorTopics.deleteMany({});
  await db.Teams.deleteMany({});
  await db.TeamRegistrationRequests.deleteMany({});
  await db.Proposals.deleteMany({});
  await db.Phases.deleteMany({});
  await db.Documents.deleteMany({});
  await db.ChatRooms.deleteMany({});
  await db.Messages.deleteMany({});
  await db.Announcements.deleteMany({});
  await db.Meetings.deleteMany({});
  await db.Presentations.deleteMany({});
  await db.AuditLogs.deleteMany({});
  await db.PreviousProjects.deleteMany({});

  await db.Users.deleteMany({});
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  await db.Users.create({
    ...(preservedAdminId ? { _id: preservedAdminId, id: preservedAdminId } : {}),
    name: 'System Administrator',
    email: 'admin@university.edu',
    passwordHash: adminPasswordHash,
    accountStatus: 'ACTIVE',
    capabilities: ['ADMIN'],
  });

  await db.SystemSettings.deleteMany({});
  await db.SystemSettings.create({
    maxTeamsPerSupervisor: 5,
    teamSize: 2,
    proposalSimilarityThreshold: 60,
    allowOwnTopic: true,
  });

  console.log('All dummy data successfully purged.');
}

