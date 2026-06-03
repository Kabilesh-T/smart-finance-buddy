"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DisconnectBankButton({
  itemId,
  institutionName,
  accountCount,
}: {
  itemId: string;
  institutionName: string;
  accountCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Disconnect failed: ${data.error ?? "unknown"}`);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Disconnect bank" className="text-muted-foreground hover:text-destructive">
          <Unlink />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {institutionName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This revokes Plaid&apos;s access and permanently deletes{" "}
            <strong className="text-foreground">{accountCount} account{accountCount === 1 ? "" : "s"}</strong>{" "}
            and all their transactions from Finance Buddy. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="animate-spin w-4 h-4" />}
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
