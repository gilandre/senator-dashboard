import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Define route segment config
export const dynamic = 'force-dynamic';

// Register helper functions for Handlebars templates
handlebars.registerHelper('formatDate', function(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
});

handlebars.registerHelper('formatCurrentDate', function() {
  return format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });
});

handlebars.registerHelper('currentYear', function() {
  return new Date().getFullYear();
});

handlebars.registerHelper('formatNumber', function(value) {
  if (value === undefined || value === null) return '0';
  return parseFloat(value).toFixed(1);
});

handlebars.registerHelper('divide', function(a, b) {
  return a / b;
});

handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

handlebars.registerHelper('subtract', function(a, b) {
  return a - b;
});

handlebars.registerHelper('lessThan', function(a, b) {
  return a < b;
});

handlebars.registerHelper('greaterThan', function(a, b) {
  return a > b;
});

handlebars.registerHelper('greaterThanOrEqual', function(a, b) {
  return a >= b;
});

handlebars.registerHelper('and', function(a, b) {
  return a && b;
});

// Type interface for the Handlebars context
interface HandlebarsContext {
  data: {
    daily?: Array<{ count?: number; duration?: number }>;
    [key: string]: any;
  };
  [key: string]: any;
}

handlebars.registerHelper('calculateAverageHoursPerEmployee', function(this: HandlebarsContext) {
  const dailyData = this.data?.daily || [];
  if (dailyData.length === 0) return "0 h";
  
  let totalEmployeeHours = 0;
  let totalEmployeeCount = 0;
  
  dailyData.forEach(day => {
    if (day?.count && day?.duration) {
      totalEmployeeHours += day.duration;
      totalEmployeeCount += day.count;
    }
  });
  
  if (totalEmployeeCount === 0) return "0 h";
  return ((totalEmployeeHours / 60) / totalEmployeeCount).toFixed(1) + " h";
});

// Generate recommendations based on data
function generateRecommendations(data: any): string[] {
  const recommendations: string[] = [];
  
  // Vérifier le taux de présence moyen
  if (data?.summary) {
    const presenceRate = data.summary.avgEmployeePerDay * 100 / Math.max(1, data.summary.totalEmployees);
    if (presenceRate < 70) {
      recommendations.push("Le taux de présence moyen est inférieur à 70%. Envisagez une analyse des facteurs d'absences et des mesures pour améliorer la présence.");
    }
  }
  
  // Vérifier les tendances
  if (data?.daily && data.daily.length >= 2) {
    const midpoint = Math.floor(data.daily.length / 2);
    const firstHalf = data.daily.slice(0, midpoint);
    const secondHalf = data.daily.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + (day?.duration || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + (day?.duration || 0), 0) / secondHalf.length;
    
    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    if (percentChange < -5) {
      recommendations.push(`Une tendance à la baisse du temps de présence a été détectée (${percentChange.toFixed(1)}%). Il serait utile d'identifier les causes potentielles de cette baisse.`);
    }
  }
  
  // Vérifier les données par groupe
  if (data?.employeeStats) {
    const lowPresenceGroups = data.employeeStats.filter(stat => stat.avgDuration / 60 < 6);
    if (lowPresenceGroups.length > 0) {
      recommendations.push(`${lowPresenceGroups.length} groupe(s) présentent un temps moyen de présence inférieur à 6h. Une attention particulière devrait être portée à: ${lowPresenceGroups.map(g => g.name).join(', ')}.`);
    }
  }
  
  // Recommandation générale si pas de problèmes spécifiques
  if (recommendations.length === 0) {
    recommendations.push("Les indicateurs de présence sont dans les normes attendues. Continuez le suivi régulier pour maintenir cette performance.");
  }
  
  return recommendations;
}

// Sample data for testing
const sampleData = {
  daily: [
    { date: '2025-03-01', count: 15, duration: 7200 },
    { date: '2025-03-02', count: 18, duration: 8100 },
    { date: '2025-03-03', count: 12, duration: 5400 }
  ],
  summary: {
    totalEmployees: 25,
    avgEmployeePerDay: 15,
    totalHours: 345.5
  },
  detailedLogs: [
    { date: '2025-03-01', name: 'John Doe', badge_number: 'B001', groupe: 'Development', first_badge: '09:00', last_badge: '17:30', duration: 510 },
    { date: '2025-03-01', name: 'Jane Smith', badge_number: 'B002', groupe: 'Marketing', first_badge: '08:45', last_badge: '18:00', duration: 555 },
    { date: '2025-03-02', name: 'John Doe', badge_number: 'B001', groupe: 'Development', first_badge: '09:15', last_badge: '17:45', duration: 510 }
  ],
  employeeStats: [
    { name: 'Development', avgDuration: 480 },
    { name: 'Marketing', avgDuration: 540 },
    { name: 'Management', avgDuration: 600 }
  ]
};

export async function GET(req: NextRequest) {
  try {
    // Charger le template HTML
    const templatePath = path.resolve(process.cwd(), 'src/templates/presence-report-template.html');
    const templateContent = fs.existsSync(templatePath) 
      ? fs.readFileSync(templatePath, 'utf8')
      : 'Template introuvable. Veuillez créer le fichier src/templates/presence-report-template.html';
    
    // Compiler le template
    const template = handlebars.compile(templateContent);
    
    // Générer les recommandations
    const recommendations = generateRecommendations(sampleData);
    
    // Préparer les données de contexte pour le template
    const context = {
      data: sampleData,
      dateRange: {
        from: new Date('2025-03-01'),
        to: new Date('2025-03-14')
      },
      options: {
        includeCharts: true,
        includeDetails: true,
        includeRecommendations: true
      },
      recommendations,
      generatedAt: new Date().toISOString()
    };
    
    // Générer le HTML avec les données de contexte
    const html = template(context);
    
    // Renvoyer le HTML directement pour tester
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la génération du HTML de test:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du HTML de test', details: (error as Error).message || 'Erreur inconnue' }, 
      { status: 500 }
    );
  }
} 