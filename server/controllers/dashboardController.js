import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import { summarizeTransactions } from '../services/financeAnalyzer.js';

// GET /api/dashboard/summary
export const getDashboardSummary = async (req, res) => {
  try {
    // Sorted descending here so the "recent transactions" list is just a
    // slice of this array - no second query needed.
    const [transactions, budget] = await Promise.all([
      Transaction.find({ userId: req.userId }).sort({ transactionDate: -1 }),
      Budget.findOne({ userId: req.userId })
    ]);

    const summary = summarizeTransactions(transactions, budget);

    return res.status(200).json({
      success: true,
      summary: {
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        savings: summary.savings,
        savingsRate: summary.savingsRate,
        transactionCount: summary.transactionCount,
        averageExpense: summary.averageExpense,
        monthlyBudget: summary.monthlyBudget,
        budgetRemaining: summary.budgetRemaining,
        budgetUsedPercent: summary.budgetUsedPercent,
        categoryBudgets: summary.categoryBudgets,
        currentMonth: summary.currentMonth,
        predictedExpense: summary.predictedExpense,
        confidence: summary.confidence,
        budgetRisk: summary.budgetRisk,
        topCategory: summary.topCategory,
        largestExpense: summary.largestExpense,
        insights: summary.insights
      },
      monthlyTrend: summary.monthlyTrend,
      categoryBreakdown: summary.categoryBreakdown,
      recentTransactions: transactions.slice(0, 5)
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load dashboard' });
  }
};
