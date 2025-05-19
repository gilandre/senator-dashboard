import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

// Define route segment config with proper format
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Récupérer les données du rapport depuis la requête
    const { data, dateRange } = await req.json();
    
    // Générer le contenu CSV pour les données détaillées
    let csvContent = '';
    
    // Si les données détaillées sont disponibles, les exporter
    if (data?.detailedLogs && data.detailedLogs.length > 0) {
      // En-têtes de colonnes
      const headers = [
        'Date',
        'Employé',
        'Badge',
        'Groupe',
        'Entrée',
        'Sortie',
        'Durée (h)'
      ];
      
      // Lignes de données
      const rows = data.detailedLogs.map((log: any) => {
        const date = log.date ? format(new Date(log.date), 'dd/MM/yyyy') : 'N/A';
        const name = log.name || 'N/A';
        const badge = log.badge_number || 'N/A';
        const groupe = log.groupe || 'N/A';
        const firstBadge = log.first_badge || 'N/A';
        const lastBadge = log.last_badge || 'N/A';
        const duration = log.duration ? (log.duration / 60).toFixed(2) : '0';
        
        return [
          date,
          formatCsvField(name),
          badge,
          formatCsvField(groupe),
          firstBadge,
          lastBadge,
          duration
        ];
      });
      
      // Assembler le contenu CSV avec BOM pour Excel
      csvContent = '\ufeff' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    // Sinon, exporter les données quotidiennes si disponibles
    else if (data?.daily && data.daily.length > 0) {
      // En-têtes de colonnes
      const headers = [
        'Date',
        'Nombre d\'employés',
        'Durée totale (h)',
        'Temps moyen par employé (h)'
      ];
      
      // Lignes de données
      const rows = data.daily.map((day: any) => {
        const date = day.date ? format(new Date(day.date), 'dd/MM/yyyy') : 'N/A';
        const count = day.count || 0;
        const durationHours = day.duration ? (day.duration / 60).toFixed(2) : '0';
        const avgHours = count > 0 ? ((day.duration || 0) / 60 / count).toFixed(2) : '0';
        
        return [date, count, durationHours, avgHours];
      });
      
      // Assembler le contenu CSV avec BOM pour Excel
      csvContent = '\ufeff' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    // Si aucune donnée détaillée n'est disponible, exporter le résumé
    else {
      // En-têtes de colonnes
      const headers = [
        'Métrique',
        'Valeur',
        'Description'
      ];
      
      // Calculer les métriques clés
      const avgPresenceRate = data?.summary ? 
        (data.summary.avgEmployeePerDay * 100 / Math.max(1, data.summary.totalEmployees)).toFixed(1) + '%' :
        '0%';
      
      const totalHours = data?.summary?.totalHours ? 
        parseFloat(data.summary.totalHours).toFixed(1) + ' h' :
        '0 h';
      
      // Calculer le temps moyen par employé
      let avgHoursPerEmployee = '0 h';
      if (data?.daily && data.daily.length > 0) {
        let totalEmployeeHours = 0;
        let totalEmployeeCount = 0;
        
        data.daily.forEach((day: any) => {
          if (day?.count && day?.duration) {
            totalEmployeeHours += day.duration;
            totalEmployeeCount += day.count;
          }
        });
        
        if (totalEmployeeCount > 0) {
          avgHoursPerEmployee = ((totalEmployeeHours / 60) / totalEmployeeCount).toFixed(1) + ' h';
        }
      }
      
      // Lignes de données
      const rows = [
        [
          'Taux de présence moyen',
          avgPresenceRate,
          formatCsvField(data?.summary ? `${data.summary.avgEmployeePerDay} employés présents en moyenne sur ${data.summary.totalEmployees} total` : 'Aucune donnée disponible')
        ],
        [
          'Temps total de présence',
          totalHours,
          formatCsvField(`Sur une période de ${data?.daily?.length || 0} jours`)
        ],
        [
          'Temps moyen par employé',
          avgHoursPerEmployee,
          formatCsvField('Moyenne journalière par personne')
        ]
      ];
      
      // Assembler le contenu CSV avec BOM pour Excel
      csvContent = '\ufeff' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    // Renvoyer le contenu CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rapport_presence_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du fichier CSV:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du fichier CSV' }, { status: 500 });
  }
}

// Fonction utilitaire pour formater les champs CSV
function formatCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Échapper les guillemets en les doublant et entourer de guillemets
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
} 