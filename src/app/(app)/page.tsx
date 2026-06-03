import { Landmark, CreditCard, ArrowLeftRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConnectBankButton from "@/components/ConnectBankButton";
import SyncButton from "@/components/SyncButton";
import DisconnectBankButton from "@/components/DisconnectBankButton";

function formatRelative(d: Date | null): string {
  if (!d) return "never";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function Dashboard() {
  const user = await requireUser();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [items, accountCount, recentTxCount] = await Promise.all([
    prisma.plaidItem.findMany({
      where: { userId: user.id },
      include: { _count: { select: { accounts: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.count({ where: { item: { userId: user.id } } }),
    prisma.transaction.count({
      where: {
        account: { item: { userId: user.id } },
        deletedAt: null,
        date: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything wired up to your bank accounts.
          </p>
        </div>
        <ConnectBankButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Stat label="Banks connected" value={items.length} icon={<Landmark className="w-4 h-4" />} />
        <Stat label="Accounts" value={accountCount} icon={<CreditCard className="w-4 h-4" />} />
        <Stat
          label="Transactions"
          value={recentTxCount.toLocaleString()}
          sublabel="last 30 days"
          icon={<ArrowLeftRight className="w-4 h-4" />}
        />
      </div>

      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Connected banks
      </h2>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-medium mb-1">No banks connected yet</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Link your first bank to start tracking transactions automatically.
            </p>
            <div className="flex justify-center">
              <ConnectBankButton />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="hover:border-border/80 transition-colors">
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{item.institutionName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item._count.accounts} account{item._count.accounts === 1 ? "" : "s"} ·{" "}
                      synced {formatRelative(item.lastSyncedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <SyncButton itemId={item.id} />
                  <div className="w-px h-6 bg-border mx-1" />
                  <DisconnectBankButton
                    itemId={item.id}
                    institutionName={item.institutionName}
                    accountCount={item._count.accounts}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle>{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight tabular">{value}</div>
        {sublabel && (
          <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
        )}
      </CardContent>
    </Card>
  );
}
