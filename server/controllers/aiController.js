import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import { generateAIInsights, predictExpense } from '../services/aiService.js';

/**
 * Thin orchestration only - fetch, delegate, respond. All AI logic lives in
 * aiService.js, so swapping providers never touches this file.
 */

// POST /api/ai/insights
export const generateInsights = async (req, res) => {
  try {
    const [transactions, budget] = await Promise.all([
      Transaction.find({ userId: req.userId }).sort({ transactionDate: -1 }),
      Budget.findOne({ userId: req.userId })
    ]);

    const result = await generateAIInsights({ transactions, budget });

    return res.status(200).json({
      success: true,
      provider: result.provider, // 'openai' | 'heuristic' - drives the UI badge
      insights: result.insights,
      recommendations: result.recommendations,
      summary: {
        totalIncome: result.summary.totalIncome,
        totalExpense: result.summary.totalExpense,
        savings: result.summary.savings,
        savingsRate: result.summary.savingsRate,
        topCategory: result.summary.topCategory,
        categoryBreakdown: result.summary.categoryBreakdown,
        predictedExpense: result.summary.predictedExpense,
        confidence: result.summary.confidence,
        budgetRisk: result.summary.budgetRisk,
        monthlyBudget: result.summary.monthlyBudget
      }
    });
  } catch (err) {
    console.error('generateInsights error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not generate insights' });
  }
};

// POST /api/ai/predict
export const getPrediction = async (req, res) => {
  try {
    const [transactions, budget] = await Promise.all([
      Transaction.find({ userId: req.userId }),
      Budget.findOne({ userId: req.userId })
    ]);

    const prediction = predictExpense({ transactions, budget });

    return res.status(200).json({ success: true, prediction });
  } catch (err) {
    console.error('getPrediction error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not generate prediction' });
  }
};
