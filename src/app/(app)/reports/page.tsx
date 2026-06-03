import { TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DateRangeFilter from "@/components/DateRangeFilter";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const MAX_RANGE_DAYS = 90;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  // Resolve range: explicit ?from&to if valid, otherwise default to the month of the latest tx.
  let from = parseDate(params.from);
  let to = parseDate(params.to);
  let validRange = false;

  if (from && to && from <= to && (to.getTime() - from.getTime()) / MS_PER_DAY <= MAX_RANGE_DAYS) {
    validRange = true;
  } else {
    from = null;
    to = null;
    const latest = await prisma.transaction.findFirst({
      where: { account: { item: { userId: user.id } }, deletedAt: null },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const anchor = latest?.date ?? new Date();
    from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  }

  const toExclusive = new Date(to);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  const txs = await prisma.transaction.findMany({
    where: {
      account: { item: { userId: user.id } },
      deletedAt: null,
      date: { gte: from, lt: toExclusive },
    },
    include: { category: true },
  });

  type Bucket = {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    total: number;
    count: number;
  };
  const spendByCat = new Map<string, Bucket>();
  let totalSpend = 0;
  let totalIncome = 0;

  for (const t of txs) {
    const amount = Number(t.amount);
    if (amount < 0) {
      totalIncome += -amount;
      continue;
    }
    totalSpend += amount;
    const key = t.category?.id ?? "uncategorized";
    const existing = spendByCat.get(key);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      spendByCat.set(key, {
        id: key,
        name: t.category?.name ?? "Uncategorized",
        color: t.category?.color ?? "#71717A",
        icon: t.category?.icon ?? null,
        total: amount,
        count: 1,
      });
    }
  }

  const buckets = Array.from(spendByCat.values()).sort((a, b) => b.total - a.total);
  const max = buckets[0]?.total ?? 1;
  const net = totalIncome - totalSpend;

  const headerLabel = validRange
    ? `${formatDate(from)} → ${formatDate(to)}`
    : from.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {txs.length.toLocaleString()} transactions · {headerLabel}
        </p>
      </div>

      <div className="mb-6">
        <DateRangeFilter from={params.from ?? null} to={params.to ?? null} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle>Spend</CardTitle>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular">
              {formatCurrency(totalSpend)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle>Income</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular text-emerald-400">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-semibold tracking-tight tabular",
                net >= 0 ? "text-emerald-400" : "text-destructive",
              )}
            >
              {net >= 0 ? "+" : ""}
              {formatCurrency(net)}
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Spend by category
      </h2>

      {buckets.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No spend recorded in this range.
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-5">
            {buckets.map((b) => {
              const pct = (b.total / totalSpend) * 100;
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: b.color ?? "#71717A" }}
                      />
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.count} tx · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-sm font-mono tabular">
                      {formatCurrency(b.total)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full origin-left animate-bar-grow"
                      style={{
                        width: `${(b.total / max) * 100}%`,
                        background: b.color ?? "hsl(var(--primary))",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
