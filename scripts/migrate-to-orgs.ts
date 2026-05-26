// One-time migration: For each user that has no Organization yet, create a
// "default" Organization populated with their existing company settings, then
// reassign their existing invoices, clients, presets, email templates, and
// appointments to that new org.
//
// Run with: npx tsx scripts/migrate-to-orgs.ts
// (or:      npx ts-node scripts/migrate-to-orgs.ts)
//
// Requires DATABASE_URL / DATABASE_URL_UNPOOLED in env. Load .env.local first.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users to migrate.`);

  for (const user of users) {
    // Skip users who already have at least one org
    const existingOrgs = await prisma.organization.findMany({
      where: { userId: user.id },
    });
    if (existingOrgs.length > 0) {
      console.log(`  • ${user.username}: already has ${existingOrgs.length} org(s), skipping`);
      // Ensure they have activeOrgId set
      if (!user.activeOrgId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { activeOrgId: existingOrgs[0].id },
        });
      }
      continue;
    }

    const defaultName =
      user.companyName?.trim() ||
      (user.fullName?.trim() ? `${user.fullName}'s Business` : "My Business");

    const org = await prisma.organization.create({
      data: {
        userId: user.id,
        name: defaultName,
        companyName: user.companyName || "",
        companyEmail: user.companyEmail || "",
        companyPhone: user.companyPhone || "",
        companyAddress: user.companyAddress || "",
        logoUrl: user.logoUrl || "",
        primaryColor: user.primaryColor || "#2563eb",
        accentColor: user.accentColor || "#1e40af",
      },
    });
    console.log(`  • ${user.username}: created org "${org.name}" (${org.id})`);

    // Reassign all user-scoped records to this org
    const [invRes, cliRes, presRes, tmplRes, apptRes] = await Promise.all([
      prisma.invoice.updateMany({
        where: { userId: user.id, organizationId: null },
        data: { organizationId: org.id },
      }),
      prisma.client.updateMany({
        where: { userId: user.id, organizationId: null },
        data: { organizationId: org.id },
      }),
      prisma.presetItem.updateMany({
        where: { userId: user.id, organizationId: null },
        data: { organizationId: org.id },
      }),
      prisma.emailTemplate.updateMany({
        where: { userId: user.id, organizationId: null },
        data: { organizationId: org.id },
      }),
      prisma.appointment.updateMany({
        where: { userId: user.id, organizationId: null },
        data: { organizationId: org.id },
      }),
    ]);
    console.log(
      `      ↳ invoices:${invRes.count}, clients:${cliRes.count}, presets:${presRes.count}, templates:${tmplRes.count}, appointments:${apptRes.count}`
    );

    // Set active org on user
    await prisma.user.update({
      where: { id: user.id },
      data: { activeOrgId: org.id },
    });
  }

  console.log("Migration complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
