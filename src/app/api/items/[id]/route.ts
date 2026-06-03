import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { plaid } from "@/lib/plaid";
import { decryptToken } from "@/lib/crypto";
import { requireUser } from "@/lib/user";
import { log } from "@/lib/logger";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const item = await prisma.plaidItem.findFirst({ where: { id, userId: user.id } });
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Best-effort revoke at Plaid; proceed with local delete even if it fails (token may already be invalid).
    try {
      const accessToken = decryptToken(item.encryptedAccessToken);
      await plaid.itemRemove({ access_token: accessToken });
    } catch (e) {
      log.warn("item.remove.plaid_failed", { itemId: id, error: (e as Error).message });
    }

    await prisma.plaidItem.delete({ where: { id: item.id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "disconnect_item",
        resourceId: item.id,
      },
    });

    log.info("item.disconnected", { itemId: item.id, institution: item.institutionName });
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("item.delete.failed", { error: (e as Error).message });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
