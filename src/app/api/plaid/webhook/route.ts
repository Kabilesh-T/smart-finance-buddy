import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { syncItem } from "@/lib/sync";
import { verifyPlaidWebhook } from "@/lib/webhook-verify";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("plaid-verification");
  const verified = await verifyPlaidWebhook(raw, signature);

  if (!verified) {
    log.warn("webhook.unverified");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const webhookType = String(payload.webhook_type ?? "");
  const webhookCode = String(payload.webhook_code ?? "");
  const plaidItemId = payload.item_id ? String(payload.item_id) : null;

  const item = plaidItemId ? await prisma.plaidItem.findUnique({ where: { plaidItemId } }) : null;

  const event = await prisma.webhookEvent.create({
    data: {
      plaidItemId: item?.id ?? null,
      webhookType,
      webhookCode,
      payload: payload as Prisma.InputJsonValue,
      signatureVerified: true,
    },
  });

  try {
    if (webhookType === "TRANSACTIONS" && webhookCode === "SYNC_UPDATES_AVAILABLE" && item) {
      await syncItem(item.id);
    }
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  } catch (e) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { error: (e as Error).message },
    });
    log.error("webhook.processing.failed", { eventId: event.id, error: (e as Error).message });
  }

  return NextResponse.json({ ok: true });
}
