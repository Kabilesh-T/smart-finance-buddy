import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/user";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DateRangeFilter from "@/components/DateRangeFilter";
import AccountFilter from "@/components/AccountFilter";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 100;
const MAX_RANGE_DAYS = 90;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; account?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const from = parseDate(params.from);
  const to = parseDate(params.to);

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (from && to && from <= to && (to.getTime() - from.getTime()) / MS_PER_DAY <= MAX_RANGE_DAYS) {
    const toExclusive = new Date(to);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    dateFilter = { gte: from, lt: toExclusive };
  }

  const accounts = await prisma.account.findMany({
    where: { item: { userId: user.id } },
    select: {
      id: true,
      name: true,
      mask: true,
      item: { select: { institutionName: true } },
    },
    orderBy: [{ item: { institutionName: "asc" } }, { name: "asc" }],
  });

  const validAccountId = accounts.find((a) => a.id === params.account)?.id ?? null;

  const txs = await prisma.transaction.findMany({
    where: {
      account: {
        item: { userId: user.id },
        ...(validAccountId ? { id: validAccountId } : {}),
      },
      deletedAt: null,
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    include: { category: true, account: { select: { name: true, mask: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    ...(dateFilter ? {} : { take: DEFAULT_PAGE_SIZE }),
  });

  const accountOptions = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    mask: a.mask,
    institutionName: a.item.institutionName,
  }));

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dateFilter ? (
            <>
              {txs.length.toLocaleString()} transactions from {formatDate(from!)} to {formatDate(to!)}.
            </>
          ) : (
            <>The {txs.length} most recent across all your accounts.</>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <DateRangeFilter from={params.from ?? null} to={params.to ?? null} />
        <div className="ml-auto">
          <AccountFilter accounts={accountOptions} value={validAccountId} />
        </div>
      </div>

      {txs.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          {dateFilter || validAccountId
            ? "No transactions match the current filters."
            : "No transactions yet. Connect a bank to get started."}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground px-5 py-3">
                  Date
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground px-5 py-3">
                  Description
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground px-5 py-3 hidden md:table-cell">
                  Account
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground px-5 py-3">
                  Category
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground px-5 py-3">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const amount = Number(t.amount);
                const isIncome = amount < 0;
                return (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap tabular">
                      {formatDate(t.date, { year: undefined })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.merchantName ?? t.name}</span>
                        {t.pending && <Badge variant="warning">pending</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">
                      {t.account.name}
                      {t.account.mask && (
                        <span className="text-muted-foreground/60"> ··{t.account.mask}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {t.category ? (
                        <div className="inline-flex items-center gap-2 text-sm">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: t.category.color ?? "#71717A" }}
                          />
                          <span className="text-muted-foreground">{t.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">—</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3.5 text-sm text-right font-mono tabular whitespace-nowrap",
                        isIncome ? "text-emerald-400" : "text-foreground",
                      )}
                    >
                      {isIncome ? "+" : ""}
                      {formatCurrency(-amount, t.isoCurrencyCode)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
