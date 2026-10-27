import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { prisma } from '../prisma';
import { AccessTokenPayload } from '../utils/crypto';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { parsePagination } from '../utils/pagination';
import { paginationMeta } from '../utils/response';

const router = Router();
router.use(authenticate);

function paiseToRupees(paise: bigint | null | undefined): number {
  return Number(paise || 0) / 100;
}

function buildFdrWhere(query: Record<string, unknown>, actor: AccessTokenPayload) {
  const where: any = { deletedAt: null };
  if (actor.role === 'INSTITUTION_USER') {
    where.institutionId = actor.institutionId;
  } else if (query.institutionId) {
    where.institutionId = String(query.institutionId);
  }
  if (query.bankId) where.bankId = String(query.bankId);
  if (query.state) where.institution = { state: String(query.state) };
  if (query.status) where.status = String(query.status);
  if (query.dateFrom || query.dateTo) {
    where.maturityDate = {};
    if (query.dateFrom) where.maturityDate.gte = new Date(String(query.dateFrom));
    if (query.dateTo) where.maturityDate.lte = new Date(String(query.dateTo));
  }
  return where;
}

async function sendXlsx(res: Response, workbook: ExcelJS.Workbook, filename: string) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

function sendCsv(res: Response, rows: string[][], headers: string[], filename: string) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const csvContent = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  res.send(csvContent);
}

// GET /reports/maturity
router.get('/maturity', async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const where = buildFdrWhere(req.query as Record<string, unknown>, req.user!);
    const [fdrs, total] = await Promise.all([
      prisma.fdr.findMany({
        where,
        skip,
        take,
        orderBy: { maturityDate: 'asc' },
        include: {
          institution: { select: { id: true, name: true, state: true } },
          bank: { select: { id: true, name: true } },
        },
      }),
      prisma.fdr.count({ where }),
    ]);
    const data = fdrs.map(f => ({
      ...f,
      principal: f.principal.toString(),
      maturityAmount: f.maturityAmount.toString(),
      quarterlyPayout: f.quarterlyPayout.toString(),
    }));
    sendSuccess(res, data, undefined, paginationMeta(total, page, pageSize));
  } catch (err) { next(err); }
});

// GET /reports/bank-wise
router.get('/bank-wise', async (req, res, next) => {
  try {
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};
    const data = await prisma.fdr.groupBy({
      by: ['bankId'],
      where: { deletedAt: null, ...institutionFilter },
      _count: { bankId: true },
      _sum: { principal: true, maturityAmount: true },
    });
    const banks = await prisma.bank.findMany({ select: { id: true, name: true, shortCode: true } });
    const bankMap = new Map(banks.map(b => [b.id, b]));
    sendSuccess(res, data.map(d => ({
      bank: bankMap.get(d.bankId),
      count: d._count.bankId,
      totalPrincipal: (d._sum.principal || BigInt(0)).toString(),
      totalMaturityAmount: (d._sum.maturityAmount || BigInt(0)).toString(),
    })));
  } catch (err) { next(err); }
});

// GET /reports/institution-ledger
router.get('/institution-ledger', async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER' ? { id: actor.institutionId } : {};
    const stateFilter = req.query.state ? { state: String(req.query.state) } : {};
    const [institutions, total] = await Promise.all([
      prisma.institution.findMany({
        where: { deletedAt: null, ...institutionFilter, ...stateFilter },
        skip,
        take,
        include: {
          _count: { select: { fdrs: { where: { deletedAt: null } } } },
          fdrs: {
            where: { deletedAt: null },
            select: { status: true, principal: true, maturityAmount: true },
          },
        },
      }),
      prisma.institution.count({ where: { deletedAt: null, ...institutionFilter, ...stateFilter } }),
    ]);
    const data = institutions.map(inst => ({
      id: inst.id,
      name: inst.name,
      aicteId: inst.aicteId,
      state: inst.state,
      type: inst.type,
      totalFdrs: inst._count.fdrs,
      totalPrincipal: inst.fdrs.reduce((acc, f) => acc + f.principal, BigInt(0)).toString(),
      totalMaturityAmount: inst.fdrs.reduce((acc, f) => acc + f.maturityAmount, BigInt(0)).toString(),
      statusBreakdown: ['ACTIVE', 'NEAR_MATURITY', 'MATURED', 'RENEWED', 'RELEASED'].reduce((acc, s) => {
        acc[s] = inst.fdrs.filter(f => f.status === s).length;
        return acc;
      }, {} as Record<string, number>),
    }));
    sendSuccess(res, data, undefined, paginationMeta(total, page, pageSize));
  } catch (err) { next(err); }
});

// GET /reports/release-register
router.get('/release-register', async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const actor = req.user!;
    const institutionFilter = actor.role === 'INSTITUTION_USER'
      ? { fdr: { institutionId: actor.institutionId } }
      : {};
    const where: Record<string, unknown> = {
      status: 'RELEASED',
      ...institutionFilter,
      ...(req.query.dateFrom && { releaseDate: { gte: new Date(String(req.query.dateFrom)) } }),
      ...(req.query.dateTo && { releaseDate: { lte: new Date(String(req.query.dateTo)) } }),
    };
    const [releases, total] = await Promise.all([
      prisma.releaseRequest.findMany({
        where,
        skip,
        take,
        orderBy: { releaseDate: 'desc' },
        include: {
          fdr: {
            select: {
              fdrNumber: true,
              institution: { select: { name: true, aicteId: true } },
              bank: { select: { name: true } },
              principal: true,
              maturityAmount: true,
            },
          },
        },
      }),
      prisma.releaseRequest.count({ where }),
    ]);
    const data = releases.map(r => ({
      ...r,
      releasedAmount: r.releasedAmount?.toString(),
      deductions: r.deductions.toString(),
      fdr: {
        ...r.fdr,
        principal: r.fdr.principal.toString(),
        maturityAmount: r.fdr.maturityAmount.toString(),
      },
    }));
    sendSuccess(res, data, undefined, paginationMeta(total, page, pageSize));
  } catch (err) { next(err); }
});

// GET /reports/audit
router.get('/audit', async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const where = {
      ...(req.query.entity && { entity: String(req.query.entity) }),
      ...(req.query.action && { action: String(req.query.action) }),
      ...(req.query.dateFrom && { createdAt: { gte: new Date(String(req.query.dateFrom)) } }),
      ...(req.query.dateTo && { createdAt: { lte: new Date(String(req.query.dateTo)) } }),
    };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    sendSuccess(res, logs, undefined, paginationMeta(total, page, pageSize));
  } catch (err) { next(err); }
});

// GET /reports/:type/export
router.get('/:type/export', async (req, res, next) => {
  try {
    const { type } = req.params;
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const actor = req.user!;

    let rows: string[][] = [];
    let headers: string[] = [];
    let title = 'AICTE FDR Vault Report';

    if (type === 'maturity') {
      headers = ['FDR Number', 'Institution', 'Bank', 'Principal (₹)', 'Maturity Amount (₹)', 'Maturity Date', 'Status'];
      title = 'Maturity Report';
      const fdrs = await prisma.fdr.findMany({
        where: buildFdrWhere(req.query as Record<string, unknown>, actor),
        orderBy: { maturityDate: 'asc' },
        include: {
          institution: { select: { name: true } },
          bank: { select: { name: true } },
        },
      });
      rows = fdrs.map(f => [
        f.fdrNumber,
        f.institution.name,
        f.bank.name,
        paiseToRupees(f.principal).toFixed(2),
        paiseToRupees(f.maturityAmount).toFixed(2),
        f.maturityDate.toLocaleDateString('en-IN'),
        f.status,
      ]);
    } else if (type === 'release-register') {
      headers = ['Reference', 'FDR Number', 'Institution', 'Bank', 'Released Amount (₹)', 'Deductions (₹)', 'Release Date', 'UTR'];
      title = 'Release Register';
      const releases = await prisma.releaseRequest.findMany({
        where: { status: 'RELEASED' },
        orderBy: { releaseDate: 'desc' },
        include: {
          fdr: {
            include: {
              institution: { select: { name: true } },
              bank: { select: { name: true } },
            },
          },
        },
      });
      rows = releases.map(r => [
        r.referenceNumber,
        r.fdr.fdrNumber,
        r.fdr.institution.name,
        r.fdr.bank.name,
        paiseToRupees(r.releasedAmount).toFixed(2),
        paiseToRupees(r.deductions).toFixed(2),
        r.releaseDate?.toLocaleDateString('en-IN') || '',
        r.utr || '',
      ]);
    } else if (type === 'bank-wise') {
      headers = ['Bank', 'Code', 'FDR Count', 'Total Principal (₹)', 'Total Maturity Amount (₹)'];
      title = 'Bank-wise Report';
      const institutionFilter = actor.role === 'INSTITUTION_USER' ? { institutionId: actor.institutionId } : {};
      const data = await prisma.fdr.groupBy({
        by: ['bankId'],
        where: { deletedAt: null, ...institutionFilter },
        _count: { bankId: true },
        _sum: { principal: true, maturityAmount: true },
      });
      const banks = await prisma.bank.findMany({ select: { id: true, name: true, shortCode: true } });
      const bankMap = new Map(banks.map(b => [b.id, b]));
      rows = data.map(d => {
        const bank = bankMap.get(d.bankId);
        return [
          bank?.name || '',
          bank?.shortCode || '',
          String(d._count.bankId),
          paiseToRupees(d._sum.principal).toFixed(2),
          paiseToRupees(d._sum.maturityAmount).toFixed(2),
        ];
      });
    } else if (type === 'institution-ledger') {
      headers = ['AICTE ID', 'Institution', 'State', 'Type', 'Total FDRs', 'Total Principal (₹)', 'Total Maturity (₹)'];
      title = 'Institution Ledger';
      const institutionFilter = actor.role === 'INSTITUTION_USER' ? { id: actor.institutionId } : {};
      const institutions = await prisma.institution.findMany({
        where: { deletedAt: null, ...institutionFilter },
        include: {
          fdrs: { where: { deletedAt: null }, select: { principal: true, maturityAmount: true } },
        },
      });
      rows = institutions.map(inst => [
        inst.aicteId,
        inst.name,
        inst.state,
        inst.type,
        String(inst.fdrs.length),
        inst.fdrs.reduce((acc, f) => acc + paiseToRupees(f.principal), 0).toFixed(2),
        inst.fdrs.reduce((acc, f) => acc + paiseToRupees(f.maturityAmount), 0).toFixed(2),
      ]);
    } else {
      headers = ['Info'];
      rows = [['No export available for this report type']];
    }

    if (rows.length === 0) {
      rows = [['No data available']];
    }

    if (format === 'csv') {
      sendCsv(res, rows, headers, `${type}-report.csv`);
      return;
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
      const doc = new PDFDocument({ margin: 40 });
      doc.pipe(res);
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').text(headers.join(' | '));
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.font('Helvetica').fontSize(9);
      rows.forEach(row => { doc.text(row.join(' | ')); });
      doc.moveDown();
      doc.fontSize(8).text(`Total records: ${rows.length}`, { align: 'right' });
      doc.end();
      return;
    }

    // Default: XLSX
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AICTE FDR Vault';
    const sheet = workbook.addWorksheet(title);
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    rows.forEach(row => sheet.addRow(row));
    sheet.columns.forEach(col => { col.width = 20; });
    await sendXlsx(res, workbook, `${type}-report.xlsx`);
  } catch (err) { next(err); }
});

export default router;
