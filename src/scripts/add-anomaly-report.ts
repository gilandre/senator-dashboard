import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check if entry already exists
    const existingReport = await prisma.reports.findFirst({
      where: {
        report_type: 'anomaly',
        link: '/anomalies'
      }
    });

    if (existingReport) {
      console.log('The anomaly report entry already exists in the reports table.');
      return;
    }

    // Create the anomaly report entry
    const newReport = await prisma.reports.create({
      data: {
        title: 'Rapport d\'anomalies',
        description: 'Analyse des événements anormaux d\'accès',
        report_type: 'anomaly',
        category: 'access',
        icon: 'alert-triangle',
        link: '/anomalies',
      }
    });

    console.log('Successfully added anomaly report to the reports table:');
    console.log(newReport);
  } catch (error) {
    console.error('Error adding anomaly report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 