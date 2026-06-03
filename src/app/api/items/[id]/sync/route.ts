import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/user";
import { syncItem } from "@/lib/sync";
import { log } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const item = await prisma.plaidItem.findFirst({ where: { id, userId: user.id } });
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

    const url = new URL(req.url);
    if (url.searchParams.get("reset") === "true") {
      await prisma.plaidItem.update({ where: { id: item.id }, data: { cursor: null } });
    }

    const result = await syncItem(item.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    log.error("manual-sync.failed", { error: (e as Error).message });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
