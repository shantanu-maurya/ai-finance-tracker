/**
 * financeAnalyzer.js
 *
 * Pure analytics layer. No database calls, no I/O, no framework objects.
 * It takes an array of transactions plus an optional budget document and
 * returns every number the application displays.
 *
 * This is the single source of truth for analytics: dashboardController,
 * reportController, aiService and authController.getAccountStats all call
 * summarizeTransactions(), which is why the Dashboard, Reports, Insights
 * and Profile pages can never disagree with each other.
 */

const currency = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const percentOf = (part, whole) => (whole > 0 ? round2((part / whole) * 100) : 0);

/** `YYYY-MM` keys sort lexically in the same order as they sort chronologically. */
const monthKey = (value) => {
  const date = new Date(value || Date.now());
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}`;
};

/** Half-open month range: [start, end) - the exclusive upper bound keeps the
 *  1st of the next month out of the results. */
export const getMonthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const buildCategoryBreakdown = (expenses, totalExpense) => {
  const buckets = new Map();

  expenses.forEach((item) => {
    const category = (item.category || 'Uncategorised').trim() || 'Uncategorised';
    buckets.set(category, (buckets.get(category) || 0) + (Number(item.amount) || 0));
  });

  // Sorted descending so categoryBreakdown[0] is always the top spend
  // category - analyzeFinance() relies on that.
  return Array.from(buckets.entries())
    .map(([category, amount]) => ({
      category,
      amount: round2(amount),
      percentage: percentOf(amount, totalExpense)
    }))
    .sort((a, b) => b.amount - a.amount);
};

const emptySummary = (monthlyBudget) => ({
  totalIncome: 0,
  totalExpense: 0,
  savings: 0,
  savingsRate: 0,
  transactionCount: 0,
  incomeCount: 0,
  expenseCount: 0,
  averageExpense: 0,
  largestExpense: null,
  topCategory: null,
  categoryBreakdown: [],
  monthlyTrend: [],
  currentMonth: { month: monthKey(new Date()), income: 0, expense: 0, savings: 0, categoryBreakdown: [] },
  monthlyBudget,
  budgetRemaining: monthlyBudget,
  budgetUsedPercent: 0,
  categoryBudgets: [],
  predictedExpense: 0,
  confidence: 55,
  budgetRisk: false,
  insights: [
    'No transactions yet - add your first income entry to unlock the dashboard charts.',
    'Record expenses with a category so the breakdown and budget progress bars have data to work with.',
    'Set a monthly budget on the Budget page to switch on overspend alerts and the risk forecast.'
  ],
  recommendations: [
    'Start by logging this month\'s salary or primary income source.',
    'Add 5-10 recent expenses to make the spending forecast meaningful.',
    'Aim to keep essentials near 50% of income, wants near 30%, and savings near 20%.'
  ]
});

/**
 * The one function every analytics endpoint funnels through.
 *
 * @param {Array}  transactions - plain objects or Mongoose docs
 * @param {Object} budget       - Budget document, or null
 */
export const summarizeTransactions = (transactions = [], budget = null) => {
  const list = Array.isArray(transactions) ? transactions : [];
  const monthlyBudget = round2(budget?.monthlyBudget);
  const categoryBudgets = Array.isArray(budget?.categoryBudgets)
    ? budget.categoryBudgets.map((entry) => ({
        category: entry.category,
        limit: round2(entry.limit)
      }))
    : [];

  if (list.length === 0) {
    return { ...emptySummary(monthlyBudget), categoryBudgets };
  }

  const income = list.filter((item) => item.type === 'income');
  const expenses = list.filter((item) => item.type === 'expense');

  const sumAmounts = (items) =>
    round2(items.reduce((total, item) => total + (Number(item.amount) || 0), 0));

  const totalIncome = sumAmounts(income);
  const totalExpense = sumAmounts(expenses);
  const savings = round2(totalIncome - totalExpense);
  const savingsRate = percentOf(Math.max(savings, 0), totalIncome);

  const categoryBreakdown = buildCategoryBreakdown(expenses, totalExpense);

  // ---- Monthly trend -----------------------------------------------------
  const monthlyBuckets = new Map();

  list.forEach((item) => {
    const key = monthKey(item.transactionDate || item.createdAt);
    if (!monthlyBuckets.has(key)) {
      monthlyBuckets.set(key, { month: key, income: 0, expense: 0 });
    }
    const bucket = monthlyBuckets.get(key);
    const amount = Number(item.amount) || 0;
    if (item.type === 'income') bucket.income += amount;
    else bucket.expense += amount;
  });

  const monthlyTrend = Array.from(monthlyBuckets.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((bucket) => ({
      month: bucket.month,
      income: round2(bucket.income),
      expense: round2(bucket.expense),
      savings: round2(bucket.income - bucket.expense)
    }));

  // ---- Current month (what a *monthly* budget is actually measured against)
  const thisMonthKey = monthKey(new Date());
  const thisMonthExpenses = expenses.filter(
    (item) => monthKey(item.transactionDate || item.createdAt) === thisMonthKey
  );
  const thisMonthIncome = income.filter(
    (item) => monthKey(item.transactionDate || item.createdAt) === thisMonthKey
  );
  const currentMonthExpense = sumAmounts(thisMonthExpenses);
  const currentMonthIncome = sumAmounts(thisMonthIncome);

  const currentMonth = {
    month: thisMonthKey,
    income: currentMonthIncome,
    expense: currentMonthExpense,
    savings: round2(currentMonthIncome - currentMonthExpense),
    categoryBreakdown: buildCategoryBreakdown(thisMonthExpenses, currentMonthExpense)
  };

  const budgetRemaining = round2(monthlyBudget - currentMonthExpense);
  const budgetUsedPercent = percentOf(currentMonthExpense, monthlyBudget);

  // ---- Prediction --------------------------------------------------------
  // Mean of the monthly expense buckets. One month of data => that month's
  // total; several months => short-term volatility gets smoothed out.
  const expenseBuckets = monthlyTrend.filter((bucket) => bucket.expense > 0);
  const predictedExpense = expenseBuckets.length
    ? round2(
        expenseBuckets.reduce((total, bucket) => total + bucket.expense, 0) /
          expenseBuckets.length
      )
    : 0;

  // More recorded expenses => more confidence, clamped to a 55-95 band so the
  // number never reads as certainty.
  const confidence = Math.min(95, Math.max(55, 60 + expenses.length * 3));
  const budgetRisk = monthlyBudget > 0 && predictedExpense > monthlyBudget;

  const averageExpense = expenses.length ? round2(totalExpense / expenses.length) : 0;
  const largestExpense = expenses.reduce(
    (top, item) => ((Number(item.amount) || 0) > (Number(top?.amount) || 0) ? item : top),
    null
  );

  const summary = {
    totalIncome,
    totalExpense,
    savings,
    savingsRate,
    transactionCount: list.length,
    incomeCount: income.length,
    expenseCount: expenses.length,
    averageExpense,
    largestExpense: largestExpense
      ? {
          title: largestExpense.title,
          category: largestExpense.category,
          amount: round2(largestExpense.amount),
          transactionDate: largestExpense.transactionDate
        }
      : null,
    topCategory: categoryBreakdown[0] || null,
    categoryBreakdown,
    monthlyTrend,
    currentMonth,
    monthlyBudget,
    budgetRemaining,
    budgetUsedPercent,
    categoryBudgets,
    predictedExpense,
    confidence,
    budgetRisk
  };

  return {
    ...summary,
    insights: buildInsights(summary),
    recommendations: buildRecommendations(summary)
  };
};

/** Rule-based insights. These are the deterministic safety net behind the AI. */
const buildInsights = (summary) => {
  const {
    totalIncome,
    totalExpense,
    savings,
    savingsRate,
    topCategory,
    monthlyTrend,
    monthlyBudget,
    budgetRemaining,
    budgetUsedPercent,
    predictedExpense,
    currentMonth,
    averageExpense
  } = summary;

  const insights = [];

  if (topCategory) {
    insights.push(
      `${topCategory.category} is your largest expense category at ${currency(
        topCategory.amount
      )} (${topCategory.percentage}% of total spending).`
    );
  }

  if (totalIncome > 0) {
    insights.push(
      savings >= 0
        ? `You have saved ${currency(savings)} overall, a savings rate of ${savingsRate}% on ${currency(
            totalIncome
          )} of income.`
        : `You are spending ${currency(Math.abs(savings))} more than you earn - expenses total ${currency(
            totalExpense
          )} against ${currency(totalIncome)} of income.`
    );
  } else if (totalExpense > 0) {
    insights.push(
      `You have logged ${currency(totalExpense)} in expenses but no income yet - add income entries for an accurate savings picture.`
    );
  }

  if (monthlyBudget > 0) {
    insights.push(
      budgetRemaining >= 0
        ? `This month you have used ${budgetUsedPercent}% of your ${currency(
            monthlyBudget
          )} budget, leaving ${currency(budgetRemaining)}.`
        : `You are ${currency(Math.abs(budgetRemaining))} over your ${currency(
            monthlyBudget
          )} monthly budget - ${budgetUsedPercent}% used.`
    );
  } else {
    insights.push('No monthly budget is set yet, so overspend alerts and budget risk are switched off.');
  }

  if (monthlyTrend.length >= 2) {
    const previous = monthlyTrend[monthlyTrend.length - 2];
    const latest = monthlyTrend[monthlyTrend.length - 1];
    const delta = round2(latest.expense - previous.expense);
    const direction = delta > 0 ? 'up' : 'down';

    if (Math.abs(delta) > 0) {
      insights.push(
        `Spending is ${direction} ${currency(Math.abs(delta))} versus ${previous.month} (${currency(
          previous.expense
        )} to ${currency(latest.expense)}).`
      );
    } else {
      insights.push(`Spending held steady at ${currency(latest.expense)} across the last two months.`);
    }
  }

  if (predictedExpense > 0) {
    insights.push(
      `Based on your monthly averages, next month's expense is projected at about ${currency(predictedExpense)}.`
    );
  }

  if (averageExpense > 0) {
    insights.push(
      `Your average transaction size is ${currency(averageExpense)}, and ${currency(
        currentMonth.expense
      )} has gone out this month so far.`
    );
  }

  return insights;
};

/** Actionable next steps that pair with the insights above. */
const buildRecommendations = (summary) => {
  const {
    topCategory,
    savingsRate,
    monthlyBudget,
    budgetRisk,
    predictedExpense,
    categoryBudgets,
    categoryBreakdown,
    savings
  } = summary;

  const recommendations = [];

  if (topCategory && topCategory.percentage > 35) {
    recommendations.push(
      `${topCategory.category} takes ${topCategory.percentage}% of your spending. Trimming it by 10% would free up about ${currency(
        topCategory.amount * 0.1
      )}.`
    );
  }

  if (monthlyBudget === 0) {
    recommendations.push('Set a monthly budget so the app can warn you before you overspend rather than after.');
  } else if (budgetRisk) {
    recommendations.push(
      `Your projected spend of ${currency(predictedExpense)} exceeds your ${currency(
        monthlyBudget
      )} budget. Cut roughly ${currency(predictedExpense - monthlyBudget)} to stay inside it.`
    );
  }

  if (savings < 0) {
    recommendations.push('You are running a deficit. Pause discretionary categories until income covers expenses again.');
  } else if (savingsRate < 20) {
    recommendations.push(
      `Your savings rate is ${savingsRate}%. Automating a transfer on payday is the simplest way to push it toward 20%.`
    );
  } else {
    recommendations.push(
      `A ${savingsRate}% savings rate is healthy - consider moving the surplus into an emergency fund or index investment.`
    );
  }

  const uncapped = categoryBreakdown
    .slice(0, 3)
    .filter((entry) => !categoryBudgets.some((limit) => limit.category === entry.category));

  if (uncapped.length > 0) {
    recommendations.push(
      `Add category limits for ${uncapped.map((entry) => entry.category).join(', ')} to get per-category progress bars.`
    );
  }

  return recommendations;
};

/**
 * Thin wrapper used by aiService.js. Keeps the AI layer decoupled from the
 * `(transactions, budget)` positional signature.
 */
export const analyzeFinance = ({ transactions = [], budget = null } = {}) =>
  summarizeTransactions(transactions, budget);

export default { summarizeTransactions, analyzeFinance, getMonthRange };
