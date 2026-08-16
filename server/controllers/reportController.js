import PDFDocument from 'pdfkit';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import { summarizeTransactions } from '../services/financeAnalyzer.js';

// PDFKit's built-in Helvetica has no glyph for the rupee sign, so the PDF
// branch spells out "INR". The JSON branch and the UI both use ₹.
const formatCurrency = (value) => `INR ${Math.round(value || 0).toLocaleString('en-IN')}`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Keeps the exported file small and fast to download. The full dataset is
// always available through the JSON response.
const PDF_TRANSACTION_LIMIT = 40;

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

// GET /api/reports/monthly?year=&month=&format=json|pdf
export const getMonthlyReport = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    // 1-12 from the client, converted to JS's 0-11 internally.
    const month = Number(req.query.month) || now.getMonth() + 1;

    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [transactions, budget] = await Promise.all([
      Transaction.find({
        userId: req.userId,
        // Exclusive upper bound: includes every day of the month, excludes
        // the 1st of the next one.
        transactionDate: { $gte: start, $lt: end }
      }).sort({ transactionDate: -1 }),
      Budget.findOne({ userId: req.userId })
    ]);

    const summary = summarizeTransactions(transactions, budget);
    const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;

    if (req.query.format === 'pdf') {
      return streamPdf({ res, summary, transactions, periodLabel, year, month });
    }

    return res.status(200).json({
      success: true,
      period: { year, month, label: periodLabel },
      summary: {
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        savings: summary.savings,
        savingsRate: summary.savingsRate,
        transactionCount: summary.transactionCount,
        averageExpense: summary.averageExpense,
        monthlyBudget: summary.monthlyBudget,
        topCategory: summary.topCategory,
        largestExpense: summary.largestExpense
      },
      categoryBreakdown: summary.categoryBreakdown,
      insights: summary.insights,
      transactions
    });
  } catch (err) {
    console.error('getMonthlyReport error:', err.message);
    if (res.headersSent) return res.end();
    return res.status(500).json({ success: false, message: 'Could not generate report' });
  }
};

/** Generates the PDF with PDFKit and pipes it straight into the response. */
const streamPdf = ({ res, summary, transactions, periodLabel, year, month }) => {
  const filename = `finance-report-${year}-${String(month).padStart(2, '0')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  // ---- Header ------------------------------------------------------------
  doc.fontSize(22).fillColor('#0f172a').text('Monthly Finance Report', { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(12).fillColor('#64748b').text(periodLabel);
  doc
    .fontSize(9)
    .fillColor('#94a3b8')
    .text(`Generated on ${formatDate(new Date())} - AI-Powered Finance Tracker`);

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(1);

  // ---- Summary block -----------------------------------------------------
  doc.fontSize(14).fillColor('#0f172a').text('Summary');
  doc.moveDown(0.5);

  const rows = [
    ['Total Income', formatCurrency(summary.totalIncome)],
    ['Total Expense', formatCurrency(summary.totalExpense)],
    ['Net Savings', formatCurrency(summary.savings)],
    ['Savings Rate', `${summary.savingsRate}%`],
    ['Monthly Budget', summary.monthlyBudget > 0 ? formatCurrency(summary.monthlyBudget) : 'Not set'],
    ['Transactions', String(summary.transactionCount)]
  ];

  doc.fontSize(11);
  rows.forEach(([label, value]) => {
    const y = doc.y;
    doc.fillColor('#475569').text(label, 60, y, { width: 200 });
    doc.fillColor('#0f172a').text(value, 260, y, { width: 240 });
    doc.moveDown(0.4);
  });

  doc.moveDown(1);

  // ---- Category breakdown ------------------------------------------------
  doc.fontSize(14).fillColor('#0f172a').text('Spending by Category');
  doc.moveDown(0.5);
  doc.fontSize(10);

  if (summary.categoryBreakdown.length === 0) {
    doc.fillColor('#94a3b8').text('No expenses recorded for this period.');
  } else {
    summary.categoryBreakdown.forEach((entry) => {
      const y = doc.y;
      doc.fillColor('#475569').text(entry.category, 60, y, { width: 200 });
      doc.fillColor('#0f172a').text(formatCurrency(entry.amount), 260, y, { width: 120 });
      doc.fillColor('#64748b').text(`${entry.percentage}%`, 390, y, { width: 100 });
      doc.moveDown(0.35);
    });
  }

  doc.moveDown(1);

  // ---- Insights ----------------------------------------------------------
  if (summary.insights?.length) {
    doc.fontSize(14).fillColor('#0f172a').text('Insights');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#475569');
    summary.insights.forEach((insight) => {
      // ₹ from the analyzer is swapped for INR so the glyph renders.
      doc.text(`- ${insight.replace(/₹/g, 'INR ')}`, { width: 480 });
      doc.moveDown(0.25);
    });
    doc.moveDown(1);
  }

  // ---- Transactions table ------------------------------------------------
  if (doc.y > 640) doc.addPage();

  doc.fontSize(14).fillColor('#0f172a').text('Transactions');
  doc.moveDown(0.5);

  if (transactions.length === 0) {
    doc.fontSize(10).fillColor('#94a3b8').text('No transactions in this period.');
  } else {
    const headerY = doc.y;
    doc.fontSize(9).fillColor('#64748b');
    doc.text('DATE', 55, headerY, { width: 75 });
    doc.text('TITLE', 130, headerY, { width: 160 });
    doc.text('CATEGORY', 290, headerY, { width: 105 });
    doc.text('TYPE', 395, headerY, { width: 55 });
    doc.text('AMOUNT', 450, headerY, { width: 90, align: 'right' });
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.4);

    transactions.slice(0, PDF_TRANSACTION_LIMIT).forEach((item) => {
      if (doc.y > 770) doc.addPage();

      const y = doc.y;
      doc.fontSize(9).fillColor('#475569');
      doc.text(formatDate(item.transactionDate), 55, y, { width: 75 });
      doc.text(String(item.title).slice(0, 34), 130, y, { width: 160 });
      doc.text(String(item.category).slice(0, 20), 290, y, { width: 105 });
      doc.fillColor(item.type === 'income' ? '#15803d' : '#b91c1c');
      doc.text(item.type, 395, y, { width: 55 });
      doc.text(formatCurrency(item.amount), 450, y, { width: 90, align: 'right' });
      doc.moveDown(0.35);
    });

    if (transactions.length > PDF_TRANSACTION_LIMIT) {
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .fillColor('#94a3b8')
        .text(
          `Showing the ${PDF_TRANSACTION_LIMIT} most recent of ${transactions.length} transactions. The full list is available in the app.`,
          55
        );
    }
  }

  doc.end();
  return undefined;
};
