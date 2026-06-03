"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { LayoutDashboard, ArrowLeftRight, Repeat, PieChart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/reports", label: "Reports", icon: PieChart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card/30 sticky top-0 h-screen flex flex-col">
      <div className="px-6 py-5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Finance Buddy
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border flex items-center gap-3">
        <UserButton appearance={{ baseTheme: dark }} />
        <div className="text-xs text-muted-foreground">Signed in</div>
      </div>
    </aside>
  );
}
