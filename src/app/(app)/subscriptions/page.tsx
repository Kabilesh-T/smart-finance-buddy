import { Repeat, Calendar } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const MONTHLY_MULTIPLIER: Record<string, number> = {
  WEEKLY: 4.33,
  BIWEEKLY: 2.17,
  SEMI_MONTHLY: 2,
  MONTHLY: 1,
  ANNUALLY: 1 / 12,
  UNKNOWN: 1,
};

function monthlyEquivalent(amount: number, frequency: string): number {
  return amount * (MONTHLY_MULTIPLIER[frequency] ?? 1);
}

function prettyFrequency(f: string): string {
  switch (f) {
    case "WEEKLY":
      return "Weekly";
    case "BIWEEKLY":
      return "Every 2 weeks";
    case "SEMI_MONTHLY":
      return "Twice a month";
    case "MONTHLY":
      return "Monthly";
    case "ANNUALLY":
      return "Yearly";
    default:
      return f.toLowerCase();
  }
}

export default async function SubscriptionsPage() {
  const user = await requireUser();

  const streams = await prisma.recurringStream.findMany({
    where: {
      item: { userId: user.id },
      isActive: true,
      streamType: "outflow",
      status: { not: "TOMBSTONED" },
    },
    include: { account: { select: { name: true, mask: true } } },
    orderBy: { averageAmount: "desc" },
  });

  const totalMonthly = streams.reduce(
    (sum, s) => sum + monthlyEquivalent(Number(s.averageAmount), s.frequency),
    0,
  );
  const totalYearly = totalMonthly * 12;
  const earlyDetection = streams.filter((s) => s.status === "EARLY_DETECTION").length;

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recurring outflows detected on your accounts.
          {earlyDetection > 0 && ` ${earlyDetection} still in early detection.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle>Estimated monthly</CardTitle>
            <Repeat className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular">
              {formatCurrency(totalMonthly, streams[0]?.isoCurrencyCode ?? "USD")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle>Annualized</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular text-muted-foreground">
              {formatCurrency(totalYearly, streams[0]?.isoCurrencyCode ?? "USD")}
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Active recurring outflows
      </h2>

      {streams.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <Repeat className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-medium mb-1">Nothing detected yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Plaid usually needs ~2 months of transaction history to lock in recurring streams.
            Sandbox data may not contain any.
          </p>
        </Card>
      ) : (
        <Card>
          {streams.map((s, i) => {
            const avg = Number(s.averageAmount);
            const monthly = monthlyEquivalent(avg, s.frequency);
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${
                  i !== streams.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Repeat className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {s.merchantName ?? s.description}
                      </span>
                      {s.status === "EARLY_DETECTION" && (
                        <Badge variant="outline">early</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {prettyFrequency(s.frequency)} · {s.account.name}
                      {s.account.mask && (
                        <span className="text-muted-foreground/60"> ··{s.account.mask}</span>
                      )}
                      {s.predictedNextDate && <> · next {formatDate(s.predictedNextDate)}</>}
                    </div>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="font-mono tabular text-sm">
                    {formatCurrency(avg, s.isoCurrencyCode)}
                  </div>
                  <div className="text-xs text-muted-foreground tabular mt-0.5">
                    ≈ {formatCurrency(monthly, s.isoCurrencyCode)}/mo
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
