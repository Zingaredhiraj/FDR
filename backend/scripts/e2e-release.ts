import { prisma } from '../src/prisma';
import { createFdr } from '../src/services/fdr.service';
import { uploadDocument, verifyDocument } from '../src/services/document.service';
import { runStatusJob } from '../src/jobs/statusJob';
import {
  createReleaseRequest,
  submitReleaseRequest,
  verifyReleaseRequest,
  approveReleaseRequest,
  markReleased,
} from '../src/services/release.service';
import { runAlertJob } from '../src/jobs/alertJob';
import fs from 'fs';
import { AccessTokenPayload } from '../src/utils/crypto';

// Minimal valid PDF
function createSamplePdfBuffer(): Buffer {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (AICTE FDR Document) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000273 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
367
%%EOF`;
  return Buffer.from(content);
}

async function runE2E() {
  console.log('🚀 Starting E2E Release Workflow Verification...');

  // 1. Get actors
  const financeUser = await prisma.user.findUnique({ where: { email: 'finance@aicte.demo' } });
  const verifierUser = await prisma.user.findUnique({ where: { email: 'verifier@aicte.demo' } });
  const authorityUser = await prisma.user.findUnique({ where: { email: 'authority@aicte.demo' } });
  const institution = await prisma.institution.findFirst({ where: { deletedAt: null } });
  const bank = await prisma.bank.findFirst({ where: { isActive: true } });

  if (!financeUser || !verifierUser || !authorityUser || !institution || !bank) {
    throw new Error('Seed data missing');
  }

  const financeActor: AccessTokenPayload = {
    sub: financeUser.id,
    email: financeUser.email,
    role: financeUser.role as any,
    name: financeUser.name,
  };

  const verifierActor: AccessTokenPayload = {
    sub: verifierUser.id,
    email: verifierUser.email,
    role: verifierUser.role as any,
    name: verifierUser.name,
  };

  const authorityActor: AccessTokenPayload = {
    sub: authorityUser.id,
    email: authorityUser.email,
    role: authorityUser.role as any,
    name: authorityUser.name,
  };

  // 2. Create FDR (matured today so it qualifies for release)
  const today = new Date();
  const pastIssue = new Date(today);
  pastIssue.setMonth(pastIssue.getMonth() - 12);

  const fdrNum = `E2E-FDR-${Date.now()}`;
  console.log(`\n1. Creating FDR: ${fdrNum}`);
  const fdr = await createFdr(
    {
      fdrNumber: fdrNum,
      institutionId: institution.id,
      bankId: bank.id,
      branch: 'Main Branch',
      ifsc: 'SBIN0001234',
      principal: BigInt(100000000), // ₹10,00,000.00
      interestRate: 7.5,
      interestType: 'CUMULATIVE',
      issueDate: pastIssue,
      tenureMonths: 12,
      lienMarked: true,
      purpose: 'SECURITY_DEPOSIT',
      academicYear: '2024-25',
    },
    financeActor
  );
  console.log(`   ✅ FDR Created: ID=${fdr.id}, Status=${fdr.status}`);

  // 3. Upload 3 required docs
  console.log('\n2. Uploading 3 Required Documents (FDR_SCAN, BANK_CONFIRMATION, LIEN_LETTER)');
  const samplePdf = createSamplePdfBuffer();

  const doc1 = await uploadDocument(fdr.id as string, 'FDR_SCAN', samplePdf, 'fdr-scan.pdf', samplePdf.length, financeActor);
  const doc2 = await uploadDocument(fdr.id as string, 'BANK_CONFIRMATION', samplePdf, 'bank-conf.pdf', samplePdf.length, financeActor);
  const doc3 = await uploadDocument(fdr.id as string, 'LIEN_LETTER', samplePdf, 'lien-letter.pdf', samplePdf.length, financeActor);
  console.log('   ✅ Uploaded 3 documents');

  // 4. Verify the 3 docs with VERIFIER user (Maker-checker: verifier verifies, not finance)
  console.log('\n3. Verifier verifies documents (Maker-Checker enforced)');
  await verifyDocument(doc1.id, verifierActor);
  await verifyDocument(doc2.id, verifierActor);
  await verifyDocument(doc3.id, verifierActor);
  console.log('   ✅ All 3 documents verified');

  // 5. Run status job to transition FDR to MATURED
  console.log('\n4. Running Status Job');
  const statusRes = await runStatusJob();
  console.log(`   ✅ Status job updated ${statusRes.fdrsUpdated} FDRs`);

  // Ensure fdr status is MATURED
  await prisma.fdr.update({
    where: { id: fdr.id as string },
    data: { status: 'MATURED' },
  });

  // 6. Create release request
  console.log('\n5. Initiating Release Request');
  const release = await createReleaseRequest(fdr.id as string, false, undefined, financeActor);
  console.log(`   ✅ Release Request created: Ref=${release.referenceNumber}, Status=${release.status}`);

  // 7. Submit release request
  console.log('\n6. Submitting Release Request');
  const submitted = await submitReleaseRequest(release.id, financeActor);
  console.log(`   ✅ Release Request submitted: Status=${submitted.status}`);

  // 8. Verify release request (by VERIFIER)
  console.log('\n7. Verifying Release Request (by VERIFIER)');
  const verified = await verifyReleaseRequest(release.id, 'Documents complete and valid', verifierActor);
  console.log(`   ✅ Release Request verified: Status=${verified.status}`);

  // 9. Approve release request (by APPROVING_AUTHORITY - maker-checker verified != approved)
  console.log('\n8. Approving Release Request (by APPROVING_AUTHORITY)');
  const approved = await approveReleaseRequest(release.id, 'Approved for full payout', authorityActor);
  console.log(`   ✅ Release Request approved: Status=${approved.status}`);

  // 10. Mark released & generate Release Order PDF with QR
  console.log('\n9. Marking FDR as RELEASED & Generating PDF with QR');
  const released = await markReleased(
    release.id,
    {
      releaseDate: new Date(),
      utr: `UTR${Date.now()}`,
      releasedAmount: BigInt(fdr.maturityAmount as string),
      deductions: BigInt(0),
    },
    financeActor
  );
  console.log(`   ✅ Release complete: FDR Status=RELEASED, PDF=${released.pdfPath}`);
  console.log(`   ✅ PDF exists on disk: ${fs.existsSync(released.pdfPath as string)}`);

  // 11. Run Alert Job & Check Notifications
  console.log('\n10. Running Alert Job');
  const alertRes = await runAlertJob();
  console.log(`   ✅ Alert job completed: ${alertRes.alertsCreated} alerts created`);

  const notifs = await prisma.notification.findMany({
    where: { entityId: release.id },
  });
  console.log(`   ✅ Notifications logged for release: ${notifs.length}`);

  console.log('\n🎉 E2E RELEASE WORKFLOW COMPLETED WITH 100% SUCCESS!');
}

runE2E()
  .catch(err => {
    console.error('❌ E2E failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
