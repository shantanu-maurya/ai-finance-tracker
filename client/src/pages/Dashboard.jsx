import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  LabelList,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

import { fetchDashboard } from '../slices/insightsSlice';
import PageHeader from '../components/PageHeader';
import SummaryCard from '../components/SummaryCard';
import ChartTooltip from '../components/ChartTooltip';
import ChartLegend from '../components/ChartLegend';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';

import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatMonthKey
} from '../utils/format';
import { categorical, seriesColors, chartInk, axisProps, gridProps, foldToOther } from '../utils/chartTheme';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { summary, monthlyTrend, categoryBreakdown, recentTransactions, dashboardLoading, dashboardError } =
    useSelector((state) => state.insights);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  if (dashboardLoading && !summary) return <Spinner label="Loading your dashboard" />;
  if (dashboardError) return <Alert tone="error" title="Could not load the dashboard">{dashboardError}</Alert>;
  if (!summary) return null;

  const hasData = summary.transactionCount > 0;

  // Top 6 categories keep their fixed slot colors; the long tail folds into
  // a single "Other" slice rather than spawning new hues.
  const pieData = foldToOther(categoryBreakdown, 6);

  const incomeVsExpense = [
    { name: 'Income', value: summary.totalIncome, fill: seriesColors.income },
    { name: 'Expense', value: summary.totalExpense, fill: seriesColors.expense }
  ];

  const trendLegend = [
    { label: 'Income', color: seriesColors.income },
    { label: 'Expense', color: seriesColors.expense }
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'} recorded`}
      >
        <Link to="/transactions" className="btn-primary">Add transaction</Link>
      </PageHeader>

      {!hasData && (
        <EmptyState
          title="No transactions yet"
          description="Add your first income and a few expenses to switch on the charts, budget tracking, and the spending forecast."
          actionLabel="Add your first transaction"
          actionTo="/transactions"
        />
      )}

      {hasData && (
        <>
          {/* ---- Summary tiles ------------------------------------------ */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total income"
              value={formatCurrency(summary.totalIncome)}
              footnote="All recorded income"
              accent={seriesColors.income}
            />
            <SummaryCard
              label="Total expense"
              value={formatCurrency(summary.totalExpense)}
              footnote={summary.topCategory ? `Top: ${summary.topCategory.category}` : 'All recorded expenses'}
              accent={seriesColors.expense}
            />
            <SummaryCard
              label="Net savings"
              value={formatCurrency(summary.savings)}
              footnote={`${summary.savingsRate}% savings rate`}
              accent={seriesColors.savings}
              tone={summary.savings >= 0 ? 'positive' : 'negative'}
            />
            <SummaryCard
              label="Budget remaining"
              value={summary.monthlyBudget > 0 ? formatCurrency(summary.budgetRemaining) : 'Not set'}
              footnote={
                summary.monthlyBudget > 0
                  ? `${summary.budgetUsedPercent}% of ${formatCurrency(summary.monthlyBudget)} used this month`
                  : 'Set a budget to enable alerts'
              }
              tone={summary.monthlyBudget > 0 && summary.budgetRemaining < 0 ? 'negative' : 'default'}
            />
          </section>

          {summary.budgetRisk && (
            <Alert tone="warning" className="mt-4" title="Projected to exceed your budget">
              At your current pace next month lands near {formatCurrency(summary.predictedExpense)}, above your{' '}
              {formatCurrency(summary.monthlyBudget)} budget ({summary.confidence}% confidence).
            </Alert>
          )}

          {/* ---- Trend + distribution ----------------------------------- */}
          <section className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="card xl:col-span-2">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Monthly trend</h2>
                  <p className="text-xs text-ink-muted">Income against expense, month by month</p>
                </div>
                <ChartLegend items={trendLegend} />
              </div>

              {monthlyTrend.length < 2 ? (
                <p className="py-12 text-center text-sm text-ink-muted">
                  A trend line needs at least two months of transactions.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="month" tickFormatter={formatMonthKey} {...axisProps} />
                    <YAxis tickFormatter={formatCompactCurrency} width={64} {...axisProps} />
                    <Tooltip
                      content={<ChartTooltip labelFormatter={formatMonthKey} />}
                      cursor={{ stroke: chartInk.axis, strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke={seriesColors.income}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: chartInk.surface }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Expense"
                      stroke={seriesColors.expense}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: chartInk.surface }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-ink">Where money goes</h2>
              <p className="text-xs text-ink-muted">Share of total expenses by category</p>

              {pieData.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-muted">No expenses recorded yet.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={2}
                        stroke={chartInk.surface}
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.category} fill={categorical[index % categorical.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Doubles as the table view - three of the palette slots sit
                      below 3:1 on a light surface, so the values are always
                      readable in text, not only in the wedge. */}
                  <ul className="mt-3 space-y-1.5">
                    {pieData.map((entry, index) => (
                      <li key={entry.category} className="flex items-center gap-2 text-xs">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 flex-none rounded-sm"
                          style={{ backgroundColor: categorical[index % categorical.length] }}
                        />
                        <span className="truncate text-ink-secondary">{entry.category}</span>
                        <span className="tabular ml-auto flex-none font-medium text-ink">
                          {formatCurrency(entry.amount)}
                        </span>
                        <span className="tabular w-10 flex-none text-right text-ink-muted">
                          {entry.percentage}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>

          {/* ---- Income vs expense + recent activity --------------------- */}
          <section className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="card">
              <h2 className="text-sm font-semibold text-ink">Income vs expense</h2>
              <p className="text-xs text-ink-muted">All-time totals</p>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={incomeVsExpense} margin={{ top: 24, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis tickFormatter={formatCompactCurrency} width={64} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                  <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]} maxBarSize={72}>
                    {incomeVsExpense.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                    {/* Direct labels: only two bars, so every one is labeled. */}
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={formatCompactCurrency}
                      style={{ fill: chartInk.secondary, fontSize: 12, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <ChartLegend className="mt-2" items={trendLegend} />
            </div>

            <div className="card xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
                  <p className="text-xs text-ink-muted">Your five latest entries</p>
                </div>
                <Link to="/transactions" className="text-xs font-medium text-primary-600 hover:underline">
                  View all
                </Link>
              </div>

              <ul className="divide-y divide-hairline/60">
                {recentTransactions.map((transaction) => (
                  <li key={transaction._id} className="flex items-center gap-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 flex-none rounded-full"
                      style={{
                        backgroundColor:
                          transaction.type === 'income' ? seriesColors.income : seriesColors.expense
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{transaction.title}</p>
                      <p className="text-xs text-ink-muted">
                        {transaction.category} · {formatDate(transaction.transactionDate)}
                      </p>
                    </div>
                    <span
                      className={`tabular flex-none text-sm font-semibold ${
                        transaction.type === 'income' ? 'text-good' : 'text-ink'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '−'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </>
  );
}
