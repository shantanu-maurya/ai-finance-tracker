import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

import api, { getErrorMessage } from '../utils/api';
import PageHeader from '../components/PageHeader';
import SummaryCard from '../components/SummaryCard';
import ChartTooltip from '../components/ChartTooltip';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import TransactionTable from '../components/TransactionTable';

import { formatCurrency, formatCompactCurrency, monthNames } from '../utils/format';
import { seriesColors, chartInk, axisProps, gridProps } from '../utils/chartTheme';

const now = new Date();
const years = Array.from({ length: 6 }, (_, index) => now.getFullYear() - index);

export default function Reports() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get('/reports/monthly', { params: { year, month } });
      setReport(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the report'));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  /**
   * The PDF is generated and streamed by the server. It is fetched through the
   * same axios instance so the bearer token is attached, then handed to the
   * browser as a blob download.
   */
  const exportPdf = async () => {
    setExporting(true);
    setError(null);

    try {
      const { data } = await api.get('/reports/monthly', {
        params: { year, month, format: 'pdf' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-report-${year}-${String(month).padStart(2, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not export the PDF'));
    } finally {
      setExporting(false);
    }
  };

  const hasTransactions = (report?.transactions?.length || 0) > 0;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={report?.period?.label ? `Summary for ${report.period.label}` : 'Pick a month to summarise'}
      >
        <select
          value={month}
          onChange={(event) => setMonth(Number(event.target.value))}
          className="input w-auto"
          aria-label="Month"
        >
          {monthNames.map((name, index) => (
            <option key={name} value={index + 1}>{name}</option>
          ))}
        </select>

        <select
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="input w-auto"
          aria-label="Year"
        >
          {years.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting || loading || !hasTransactions}
          className="btn-primary"
        >
          {exporting ? 'Preparing…' : 'Export PDF'}
        </button>
      </PageHeader>

      {error && <Alert tone="error" className="mb-4" onDismiss={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Spinner label="Building the report" />
      ) : !report ? null : !hasTransactions ? (
        <EmptyState
          title={`No transactions in ${report.period.label}`}
          description="Pick a different month, or record entries for this period to generate a report."
          actionLabel="Add a transaction"
          actionTo="/transactions"
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Income"
              value={formatCurrency(report.summary.totalIncome)}
              footnote={report.period.label}
              accent={seriesColors.income}
            />
            <SummaryCard
              label="Expense"
              value={formatCurrency(report.summary.totalExpense)}
              footnote={`${report.summary.transactionCount} transactions`}
              accent={seriesColors.expense}
            />
            <SummaryCard
              label="Net savings"
              value={formatCurrency(report.summary.savings)}
              footnote={`${report.summary.savingsRate}% savings rate`}
              accent={seriesColors.savings}
              tone={report.summary.savings >= 0 ? 'positive' : 'negative'}
            />
            <SummaryCard
              label="Average expense"
              value={formatCurrency(report.summary.averageExpense)}
              footnote={
                report.summary.largestExpense
                  ? `Largest: ${report.summary.largestExpense.title}`
                  : 'No expenses this month'
              }
            />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-5">
            <div className="card xl:col-span-3">
              <h2 className="text-sm font-semibold text-ink">Spending by category</h2>
              <p className="mb-4 text-xs text-ink-muted">
                {report.period.label} — ranked highest to lowest
              </p>

              {report.categoryBreakdown.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-muted">No expenses in this period.</p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(200, report.categoryBreakdown.length * 42)}
                >
                  <BarChart
                    layout="vertical"
                    data={report.categoryBreakdown}
                    margin={{ top: 0, right: 64, left: 8, bottom: 0 }}
                    barCategoryGap={6}
                  >
                    <CartesianGrid {...gridProps} vertical horizontal={false} />
                    <XAxis type="number" tickFormatter={formatCompactCurrency} {...axisProps} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={110}
                      {...axisProps}
                      tick={{ ...axisProps.tick, fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                    {/* One series, so one hue and no legend - the heading names it. */}
                    <Bar
                      dataKey="amount"
                      name="Spent"
                      fill={seriesColors.income}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                    >
                      <LabelList
                        dataKey="amount"
                        position="right"
                        formatter={formatCompactCurrency}
                        style={{ fill: chartInk.secondary, fontSize: 11, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card xl:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-ink">Notes for this month</h2>

              <ul className="space-y-3">
                {report.insights.map((insight) => (
                  <li key={insight} className="flex gap-3 text-sm text-ink-secondary">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary-500"
                    />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card mt-4">
            <h2 className="mb-1 text-sm font-semibold text-ink">Transactions</h2>
            <p className="mb-4 text-xs text-ink-muted">
              Every entry in {report.period.label}. The PDF export includes the 40 most recent.
            </p>

            <TransactionTable transactions={report.transactions} readOnly />
          </section>
        </>
      )}
    </>
  );
}
