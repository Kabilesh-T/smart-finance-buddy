import { NextResponse } from "next/server";
import { z } from "zod";
import { plaid } from "@/lib/plaid";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";
import { requireUser } from "@/lib/user";
import { syncItem } from "@/lib/sync";
import { log } from "@/lib/logger";

const Body = z.object({
  public_token: z.string().min(1),
  institution: z.object({ name: z.string(), institution_id: z.string() }).nullable(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = Body.parse(await req.json());

    const exchange = await plaid.itemPublicTokenExchange({ public_token: body.public_token });
    const accessToken = exchange.data.access_token;
    const plaidItemId = exchange.data.item_id;

    const item = await prisma.plaidItem.create({
      data: {
        userId: user.id,
        plaidItemId,
        encryptedAccessToken: encryptToken(accessToken),
        institutionId: body.institution?.institution_id ?? "unknown",
        institutionName: body.institution?.name ?? "Unknown",
      },
    });

    // Inline initial sync. For larger accounts move this to a queue/cron.
    syncItem(item.id).catch((e) => log.error("initial-sync.failed", { itemId: item.id, error: e.message }));

    return NextResponse.json({ ok: true, itemId: item.id });
  } catch (e) {
    log.error("exchange.failed", { error: (e as Error).message });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
