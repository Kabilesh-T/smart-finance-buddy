import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { slug: "food-and-drink", name: "Food & Drink", color: "#F59E0B", icon: "🍔" },
  { slug: "groceries", name: "Groceries", color: "#10B981", icon: "🛒" },
  { slug: "transportation", name: "Transportation", color: "#3B82F6", icon: "🚗" },
  { slug: "travel", name: "Travel", color: "#8B5CF6", icon: "✈️" },
  { slug: "shopping", name: "Shopping", color: "#EC4899", icon: "🛍️" },
  { slug: "entertainment", name: "Entertainment", color: "#F43F5E", icon: "🎬" },
  { slug: "subscriptions", name: "Subscriptions", color: "#6366F1", icon: "🔁" },
  { slug: "health", name: "Health & Medical", color: "#14B8A6", icon: "🏥" },
  { slug: "home", name: "Home", color: "#84CC16", icon: "🏠" },
  { slug: "utilities", name: "Utilities", color: "#0EA5E9", icon: "💡" },
  { slug: "rent-and-mortgage", name: "Rent & Mortgage", color: "#A855F7", icon: "🏘️" },
  { slug: "personal-care", name: "Personal Care", color: "#F472B6", icon: "💅" },
  { slug: "income", name: "Income", color: "#22C55E", icon: "💰" },
  { slug: "transfers", name: "Transfers", color: "#94A3B8", icon: "↔️" },
  { slug: "fees", name: "Fees & Charges", color: "#EF4444", icon: "💸" },
  { slug: "taxes", name: "Taxes", color: "#DC2626", icon: "🧾" },
  { slug: "other", name: "Other", color: "#71717A", icon: "❓" },
];

async function main() {
  for (const c of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { userId: null, slug: c.slug } });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name: c.name, color: c.color, icon: c.icon },
      });
    } else {
      await prisma.category.create({ data: { ...c, userId: null } });
    }
  }
  console.log(`Seeded ${SYSTEM_CATEGORIES.length} system categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
