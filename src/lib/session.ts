import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = (session.user as Record<string, unknown>).id as string;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Returns the user's currently-active Organization. If activeOrgId is missing
 * or stale, falls back to their first org (creating one from legacy User
 * company fields if none exist — covers brand-new accounts that registered
 * before the org system was added).
 */
export async function getActiveOrg(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  if (user.activeOrgId) {
    const org = await prisma.organization.findFirst({
      where: { id: user.activeOrgId, userId },
    });
    if (org) return org;
  }

  // Fallback: first org owned by this user
  let org = await prisma.organization.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (org) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeOrgId: org.id },
    });
    return org;
  }

  // No org exists at all — create a default one from legacy fields
  org = await prisma.organization.create({
    data: {
      userId,
      name: user.companyName?.trim() || `${user.fullName}'s Business`,
      companyName: user.companyName,
      companyEmail: user.companyEmail,
      companyPhone: user.companyPhone,
      companyAddress: user.companyAddress,
      logoUrl: user.logoUrl,
      primaryColor: user.primaryColor,
      accentColor: user.accentColor,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { activeOrgId: org.id },
  });
  return org;
}

export async function requireActiveOrg(userId: string) {
  const org = await getActiveOrg(userId);
  if (!org) throw new Error("No active organization");
  return org;
}
