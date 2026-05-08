import { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  type AnalyticsOverview,
  apiRequest,
  type CsvImportResponse,
  type TradeImport,
} from '../lib/api';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../components/ui/chart';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  LogOut,
  MessageCircle,
  Send,
  Upload,
  X,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type AnalyticsFilters = {
  monthFrom: string;
  monthTo: string;
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function formatMoney(value: number) {
  return money.format(value);
}

function pnlClass(value: number) {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-rose-400';
  return 'text-muted-foreground';
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

function getMonthLabel(value: string): string {
  return new Date(`${value}-01T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function addMonths(value: string, amount: number): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return monthKey(date);
}

function buildCalendarCells(
  days: AnalyticsOverview['calendar'],
  visibleMonth: string,
) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const anchor = new Date(`${visibleMonth}-01T00:00:00.000Z`);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      date,
      inMonth: date.getUTCMonth() === month,
      tradeDay: byDate.get(key),
    };
  });
}

function Dashboard({
  overview,
  filters,
  onFiltersChange,
  onClearFilters,
}: {
  overview: AnalyticsOverview | null;
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onClearFilters: () => void;
}) {
  const empty = !overview || overview.overall.count === 0;
  const latestCalendarMonth =
    overview?.filter.monthTo ??
    overview?.calendar.at(-1)?.date.slice(0, 7) ??
    monthKey(new Date());
  const [visibleCalendarMonth, setVisibleCalendarMonth] =
    useState(latestCalendarMonth);
  const calendarCells = overview
    ? buildCalendarCells(overview.calendar, visibleCalendarMonth)
    : [];
  const [recentPage, setRecentPage] = useState(1);
  const [recentPageSize, setRecentPageSize] = useState(5);
  const recentTrades = overview?.recentTrades ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil(recentTrades.length / recentPageSize),
  );
  const page = Math.max(1, Math.min(recentPage, totalPages));
  const visibleTrades = recentTrades.slice(
    (page - 1) * recentPageSize,
    page * recentPageSize,
  );

  useEffect(() => {
    setRecentPage((current) => Math.max(1, Math.min(current, totalPages)));
  }, [totalPages]);

  useEffect(() => {
    setVisibleCalendarMonth(latestCalendarMonth);
  }, [latestCalendarMonth]);

  return (
    <section className="border-b border-border/50 bg-background px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-lg border border-border/60 bg-secondary/20 px-4 py-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/50">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">Reporting Period</div>
                <div className="text-xs text-muted-foreground">
                  {overview?.filter.defaultedToMostRecentMonth
                    ? `Most recent month: ${overview.filter.monthFrom ?? 'latest'}`
                    : `${overview?.filter.monthFrom ?? 'First month'} to ${
                        overview?.filter.monthTo ?? 'Latest month'
                      }`}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <MonthSelect
                label="From"
                value={filters.monthFrom}
                months={overview?.availableMonths ?? []}
                fallback={overview?.filter.monthFrom}
                onChange={(monthFrom) =>
                  onFiltersChange({ ...filters, monthFrom })
                }
              />
              <MonthSelect
                label="To"
                value={filters.monthTo}
                months={overview?.availableMonths ?? []}
                fallback={overview?.filter.monthTo}
                onChange={(monthTo) => onFiltersChange({ ...filters, monthTo })}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="h-9"
              >
                Latest month
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Net PnL', overview?.overall.netAfterFees ?? 0],
            ['Win rate', overview?.overall.winRate ?? 0],
            ['Trades', overview?.overall.count ?? 0],
            ['Expectancy', overview?.overall.expectancy ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-border/60 bg-secondary/30 px-3.5 py-3"
            >
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {label === 'Win rate'
                  ? `${Number(value).toFixed(2)}%`
                  : label === 'Trades'
                    ? Number(value).toLocaleString()
                    : formatMoney(Number(value))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Equity Curve
            </div>
            {empty ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                Import trades to see equity.
              </div>
            ) : (
              <ChartContainer
                config={{
                  cumulativePnl: {
                    label: 'Cumulative PnL',
                    color: '#38bdf8',
                  },
                }}
                className="h-[220px] w-full"
              >
                <LineChart data={overview.equityCurve}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={52} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="cumulativePnl"
                    stroke="var(--color-cumulativePnl)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Monthly PnL
            </div>
            {empty ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                Import trades to see months.
              </div>
            ) : (
              <ChartContainer
                config={{ pnl: { label: 'PnL', color: '#22c55e' } }}
                className="h-[220px] w-full"
              >
                <BarChart data={overview.monthly}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={52} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {overview.monthly.map((row) => (
                      <Cell
                        key={row.key}
                        fill={row.pnl >= 0 ? '#22c55e' : '#f43f5e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownTable title="By Symbol" rows={overview?.bySymbol ?? []} />
          <BreakdownTable title="Long vs Short" rows={overview?.bySide ?? []} />
        </div>

        <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Trade Calendar
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setVisibleCalendarMonth((current) => addMonths(current, -1))
                }
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-36 text-center text-sm font-medium tabular-nums">
                {getMonthLabel(visibleCalendarMonth)}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setVisibleCalendarMonth((current) => addMonths(current, 1))
                }
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground sm:gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={`${day}-${index}`} className="py-1">
                {day}
              </div>
            ))}
            {calendarCells.map(({ key, inMonth, tradeDay }) => {
              const pnl = tradeDay?.netAfterFees ?? 0;
              const bg =
                pnl > 0
                  ? 'bg-emerald-500/25 text-emerald-100'
                  : pnl < 0
                    ? 'bg-rose-500/25 text-rose-100'
                    : 'bg-secondary/40 text-muted-foreground';

              return (
                <div
                  key={key}
                  title={
                    tradeDay
                      ? `${key}: ${formatMoney(pnl)} net, ${tradeDay.count} trades`
                      : key
                  }
                  className={`flex aspect-[1.35] min-h-12 flex-col items-center justify-center rounded-md border border-border/40 sm:aspect-[1.8] ${bg} ${
                    inMonth ? '' : 'opacity-35'
                  }`}
                >
                  <span>{new Date(`${key}T00:00:00.000Z`).getUTCDate()}</span>
                  {tradeDay && (
                    <>
                      <span className="text-[10px] font-semibold tabular-nums">
                        {formatMoney(pnl)}
                      </span>
                      <span className="text-[10px] tabular-nums opacity-75">
                        {tradeDay.wins}-{tradeDay.losses}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Recent Trades</div>
              <div className="text-xs text-muted-foreground">
                Showing {visibleTrades.length} of {recentTrades.length} trades
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Rows
              <select
                value={recentPageSize}
                onChange={(event) => {
                  setRecentPageSize(Number(event.target.value));
                  setRecentPage(1);
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
              >
                {[5, 10, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {recentTrades.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No trades imported yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="py-2 text-left font-medium">Date</th>
                      <th className="py-2 text-left font-medium">Symbol</th>
                      <th className="py-2 text-left font-medium">Side</th>
                      <th className="py-2 text-right font-medium">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTrades.map((trade) => (
                      <tr
                        key={trade.rowId}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-2 text-muted-foreground">
                          {trade.enteredAt.slice(0, 10)}
                        </td>
                        <td className="py-2 font-medium">{trade.symbol}</td>
                        <td className="py-2 text-muted-foreground">
                          {trade.side}
                        </td>
                        <td
                          className={`py-2 text-right font-medium tabular-nums ${pnlClass(
                            trade.pnl,
                          )}`}
                        >
                          {formatMoney(trade.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRecentPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page <= 1}
                    className="h-8"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRecentPage((current) =>
                        Math.min(totalPages, current + 1),
                      )
                    }
                    disabled={page >= totalPages}
                    className="h-8"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function MonthSelect({
  label,
  value,
  months,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  months: AnalyticsOverview['availableMonths'];
  fallback?: string | null;
  onChange: (value: string) => void;
}) {
  const displayValue = value || fallback || '';

  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none transition-colors hover:bg-secondary/60 focus:border-primary focus:ring-1 focus:ring-primary sm:w-40"
      >
        <option value="">
          {displayValue
            ? (months.find((month) => month.value === displayValue)?.label ??
              displayValue)
            : 'Latest'}
        </option>
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    key: string;
    count: number;
    netAfterFees: number;
    winRate: number;
  }>;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No trades yet.</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_80px_70px] items-center gap-2 text-sm"
            >
              <div className="truncate font-medium">{row.key}</div>
              <div
                className={`text-right tabular-nums ${pnlClass(row.netAfterFees)}`}
              >
                {formatMoney(row.netAfterFees)}
              </div>
              <div className="text-right text-muted-foreground tabular-nums">
                {row.winRate.toFixed(0)}%
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const { session, user, loading, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [imports, setImports] = useState<TradeImport[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>({
    monthFrom: '',
    monthTo: '',
  });
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!session) return;

    void loadImports();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    void loadOverview();
  }, [session, analyticsFilters]);

  const loadImports = async () => {
    if (!session) return;

    try {
      const data = await apiRequest<{ imports: TradeImport[] }>({
        token: session.access_token,
        path: '/api/imports',
      });
      setImports(data.imports);
    } catch {
      setImportStatus('Could not load imports.');
    }
  };

  const loadOverview = async () => {
    if (!session) return;

    try {
      const data = await apiRequest<AnalyticsOverview>({
        token: session.access_token,
        path: `/api/analytics/overview?${new URLSearchParams(
          Object.entries(analyticsFilters).filter(([, value]) => value),
        ).toString()}`,
      });
      setOverview(data);
    } catch {
      setOverview(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const data = await apiRequest<{ message?: { content?: string } }>({
        token: session.access_token,
        path: '/api/chat',
        method: 'POST',
        body: {
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        },
      });

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message?.content ?? 'No response.',
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: errorMessage,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setImportStatus('');

    try {
      const csvText = await file.text();
      const data = await apiRequest<CsvImportResponse>({
        token: session.access_token,
        path: '/api/imports/csv',
        method: 'POST',
        body: {
          fileName: file.name,
          csvText,
        },
      });

      setImports((prev) => [
        {
          id: data.import.datasetId,
          file_name: data.preview.fileName,
          status: 'imported',
          total_rows: data.import.totalRows,
          valid_rows: data.import.validRows,
          invalid_rows: data.import.invalidRows,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setImportStatus(
        `Imported ${data.import.validRows} of ${data.import.totalRows} rows from ${data.preview.fileName}.`,
      );
      await loadOverview();
    } catch (error) {
      setImportStatus(
        error instanceof Error ? error.message : 'CSV import failed.',
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const latestImport = imports[0];
  const suggestions = [
    'Show my PnL summary',
    'What is my win rate?',
    'Performance by symbol',
    'Compare long vs short',
    'What weekday is weakest?',
    'Largest win and loss',
  ];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6">
        <h1 className="text-sm font-semibold tracking-tight">Trade Journal</h1>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Database className="h-3.5 w-3.5" />
            {latestImport
              ? `${latestImport.valid_rows} trades imported`
              : 'No trades imported'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importCsv(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="h-8 gap-1.5"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">
              {importing ? 'Importing' : 'Import CSV'}
            </span>
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        <Dashboard
          overview={overview}
          filters={analyticsFilters}
          onFiltersChange={setAnalyticsFilters}
          onClearFilters={() =>
            setAnalyticsFilters({
              monthFrom: '',
              monthTo: '',
            })
          }
        />

        <div className="px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-4">
            {(latestImport || importStatus) && (
              <div className="rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-3 text-xs text-muted-foreground">
                {latestImport && (
                  <div className="font-medium text-foreground">
                    Latest import: {latestImport.file_name} ·{' '}
                    {latestImport.valid_rows}/{latestImport.total_rows} valid
                    rows
                    {latestImport.invalid_rows > 0
                      ? ` · ${latestImport.invalid_rows} invalid`
                      : ''}
                  </div>
                )}
                {importStatus && <div className="mt-1">{importStatus}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {chatOpen && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-lg border border-border/70 bg-background shadow-2xl sm:left-auto sm:right-6 sm:w-[420px]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Trade Assistant</div>
              <div className="text-xs text-muted-foreground">
                Rule-based analytics, no API key needed
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Ask a rule-based analytics question about your trades.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInput(suggestion)}
                        className="rounded-md border border-border/60 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-border/60 px-3 py-3">
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your trades..."
                className="flex-1"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {!chatOpen && (
        <Button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 rounded-full px-5 shadow-2xl"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Chat
        </Button>
      )}
    </div>
  );
}
