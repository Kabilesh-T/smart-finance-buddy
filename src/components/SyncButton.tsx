"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SyncButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "sync" | "reset">(null);

  async function run(reset: boolean) {
    setBusy(reset ? "reset" : "sync");
    try {
      const res = await fetch(`/api/items/${itemId}/sync${reset ? "?reset=true" : ""}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Sync failed: ${data.error ?? "unknown"}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => run(false)} disabled={busy !== null}>
        {busy === "sync" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {busy === "sync" ? "Syncing" : "Sync"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => run(true)}
        disabled={busy !== null}
        title="Re-pull all transactions"
      >
        {busy === "reset" ? <Loader2 className="animate-spin" /> : <RotateCw />}
      </Button>
    </div>
  );
}
