"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConnectBankButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/plaid/link-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setLinkToken(d.link_token))
      .catch(() => setLinkToken(null));
  }, []);

  const onSuccess = useCallback(
    async (
      public_token: string,
      metadata: { institution: { name: string; institution_id: string } | null },
    ) => {
      setBusy(true);
      try {
        await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ public_token, institution: metadata.institution }),
        });
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  return (
    <Button onClick={() => open()} disabled={!ready || !linkToken || busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Plus />}
      {busy ? "Connecting…" : "Connect a bank"}
    </Button>
  );
}
