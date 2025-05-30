// Migration script for existing data
async function migrateUsers() {
  await prisma.user.updateMany({
    where: { status: 'suspended' },
    data: { deactivationReason: 'manual' }
  });
}