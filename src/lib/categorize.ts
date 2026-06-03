import { prisma } from "./db";

// Plaid Personal Finance Category (PFC) detailed → our category slug
const DETAILED_OVERRIDES: Record<string, string> = {
  FOOD_AND_DRINK_GROCERIES: "groceries",
  RENT_AND_UTILITIES_RENT: "rent-and-mortgage",
  GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT: "taxes",
};

// Plaid PFC primary → our category slug
const PRIMARY_MAP: Record<string, string> = {
  INCOME: "income",
  TRANSFER_IN: "transfers",
  TRANSFER_OUT: "transfers",
  LOAN_PAYMENTS: "rent-and-mortgage",
  BANK_FEES: "fees",
  ENTERTAINMENT: "entertainment",
  FOOD_AND_DRINK: "food-and-drink",
  GENERAL_MERCHANDISE: "shopping",
  HOME_IMPROVEMENT: "home",
  MEDICAL: "health",
  PERSONAL_CARE: "personal-care",
  GENERAL_SERVICES: "other",
  GOVERNMENT_AND_NON_PROFIT: "other",
  TRANSPORTATION: "transportation",
  TRAVEL: "travel",
  RENT_AND_UTILITIES: "utilities",
};

let slugToIdCache: Map<string, string> | null = null;

async function loadSystemCategoryMap(): Promise<Map<string, string>> {
  if (slugToIdCache) return slugToIdCache;
  const cats = await prisma.category.findMany({
    where: { userId: null },
    select: { id: true, slug: true },
  });
  slugToIdCache = new Map(cats.map((c) => [c.slug, c.id]));
  return slugToIdCache;
}

export async function mapPlaidCategory(
  detailed: string | null | undefined,
  primary: string | null | undefined,
): Promise<string | null> {
  const slug =
    (detailed && DETAILED_OVERRIDES[detailed]) ||
    (primary && PRIMARY_MAP[primary]) ||
    "other";

  const map = await loadSystemCategoryMap();
  return map.get(slug) ?? map.get("other") ?? null;
}
