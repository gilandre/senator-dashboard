const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Test de sélection du champ raw_event_type
    const result = await prisma.access_logs.findFirst({
      select: {
        id: true,
        raw_event_type: true,
        event_type: true
      }
    });
    console.log('Test query result:', result);

    // Test d'insertion avec raw_event_type
    const insertResult = await prisma.access_logs.create({
      data: {
        badge_number: 'TEST123',
        person_type: 'employee',
        event_date: new Date(),
        event_time: new Date(),
        raw_event_type: 'Test Event Type',
        event_type: 'unknown'
      }
    });
    console.log('Insert test result:', insertResult);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test(); 