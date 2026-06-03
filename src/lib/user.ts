import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function requireUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const cu = await currentUser();
  const email = cu?.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email on Clerk user");

  return prisma.user.create({ data: { clerkId, email } });
}
