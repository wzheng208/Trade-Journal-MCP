import type { Request, Response, NextFunction } from 'express';
import { computePnlStats, groupTrades } from '../../analytics/pnl.js';
import { mapTradeRecordToTrade } from '../../domain/trades.js';
import { listTradesByUserId } from '../../repositories/tradeRepository.js';

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function sortByPnl<T extends { pnl: number; count: number; key: string }>(
  rows: T[],
): T[] {
  return rows.sort(
    (a, b) => b.pnl - a.pnl || b.count - a.count || a.key.localeCompare(b.key),
  );
}

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
}

function parseMonthStart(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}-01T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMonthEnd(value: string | undefined): Date | null {
  if (!value) return null;
  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

function getMostRecentMonthRange(dates: Date[]) {
  const latest = [...dates]
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (!latest) {
    return { from: null, to: null, monthFrom: null, monthTo: null };
  }

  const year = latest.getUTCFullYear();
  const month = latest.getUTCMonth();
  const monthValue = `${year}-${String(month + 1).padStart(2, '0')}`;

  return {
    from: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
    monthFrom: monthValue,
    monthTo: monthValue,
  };
}

export async function getAnalyticsOverview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const allTradeRows = await listTradesByUserId(req.user.id);
    const availableMonths = Array.from(
      new Set(
        allTradeRows.map((row) =>
          new Date(row.entered_at).toISOString().slice(0, 7),
        ),
      ),
    )
      .sort()
      .map((value) => ({
        value,
        label: monthLabel(new Date(`${value}-01T00:00:00.000Z`)),
      }));
    const monthFromRaw = firstQueryValue(req.query.monthFrom);
    const monthToRaw = firstQueryValue(req.query.monthTo);
    const hasExplicitFilter = Boolean(monthFromRaw || monthToRaw);
    const defaultRange = hasExplicitFilter
      ? { from: null, to: null, monthFrom: null, monthTo: null }
      : getMostRecentMonthRange(
          allTradeRows.map((row) => new Date(row.entered_at)),
        );

    const from = parseMonthStart(monthFromRaw) ?? defaultRange.from;
    const to = parseMonthEnd(monthToRaw) ?? defaultRange.to;

    const tradeRows = allTradeRows.filter((row) => {
      const enteredAt = new Date(row.entered_at);
      if (from && enteredAt < from) return false;
      if (to && enteredAt > to) return false;
      return true;
    });
    const trades = tradeRows.map(mapTradeRecordToTrade);
    const overall = computePnlStats(trades);

    const daily = new Map<
      string,
      {
        date: string;
        pnl: number;
        fees: number;
        wins: number;
        losses: number;
        count: number;
      }
    >();

    for (const trade of trades) {
      const key = dayKey(trade.enteredAt);
      const row = daily.get(key) ?? {
        date: key,
        pnl: 0,
        fees: 0,
        wins: 0,
        losses: 0,
        count: 0,
      };

      const pnl = trade.pnl ?? 0;
      row.pnl += pnl;
      row.fees += trade.fees ?? 0;
      row.count += 1;
      if (pnl > 0) row.wins += 1;
      if (pnl < 0) row.losses += 1;
      daily.set(key, row);
    }

    const calendar = [...daily.values()]
      .map((row) => ({
        ...row,
        pnl: Number(row.pnl.toFixed(2)),
        fees: Number(row.fees.toFixed(2)),
        netAfterFees: Number((row.pnl - row.fees).toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningPnl = 0;
    const equityCurve = calendar.map((row) => {
      runningPnl += row.pnl;
      return {
        date: row.date,
        pnl: row.pnl,
        cumulativePnl: Number(runningPnl.toFixed(2)),
      };
    });

    const monthly = new Map<
      string,
      { key: string; pnl: number; count: number }
    >();
    for (const row of calendar) {
      const date = new Date(`${row.date}T00:00:00.000Z`);
      const key = `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, '0')}`;
      const existing = monthly.get(key) ?? {
        key,
        pnl: 0,
        count: 0,
      };
      existing.pnl += row.pnl;
      existing.count += row.count;
      monthly.set(key, existing);
    }

    const bySymbol = sortByPnl(
      [...groupTrades(trades, 'symbol').entries()].map(([key, grouped]) => ({
        key,
        ...computePnlStats(grouped),
      })),
    ).slice(0, 8);

    const bySide = sortByPnl(
      [...groupTrades(trades, 'side').entries()].map(([key, grouped]) => ({
        key,
        ...computePnlStats(grouped),
      })),
    );

    res.json({
      filter: {
        monthFrom: monthFromRaw ?? defaultRange.monthFrom,
        monthTo: monthToRaw ?? defaultRange.monthTo,
        defaultedToMostRecentMonth: !hasExplicitFilter,
      },
      availableMonths,
      overall,
      equityCurve,
      calendar,
      monthly: [...monthly.values()].map((row) => ({
        ...row,
        label: monthLabel(new Date(`${row.key}-01T00:00:00.000Z`)),
        pnl: Number(row.pnl.toFixed(2)),
      })),
      bySymbol,
      bySide,
      recentTrades: [...tradeRows].reverse().map((row) => ({
        rowId: row.id,
        id: row.external_id ?? row.id,
        symbol: row.symbol,
        side: row.side,
        enteredAt: new Date(row.entered_at).toISOString(),
        pnl: row.pnl !== null ? Number(row.pnl) : 0,
      })),
    });
  } catch (error) {
    next(error);
  }
}
