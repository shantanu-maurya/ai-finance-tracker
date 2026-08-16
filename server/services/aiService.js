/**
 * aiService.js
 *
 * Wraps the OpenAI SDK around the deterministic analyzer.
 *
 * Design rules this file enforces:
 *   1. analyzeFinance() always runs first, so a heuristic answer exists
 *      before any network call is attempted.
 *   2. Only aggregate summary numbers are sent to OpenAI - never raw
 *      transactions. The request stays short, cheap, and free of individual
 *      entries.
 *   3. Every failure path (no key, network error, rate limit, bad JSON)
 *      silently falls back to the heuristic insights. The Insights feature
 *      must never break the app.
 *   4. The OpenAI client is constructed per-request, not at module load, so
 *      the server still boots without a key.
 */

import OpenAI from 'openai';
import { analyzeFinance } from './financeAnalyzer.js';

const PLACEHOLDER_KEYS = new Set([
  'your_openai_api_key_here',
  'sk-your_openai_api_key_here',
  'sk-xxx',
  'changeme'
]);

const hasOpenAIKey = () => {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  return Boolean(key) && !PLACEHOLDER_KEYS.has(key);
};

/** Builds the prompt from summary numbers only - no transaction rows. */
const buildPrompt = (analysis) => {
  const topCategories = analysis.categoryBreakdown
    .slice(0, 5)
    .map((entry) => `${entry.category}: ₹${entry.amount} (${entry.percentage}%)`)
    .join(', ') || 'none recorded';

  const trend = analysis.monthlyTrend
    .slice(-6)
    .map((bucket) => `${bucket.month} income ₹${bucket.income} / expense ₹${bucket.expense}`)
    .join('; ') || 'no monthly history';

  return [
    'Here is a summary of one user\'s personal finances (amounts in INR).',
    `Total income: ₹${analysis.totalIncome}`,
    `Total expense: ₹${analysis.totalExpense}`,
    `Net savings: ₹${analysis.savings} (savings rate ${analysis.savingsRate}%)`,
    `Monthly budget: ₹${analysis.monthlyBudget || 'not set'}`,
    `Spent this month: ₹${analysis.currentMonth.expense} (${analysis.budgetUsedPercent}% of budget)`,
    `Projected next-month expense: ₹${analysis.predictedExpense}`,
    `Top spending categories: ${topCategories}`,
    `Recent monthly trend: ${trend}`,
    `Transactions recorded: ${analysis.transactionCount}`,
    '',
    'Write 4 to 6 short, specific, actionable insights for this person.',
    'Reference the actual numbers. Do not invent data that is not listed above.',
    'Return only a JSON array of strings.'
  ].join('\n');
};

/**
 * Extracts a string array from a model response, tolerating markdown fences
 * or a stray sentence around the JSON.
 */
const parseInsightArray = (raw) => {
  if (!raw) return [];

  const cleaned = String(raw)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
};

/**
 * @returns {{ provider: 'openai'|'heuristic', insights: string[], recommendations: string[], summary: object }}
 */
export const generateAIInsights = async ({ transactions = [], budget = null } = {}) => {
  const analysis = analyzeFinance({ transactions, budget });

  const heuristicResult = {
    provider: 'heuristic',
    insights: analysis.insights,
    recommendations: analysis.recommendations,
    summary: analysis
  };

  if (!hasOpenAIKey()) return heuristicResult;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise personal finance analyst. You reply with only a JSON array of strings - no prose, no markdown, no keys.'
        },
        { role: 'user', content: buildPrompt(analysis) }
      ]
    });

    const insights = parseInsightArray(completion.choices?.[0]?.message?.content);

    // An empty parse is treated as a failure so the user still gets content.
    if (insights.length === 0) return heuristicResult;

    return {
      provider: 'openai',
      insights,
      recommendations: analysis.recommendations,
      summary: analysis
    };
  } catch (err) {
    // Network error, invalid key, rate limit, malformed JSON - all land here.
    // Logged for the developer, invisible to the user.
    console.warn('[aiService] OpenAI call failed, using heuristic insights:', err.message);
    return heuristicResult;
  }
};

/**
 * Prediction is entirely local - no external call, no API key required.
 */
export const predictExpense = ({ transactions = [], budget = null } = {}) => {
  const analysis = analyzeFinance({ transactions, budget });

  return {
    predictedExpense: analysis.predictedExpense,
    confidence: analysis.confidence,
    budgetRisk: analysis.budgetRisk,
    monthlyBudget: analysis.monthlyBudget,
    currentMonthExpense: analysis.currentMonth.expense,
    monthlyTrend: analysis.monthlyTrend,
    basis: `Mean of ${analysis.monthlyTrend.filter((bucket) => bucket.expense > 0).length} monthly expense bucket(s)`
  };
};

export default { generateAIInsights, predictExpense };
