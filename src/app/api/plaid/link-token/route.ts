import { NextResponse } from "next/server";
import { plaid, PLAID_COUNTRY_CODES, PLAID_PRODUCTS } from "@/lib/plaid";
import { requireUser } from "@/lib/user";
import { log } from "@/lib/logger";

export async function POST() {
  try {
    const user = await requireUser();
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Smart Finance Buddy",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
      webhook: process.env.PLAID_WEBHOOK_URL,
    });
    return NextResponse.json({ link_token: data.link_token });
  } catch (e) {
    log.error("link-token.failed", { error: (e as Error).message });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
