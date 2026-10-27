import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const TODAY = new Date('2026-10-26T00:00:00.000Z');

function daysFromToday(days: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

function calcMaturityAmount(principal: bigint, rate: number, months: number, type: string): bigint {
  const P = Number(principal);
  const n = months / 12;
  if (type === 'CUMULATIVE') {
    return BigInt(Math.round(P * Math.pow(1 + rate / 400, 4 * n)));
  }
  return principal;
}

async function hashPwd(p: string) {
  return bcrypt.hash(p, 12);
}

// Create a minimal valid PDF buffer
function createMinimalPdf(): Buffer {
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

const STATES = [
  'Maharashtra', 'Tamil Nadu', 'Karnataka', 'Uttar Pradesh', 'Gujarat',
  'Rajasthan', 'Andhra Pradesh', 'Telangana', 'West Bengal', 'Madhya Pradesh',
  'Punjab', 'Haryana', 'Bihar', 'Odisha', 'Kerala',
];

const INST_TYPES = [
  'Engineering', 'Management', 'Pharmacy', 'Architecture', 'MCA',
  'MBA', 'Hotel Management', 'Applied Arts', 'Other',
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up in correct dependency order
  await prisma.alertLog.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.releaseStep.deleteMany();
  await prisma.releaseRequest.deleteMany();
  await prisma.document.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.fdr.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.bank.deleteMany();
  await prisma.systemSetting.deleteMany();

  // System settings
  await prisma.systemSetting.create({
    data: {
      key: 'nearMaturityDays',
      value: '90',
      description: 'Days before maturity to mark FDR as NEAR_MATURITY',
    },
  });

  // Banks
  const bankData = [
    { name: 'State Bank of India', shortCode: 'SBI' },
    { name: 'Punjab National Bank', shortCode: 'PNB' },
    { name: 'Canara Bank', shortCode: 'CANARA' },
    { name: 'Bank of Baroda', shortCode: 'BOB' },
    { name: 'Union Bank of India', shortCode: 'UNION' },
    { name: 'HDFC Bank', shortCode: 'HDFC' },
    { name: 'ICICI Bank', shortCode: 'ICICI' },
    { name: 'Axis Bank', shortCode: 'AXIS' },
    { name: 'Kotak Mahindra Bank', shortCode: 'KOTAK' },
    { name: 'IDBI Bank', shortCode: 'IDBI' },
    { name: 'Indian Bank', shortCode: 'INDBN' },
    { name: 'Bank of India', shortCode: 'BOI' },
  ];
  const banks = await Promise.all(bankData.map(b => prisma.bank.create({ data: b })));
  console.log(`✅ Created ${banks.length} banks`);

  // Institutions (40)
  const institutionData = [];
  for (let i = 0; i < 40; i++) {
    const state = STATES[i % STATES.length];
    const type = INST_TYPES[i % INST_TYPES.length];
    const city = `${state.split(' ')[0]} City ${Math.floor(i / STATES.length) + 1}`;
    institutionData.push({
      aicteId: `AICTE-${String(i + 1).padStart(5, '0')}`,
      name: `${state} Institute of ${type} ${i + 1}`,
      type,
      state,
      city,
      headName: `Dr. Principal ${i + 1}`,
      headEmail: `principal${i + 1}@inst.ac.in`,
      phone: `9876${String(500000 + i).padStart(6, '0')}`,
      approvalStatus: i % 20 === 0 && i > 0 ? 'PENDING' : 'APPROVED',
      hasPendingDues: i % 15 === 0 && i > 0,
      pendingDuesNote: i % 15 === 0 && i > 0 ? 'Outstanding fees for 2023-24' : null,
    });
  }
  const institutions = await Promise.all(institutionData.map(d => prisma.institution.create({ data: d })));
  console.log(`✅ Created ${institutions.length} institutions`);

  // Users
  const pwd = await hashPwd('Demo@1234');
  const adminUser = await prisma.user.create({
    data: { email: 'admin@aicte.demo', passwordHash: pwd, role: 'SUPER_ADMIN', name: 'Admin User', phone: '9000000001' },
  });
  const financeUser = await prisma.user.create({
    data: { email: 'finance@aicte.demo', passwordHash: pwd, role: 'FINANCE_OFFICER', name: 'Finance Officer', phone: '9000000002' },
  });
  const verifierUser = await prisma.user.create({
    data: { email: 'verifier@aicte.demo', passwordHash: pwd, role: 'VERIFIER', name: 'Verifier User', phone: '9000000003' },
  });
  const authorityUser = await prisma.user.create({
    data: { email: 'authority@aicte.demo', passwordHash: pwd, role: 'APPROVING_AUTHORITY', name: 'Approving Authority', phone: '9000000004' },
  });
  const instUser = await prisma.user.create({
    data: {
      email: 'institution@aicte.demo',
      passwordHash: pwd,
      role: 'INSTITUTION_USER',
      name: 'Institution User',
      phone: '9000000005',
      institutionId: institutions[0].id,
    },
  });
  const auditorUser = await prisma.user.create({
    data: { email: 'auditor@aicte.demo', passwordHash: pwd, role: 'AUDITOR', name: 'Auditor User', phone: '9000000006' },
  });
  console.log(`✅ Created 6 users`);

  const uploadBase = path.join(process.cwd(), 'uploads');
  const releasesDir = path.join(uploadBase, 'releases');
  fs.mkdirSync(releasesDir, { recursive: true });

  const pdfBuffer = createMinimalPdf();
  const purposes = ['APPROVAL_PROCESS_FEE', 'SECURITY_DEPOSIT', 'PERFORMANCE_GUARANTEE', 'OTHER'];
  const interestTypes = ['CUMULATIVE', 'QUARTERLY_PAYOUT'];

  const fdrList: { id: string; status: string; institutionId: string; maturityAmount: bigint }[] = [];
  let fdrNum = 1;

  function ensureInstDir(institutionId: string) {
    const dir = path.join(uploadBase, institutionId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async function createDocForFdr(fdrId: string, institutionId: string, docType: string, status: string) {
    const dir = ensureInstDir(institutionId);
    const filename = `${fdrId}-${docType}-v1.pdf`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, pdfBuffer);
    return prisma.document.create({
      data: {
        fdrId,
        documentType: docType,
        fileName: filename,
        originalName: `${docType.toLowerCase().replace(/_/g, '-')}.pdf`,
        mimeType: 'application/pdf',
        filePath,
        fileSize: pdfBuffer.length,
        version: 1,
        verificationStatus: status,
        uploadedById: financeUser.id,
        verifiedById: status !== 'PENDING' ? verifierUser.id : null,
        verifiedAt: status !== 'PENDING' ? new Date() : null,
        verificationRemarks: status === 'REJECTED' ? 'Document quality insufficient, please re-upload.' : null,
      },
    });
  }

  async function createFdrEntry(params: {
    institutionIdx: number;
    bankIdx: number;
    issueDate: Date;
    tenureMonths: number;
    principal: bigint;
    rate: number;
    status: string;
    purpose: string;
    interestType: string;
    academicYear: string;
    lienMarked: boolean;
    parentFdrId?: string;
    overrideMaturityDate?: Date;
  }) {
    const institution = institutions[params.institutionIdx % institutions.length];
    const bank = banks[params.bankIdx % banks.length];
    const matDate = params.overrideMaturityDate || addMonths(params.issueDate, params.tenureMonths);
    const matAmount = calcMaturityAmount(params.principal, params.rate, params.tenureMonths, params.interestType);
    const fdrNumber = `FDR-${String(fdrNum++).padStart(6, '0')}`;
    const shortCode = bank.shortCode.padEnd(4, 'X').slice(0, 4).toUpperCase();

    return prisma.fdr.create({
      data: {
        fdrNumber,
        institutionId: institution.id,
        bankId: bank.id,
        branch: `${bank.shortCode} Main Branch`,
        ifsc: `${shortCode}0001234`,
        principal: params.principal,
        interestRate: params.rate,
        interestType: params.interestType,
        issueDate: params.issueDate,
        tenureMonths: params.tenureMonths,
        maturityDate: matDate,
        maturityAmount: matAmount,
        quarterlyPayout: params.interestType === 'QUARTERLY_PAYOUT'
          ? BigInt(Math.round(Number(params.principal) * params.rate / 400))
          : BigInt(0),
        lienMarked: params.lienMarked,
        purpose: params.purpose,
        academicYear: params.academicYear,
        status: params.status,
        createdById: financeUser.id,
        parentFdrId: params.parentFdrId,
      },
    });
  }

  // 8 maturing within 7 days
  for (let i = 0; i < 8; i++) {
    const fdr = await createFdrEntry({
      institutionIdx: i,
      bankIdx: i,
      issueDate: addMonths(daysFromToday(i + 1 - 24 * 30 / 30), 0), // approximate
      tenureMonths: 24,
      principal: BigInt((100 + i * 50) * 10000000),
      rate: 6.5 + i * 0.1,
      status: 'NEAR_MATURITY',
      purpose: purposes[i % 4],
      interestType: interestTypes[i % 2],
      academicYear: '2024-25',
      lienMarked: true,
      overrideMaturityDate: daysFromToday(i + 1),
    });
    await createDocForFdr(fdr.id, fdr.institutionId, 'FDR_SCAN', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'BANK_CONFIRMATION', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'LIEN_LETTER', 'VERIFIED');
    fdrList.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
  }

  // 15 maturing within 30 days (but > 7)
  for (let i = 0; i < 15; i++) {
    const fdr = await createFdrEntry({
      institutionIdx: i + 8,
      bankIdx: i % 12,
      issueDate: addMonths(daysFromToday(8 + i), 0),
      tenureMonths: 12,
      principal: BigInt((200 + i * 30) * 10000000),
      rate: 7.0 + i * 0.05,
      status: 'NEAR_MATURITY',
      purpose: purposes[i % 4],
      interestType: interestTypes[i % 2],
      academicYear: '2024-25',
      lienMarked: true,
      overrideMaturityDate: daysFromToday(8 + i),
    });
    await createDocForFdr(fdr.id, fdr.institutionId, 'FDR_SCAN', i % 3 === 0 ? 'PENDING' : 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'BANK_CONFIRMATION', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'LIEN_LETTER', i % 4 === 0 ? 'REJECTED' : 'VERIFIED');
    fdrList.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
  }

  // 20 maturing within 90 days (but > 30)
  for (let i = 0; i < 20; i++) {
    const fdr = await createFdrEntry({
      institutionIdx: i % 40,
      bankIdx: (i + 3) % 12,
      issueDate: addMonths(daysFromToday(31 + i), 0),
      tenureMonths: 18,
      principal: BigInt((150 + i * 25) * 10000000),
      rate: 6.8,
      status: 'NEAR_MATURITY',
      purpose: purposes[i % 4],
      interestType: interestTypes[i % 2],
      academicYear: '2024-25',
      lienMarked: i % 3 === 0,
      overrideMaturityDate: daysFromToday(31 + i),
    });
    await createDocForFdr(fdr.id, fdr.institutionId, 'FDR_SCAN', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'BANK_CONFIRMATION', i % 2 === 0 ? 'PENDING' : 'VERIFIED');
    fdrList.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
  }

  // 10 overdue (MATURED, past maturity)
  const maturedFdrs: { id: string; status: string; institutionId: string; maturityAmount: bigint }[] = [];
  for (let i = 0; i < 10; i++) {
    const fdr = await createFdrEntry({
      institutionIdx: i + 5,
      bankIdx: i % 12,
      issueDate: daysFromToday(-730 - 30 - i * 10),
      tenureMonths: 24,
      principal: BigInt((300 + i * 50) * 10000000),
      rate: 7.5,
      status: 'MATURED',
      purpose: 'SECURITY_DEPOSIT',
      interestType: 'CUMULATIVE',
      academicYear: '2023-24',
      lienMarked: true,
      overrideMaturityDate: daysFromToday(-(30 + i * 10)),
    });
    await createDocForFdr(fdr.id, fdr.institutionId, 'FDR_SCAN', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'BANK_CONFIRMATION', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'LIEN_LETTER', 'VERIFIED');
    maturedFdrs.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
    fdrList.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
  }

  // 15 RENEWED chains
  for (let i = 0; i < 15; i++) {
    const parentMaturity = daysFromToday(-60 - i);
    const parent = await createFdrEntry({
      institutionIdx: i,
      bankIdx: i % 12,
      issueDate: daysFromToday(-60 - i - 1095),
      tenureMonths: 36,
      principal: BigInt((200 + i * 20) * 10000000),
      rate: 6.5,
      status: 'RENEWED',
      purpose: 'SECURITY_DEPOSIT',
      interestType: 'CUMULATIVE',
      academicYear: '2022-23',
      lienMarked: true,
      overrideMaturityDate: parentMaturity,
    });
    await createDocForFdr(parent.id, parent.institutionId, 'FDR_SCAN', 'VERIFIED');
    await createDocForFdr(parent.id, parent.institutionId, 'BANK_CONFIRMATION', 'VERIFIED');
    await createDocForFdr(parent.id, parent.institutionId, 'LIEN_LETTER', 'VERIFIED');

    const child = await createFdrEntry({
      institutionIdx: i,
      bankIdx: i % 12,
      issueDate: parentMaturity,
      tenureMonths: 24,
      principal: BigInt((200 + i * 20) * 10000000),
      rate: 7.0,
      status: 'ACTIVE',
      purpose: 'SECURITY_DEPOSIT',
      interestType: 'CUMULATIVE',
      academicYear: '2024-25',
      lienMarked: true,
      parentFdrId: parent.id,
    });
    await createDocForFdr(child.id, child.institutionId, 'FDR_SCAN', 'VERIFIED');
    await createDocForFdr(child.id, child.institutionId, 'BANK_CONFIRMATION', 'VERIFIED');
    await createDocForFdr(child.id, child.institutionId, 'LIEN_LETTER', 'VERIFIED');
    fdrList.push(
      { id: parent.id, status: parent.status, institutionId: parent.institutionId, maturityAmount: parent.maturityAmount },
      { id: child.id, status: child.status, institutionId: child.institutionId, maturityAmount: child.maturityAmount },
    );
  }

  // 10 RELEASED
  const releasedFdrs: { id: string; status: string; institutionId: string; maturityAmount: bigint }[] = [];
  for (let i = 0; i < 10; i++) {
    const fdr = await createFdrEntry({
      institutionIdx: i + 2,
      bankIdx: i % 12,
      issueDate: daysFromToday(-150 - i - 730),
      tenureMonths: 24,
      principal: BigInt((250 + i * 30) * 10000000),
      rate: 7.25,
      status: 'RELEASED',
      purpose: 'PERFORMANCE_GUARANTEE',
      interestType: 'CUMULATIVE',
      academicYear: '2023-24',
      lienMarked: false,
      overrideMaturityDate: daysFromToday(-120 - i),
    });
    await createDocForFdr(fdr.id, fdr.institutionId, 'FDR_SCAN', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'BANK_CONFIRMATION', 'VERIFIED');
    await createDocForFdr(fdr.id, fdr.institutionId, 'LIEN_LETTER', 'VERIFIED');
    releasedFdrs.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
    fdrList.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
  }

  // Fill to 120+: 30 ACTIVE FDRs
  for (let i = 0; i < 30; i++) {
    const fdr = await createFdrEntry({
      institutionIdx: i % 40,
      bankIdx: i % 12,
      issueDate: daysFromToday(-(365 - 90 - i * 3)),
      tenureMonths: 12,
      principal: BigInt((100 + i * 10) * 10000000),
      rate: 6.0 + (i % 5) * 0.25,
      status: 'ACTIVE',
      purpose: purposes[i % 4],
      interestType: interestTypes[i % 2],
      academicYear: '2025-26',
      lienMarked: i % 4 === 0,
    });
    fdrList.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
  }

  // 5 CLOSED
  for (let i = 0; i < 5; i++) {
    const fdr = await createFdrEntry({
      institutionIdx: i,
      bankIdx: i % 12,
      issueDate: daysFromToday(-565),
      tenureMonths: 12,
      principal: BigInt(10000000000),
      rate: 6.0,
      status: 'CLOSED',
      purpose: 'OTHER',
      interestType: 'CUMULATIVE',
      academicYear: '2023-24',
      lienMarked: false,
      overrideMaturityDate: daysFromToday(-200),
    });
    fdrList.push({ id: fdr.id, status: fdr.status, institutionId: fdr.institutionId, maturityAmount: fdr.maturityAmount });
  }

  console.log(`✅ Created ${fdrList.length} FDRs`);

  // Release requests (10 across workflow states)
  const rrStatuses = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'RELEASED', 'DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'RELEASED'];
  const fdrsForRelease = [...maturedFdrs.slice(0, 5), ...releasedFdrs.slice(0, 5)];

  for (let i = 0; i < 10; i++) {
    const fdrForRelease = fdrsForRelease[i];
    const status = rrStatuses[i];
    const fyStart = 2025;
    const refNum = `AICTE/FDR/REL/${fyStart}/${String(i + 1).padStart(6, '0')}`;

    const rrData: {
      fdrId: string;
      referenceNumber: string;
      status: string;
      prematureRelease: boolean;
      createdById: string;
      releaseDate?: Date;
      utr?: string;
      releasedAmount?: bigint;
      deductions: bigint;
    } = {
      fdrId: fdrForRelease.id,
      referenceNumber: refNum,
      status,
      prematureRelease: false,
      createdById: financeUser.id,
      deductions: BigInt(0),
    };

    if (status === 'RELEASED') {
      rrData.releaseDate = daysFromToday(-30 - i);
      rrData.utr = `UTR${20261026}${String(i).padStart(4, '0')}`;
      rrData.releasedAmount = fdrForRelease.maturityAmount;
    }

    const rr = await prisma.releaseRequest.create({ data: rrData });

    const stepActions: Record<string, string[]> = {
      DRAFT: ['CREATED'],
      SUBMITTED: ['CREATED', 'SUBMITTED'],
      VERIFIED: ['CREATED', 'SUBMITTED', 'VERIFIED'],
      APPROVED: ['CREATED', 'SUBMITTED', 'VERIFIED', 'APPROVED'],
      RELEASED: ['CREATED', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'RELEASED'],
    };

    for (const action of stepActions[status] || ['CREATED']) {
      await prisma.releaseStep.create({
        data: {
          releaseRequestId: rr.id,
          actorId: action === 'VERIFIED' ? verifierUser.id : action === 'APPROVED' ? authorityUser.id : financeUser.id,
          actorRole: action === 'VERIFIED' ? 'VERIFIER' : action === 'APPROVED' ? 'APPROVING_AUTHORITY' : 'FINANCE_OFFICER',
          action,
        },
      });
    }
  }
  console.log(`✅ Created 10 release requests`);

  // Audit logs
  await prisma.auditLog.createMany({
    data: [
      { userId: adminUser.id, action: 'LOGIN', entity: 'User', entityId: adminUser.id, ipAddress: '127.0.0.1' },
      {
        userId: financeUser.id,
        action: 'CREATE',
        entity: 'Fdr',
        entityId: fdrList[0]?.id,
        newValue: JSON.stringify({ fdrNumber: `FDR-000001` }),
        ipAddress: '127.0.0.1',
      },
      { userId: verifierUser.id, action: 'VERIFY', entity: 'Document', entityId: null, ipAddress: '127.0.0.1' },
      { userId: adminUser.id, action: 'CREATE', entity: 'Institution', entityId: institutions[0].id, ipAddress: '127.0.0.1' },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: financeUser.id,
        title: 'FDR Maturity Alert',
        body: `FDR FDR-000001 matures in 1 day.`,
        type: 'MATURITY_ALERT',
        isRead: false,
      },
      {
        userId: verifierUser.id,
        title: 'Document Pending',
        body: '3 documents pending verification for 2+ days.',
        type: 'DOCUMENT_PENDING',
        isRead: false,
      },
      {
        userId: instUser.id,
        title: 'Release Request Update',
        body: 'Your release request has been submitted.',
        type: 'RELEASE_STATUS',
        isRead: true,
      },
    ],
  });

  console.log('\n📊 Seed Summary:');
  console.log(`  Banks: ${banks.length}`);
  console.log(`  Institutions: ${institutions.length}`);
  console.log(`  Users: 6`);
  console.log(`  FDRs: ${fdrList.length}`);
  console.log(`  System Settings: 1`);
  console.log('\n✅ Seed completed successfully!');
  console.log('\n🔑 Demo Credentials (password: Demo@1234):');
  console.log('  admin@aicte.demo       → SUPER_ADMIN');
  console.log('  finance@aicte.demo     → FINANCE_OFFICER');
  console.log('  verifier@aicte.demo    → VERIFIER');
  console.log('  authority@aicte.demo   → APPROVING_AUTHORITY');
  console.log('  institution@aicte.demo → INSTITUTION_USER');
  console.log('  auditor@aicte.demo     → AUDITOR');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
