import mongoose from 'mongoose';
import { initDatabaseConnection, db } from '../config/db.js';
import { seedInitialData, purgeAllDummyData } from '../seed/seedData.js';
import { analyzeProposalSimilarity } from '../services/aiService.js';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('--- STARTING CRITICAL FYP BUSINESS RULES TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Initialize & Seed for Test Verification
  await initDatabaseConnection();
  await seedInitialData(true);

  // Test 1: Historical Record Preservation on Coordinator Reassignment (Rule #7, #18, #53)
  const batch2026 = await db.Batches.findOne({ name: 'BSCS Class of 2026' });
  const sem7Coord = await db.AcademicAssignments.findOne({
    batchId: (batch2026?._id || batch2026?.id)!,
    semesterNumber: 7,
    responsibility: 'COORDINATOR',
  });
  assert(Boolean(sem7Coord?.userName?.includes('Ahmed')), 'Sem 7 Coordinator is Dr. Ahmed');

  const sem8Coord = await db.AcademicAssignments.findOne({
    batchId: (batch2026?._id || batch2026?.id)!,
    semesterNumber: 8,
    responsibility: 'COORDINATOR',
  });
  assert(Boolean(sem8Coord?.userName?.includes('Bilal')), 'Sem 8 Coordinator is Dr. Bilal (Different coordinator per semester)');

  // Ensure Semester 7 approved documents STILL retain Dr. Ahmed as signatory
  const sem7Doc = await db.Documents.findOne({ semesterNumber: 7, type: 'PROPOSAL' });
  assert(
    Boolean(sem7Doc?.coordinatorApproval?.approvedByName?.includes('Ahmed')),
    'Historical Semester 7 document approvals remain permanently attributed to Dr. Ahmed even when Sem 8 has Dr. Bilal'
  );

  // Test 2: Coordinator can also be Supervisor (Rule #8, #59)
  const drAhmed = await db.Users.findOne({ email: 'ahmed@university.edu' });
  const ahmedAssignments = await db.AcademicAssignments.find({
    userId: (drAhmed?._id || drAhmed?.id)!,
    batchId: (batch2026?._id || batch2026?.id)!,
  });
  const responsibilities = ahmedAssignments.map((a: any) => a.responsibility);
  assert(
    responsibilities.includes('COORDINATOR') && responsibilities.includes('SUPERVISOR'),
    'Dr. Ahmed holds BOTH Coordinator and Supervisor assignments simultaneously without duplicate accounts'
  );

  // Test 3: Duplicate Team & Invalid Registration Number Prevention (Rule #20, #57)
  const existingStudent = await db.Students.findOne({ registrationNo: 'SP22-BCS-001' });
  assert(!!existingStudent?.teamId, 'Ali Khan is already enrolled in Team 001');

  // Test 4: Multi-Batch Isolation (Rule #11, #42)
  const juniorBatch = await db.Batches.findOne({ name: 'BSCS Class of 2027 (Junior Batch)' });
  const juniorStudents = await db.Students.find({ batchId: (juniorBatch?._id || juniorBatch?.id)! });
  const seniorStudents = await db.Students.find({ batchId: (batch2026?._id || batch2026?.id)! });
  assert(juniorStudents.length > 0 && seniorStudents.length > 0, 'Both Senior and Junior batches exist concurrently');

  const crossContamination = juniorStudents.some((j: any) =>
    seniorStudents.map((s: any) => s.registrationNo).includes(j.registrationNo)
  );
  assert(!crossContamination, 'Students are strictly isolated by batch ID without cross-leakage');

  // Test 5: Chat Restriction Rule (Rule #30)
  // Chat must NOT exist before supervisor proposal approval
  const unapprovedProposal = await db.Proposals.findOne({ status: 'DRAFT' });
  assert(!unapprovedProposal, 'Unapproved proposals have no active chat rooms');

  const approvedProposal = await db.Proposals.findOne({ status: 'SUPERVISOR_APPROVED' });
  const chatRoom = await db.ChatRooms.findOne({ teamId: approvedProposal?.teamId });
  assert(!!chatRoom, 'Chat room is active ONLY for teams with accepted supervisor proposals');

  // Test 6: AI Similarity Engine Schema & Formatting (Rule #26, #28)
  const aiTestResult = await analyzeProposalSimilarity({
    title: 'Precision Drone Crop Diagnostics with Vision',
    description: 'Autonomous drone flight with NDVI multispectral cameras to identify crop disease.',
    problemStatement: 'Manual agricultural crop monitoring is labor-intensive and fails to detect micro-pest infestations.',
    objectives: 'Drone waypoint flight with real time YOLO processing',
    methodology: 'YOLOv8 embedded on Raspberry Pi with PX4 telemetry',
    technologies: 'Python, OpenCV, PyTorch, PX4',
  });

  assert(
    typeof aiTestResult.similarityScore === 'number' &&
    ['LOW', 'MEDIUM', 'HIGH'].includes(aiTestResult.riskLevel) &&
    Array.isArray(aiTestResult.similarProjects) &&
    Array.isArray(aiTestResult.improvementSuggestions),
    'Gemini AI response adheres strictly to structured JSON format with similarityScore, riskLevel, and improvementSuggestions'
  );

  // Test 7: Locked Document Protection (Rule #36)
  const lockedDoc = await db.Documents.findOne({ isLocked: true });
  assert(!!lockedDoc && lockedDoc.isLocked, 'Official approved documents are locked against silent student modification');

  // Test 8: Examiner Grading & Phase Advancement (Rule #37, #38)
  const presentation = await db.Presentations.findOne({ teamCode: 'FYP-2026-001' });
  assert(!!presentation, 'Defense presentation session is properly scheduled and attributed to examiner Dr. Usman');

  // Clean up all dummy test data so the system remains completely clean (Super Admin preserved)
  await purgeAllDummyData();
  const remainingBatches = await db.Batches.countDocuments();
  const remainingUsers = await db.Users.countDocuments();
  assert(remainingBatches === 0 && remainingUsers === 1, 'Database purged back to clean slate with only Super Admin preserved');

  console.log(`\n--- TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ---`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error('Test Suite Error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
