import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { plaid } from "./plaid";
import { decryptToken } from "./crypto";
import { mapPlaidCategory } from "./categorize";
import { log } from "./logger";

export async function syncItem(itemId: string): Promise<{ added: number; modified: number; removed: number }> {
  const item = await prisma.plaidItem.findUniqueOrThrow({ where: { id: itemId } });
  const accessToken = decryptToken(item.encryptedAccessToken);

  await upsertAccounts(item.id, accessToken);

  let cursor = item.cursor ?? undefined;
  let added = 0, modified = 0, removed = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await plaid.transactionsSync({ access_token: accessToken, cursor });
    const data = res.data;

    if (data.added.length) {
      added += data.added.length;
      await writeTransactions(item.id, data.added);
    }
    if (data.modified.length) {
      modified += data.modified.length;
      await writeTransactions(item.id, data.modified);
    }
    if (data.removed.length) {
      removed += data.removed.length;
      await prisma.transaction.updateMany({
        where: { plaidTransactionId: { in: data.removed.map((r) => r.transaction_id!) } },
        data: { deletedAt: new Date() },
      });
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  await prisma.plaidItem.update({
    where: { id: item.id },
    data: { cursor, lastSyncedAt: new Date(), status: "active" },
  });

  await syncRecurring(item.id, accessToken);

  log.info("sync.complete", { itemId, added, modified, removed });
  return { added, modified, removed };
}

async function syncRecurring(itemId: string, accessToken: string) {
  const accounts = await prisma.account.findMany({
    where: { itemId },
    select: { id: true, plaidAccountId: true },
  });
  if (accounts.length === 0) return;
  const accountMap = new Map(accounts.map((a) => [a.plaidAccountId, a.id]));

  let data;
  try {
    const res = await plaid.transactionsRecurringGet({
      access_token: accessToken,
      account_ids: Array.from(accountMap.keys()),
    });
    data = res.data;
  } catch (e) {
    log.warn("recurring.fetch.failed", { itemId, error: (e as Error).message });
    return;
  }

  const streams = [
    ...data.inflow_streams.map((s) => ({ s, type: "inflow" as const })),
    ...data.outflow_streams.map((s) => ({ s, type: "outflow" as const })),
  ];

  for (const { s, type } of streams) {
    const accountId = accountMap.get(s.account_id);
    if (!accountId) continue;

    // Plaid v27 SDK type is missing `predicted_next_date` but the API does send it.
    const predictedNextDateRaw = (s as { predicted_next_date?: string | null })
      .predicted_next_date;

    const base = {
      description: s.description,
      merchantName: s.merchant_name ?? null,
      category: s.personal_finance_category?.primary ?? null,
      categoryDetailed: s.personal_finance_category?.detailed ?? null,
      frequency: String(s.frequency),
      firstDate: new Date(s.first_date),
      lastDate: new Date(s.last_date),
      predictedNextDate: predictedNextDateRaw ? new Date(predictedNextDateRaw) : null,
      averageAmount: new Prisma.Decimal(s.average_amount.amount ?? 0),
      lastAmount: s.last_amount?.amount != null ? new Prisma.Decimal(s.last_amount.amount) : null,
      isoCurrencyCode: s.average_amount.iso_currency_code ?? null,
      isActive: s.is_active,
      status: String(s.status),
    };

    await prisma.recurringStream.upsert({
      where: { plaidStreamId: s.stream_id },
      create: { ...base, itemId, accountId, plaidStreamId: s.stream_id, streamType: type },
      update: base,
    });
  }
}

async function upsertAccounts(itemId: string, accessToken: string) {
  const { data } = await plaid.accountsGet({ access_token: accessToken });
  for (const a of data.accounts) {
    await prisma.account.upsert({
      where: { plaidAccountId: a.account_id },
      create: {
        itemId,
        plaidAccountId: a.account_id,
        name: a.name,
        officialName: a.official_name ?? null,
        mask: a.mask ?? null,
        type: a.type,
        subtype: a.subtype ?? null,
        currentBalance: a.balances.current ?? null,
        availableBalance: a.balances.available ?? null,
        isoCurrencyCode: a.balances.iso_currency_code ?? null,
      },
      update: {
        name: a.name,
        currentBalance: a.balances.current ?? null,
        availableBalance: a.balances.available ?? null,
        isoCurrencyCode: a.balances.iso_currency_code ?? null,
      },
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeTransactions(itemId: string, txs: any[]) {
  const accountMap = new Map(
    (await prisma.account.findMany({ where: { itemId }, select: { id: true, plaidAccountId: true } })).map(
      (a) => [a.plaidAccountId, a.id],
    ),
  );

  for (const t of txs) {
    const accountId = accountMap.get(t.account_id);
    if (!accountId) continue;

    const categoryId = await mapPlaidCategory(
      t.personal_finance_category?.detailed,
      t.personal_finance_category?.primary,
    );

    const existing = await prisma.transaction.findUnique({
      where: { plaidTransactionId: t.transaction_id },
      select: { categorySource: true },
    });
    // Only auto-set category if no user/rule override exists.
    const canSetCategory =
      !existing || existing.categorySource === null || existing.categorySource === "plaid";

    await prisma.transaction.upsert({
      where: { plaidTransactionId: t.transaction_id },
      create: {
        accountId,
        plaidTransactionId: t.transaction_id,
        amount: new Prisma.Decimal(t.amount),
        isoCurrencyCode: t.iso_currency_code ?? null,
        date: new Date(t.date),
        authorizedDate: t.authorized_date ? new Date(t.authorized_date) : null,
        name: t.name,
        merchantName: t.merchant_name ?? null,
        pending: t.pending ?? false,
        paymentChannel: t.payment_channel ?? null,
        plaidCategoryPrimary: t.personal_finance_category?.primary ?? null,
        plaidCategoryDetailed: t.personal_finance_category?.detailed ?? null,
        categoryId,
        categorySource: categoryId ? "plaid" : null,
        raw: t,
      },
      update: {
        amount: new Prisma.Decimal(t.amount),
        date: new Date(t.date),
        pending: t.pending ?? false,
        merchantName: t.merchant_name ?? null,
        plaidCategoryPrimary: t.personal_finance_category?.primary ?? null,
        plaidCategoryDetailed: t.personal_finance_category?.detailed ?? null,
        raw: t,
        deletedAt: null,
        ...(canSetCategory ? { categoryId, categorySource: categoryId ? "plaid" : null } : {}),
      },
    });
  }
}
