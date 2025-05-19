import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';

// Types pour les données du rapport
interface PresencePdfReportProps {
  data: any;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  options: {
    includeCharts: boolean;
    includeDetails: boolean;
    includeRecommendations: boolean;
  };
}

// Couleurs pour les graphiques
const COLORS = ['#007B65', '#3B82F6', '#F07B31', '#28AE60', '#F2C335'];

export function PresencePdfReport({ data, dateRange, options }: PresencePdfReportProps) {
  // Styles pour le format PDF A4
  const styles = {
    page: {
      width: '210mm',
      minHeight: '297mm',
      padding: '15mm',
      margin: '0 auto',
      backgroundColor: 'white',
      boxSizing: 'border-box' as const,
      fontFamily: 'system-ui, sans-serif',
      color: '#333',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '20px',
      pageBreakAfter: 'avoid' as const,
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#007B65', // Couleur primaire de Senator InvesTech
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#666',
      marginTop: '5px',
    },
    section: {
      marginBottom: '25px',
      pageBreakInside: 'avoid' as const,
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '15px',
      borderBottom: '1px solid #ddd',
      paddingBottom: '5px',
      color: '#007B65',
      pageBreakAfter: 'avoid' as const,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '15px',
      marginBottom: '20px',
    },
    card: {
      border: '1px solid #ddd',
      borderRadius: '5px',
      padding: '15px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    cardTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#555',
    },
    cardValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#007B65',
    },
    cardDescription: {
      fontSize: '12px',
      color: '#666',
      marginTop: '5px',
    },
    chartContainer: {
      height: '300px',
      marginBottom: '20px',
      pageBreakInside: 'avoid' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '12px',
      marginBottom: '20px',
    },
    tableHeader: {
      backgroundColor: '#f5f5f5',
    },
    tableHeaderCell: {
      border: '1px solid #ddd',
      padding: '8px',
      textAlign: 'left' as const,
      fontWeight: 'bold',
    },
    tableCell: {
      border: '1px solid #ddd',
      padding: '8px',
      textAlign: 'left' as const,
    },
    recommendations: {
      backgroundColor: '#f9f9f9',
      padding: '15px',
      borderRadius: '5px',
      marginTop: '20px',
      marginBottom: '20px',
      border: '1px solid #eee',
    },
    recommendationTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#007B65',
    },
    recommendationItem: {
      marginBottom: '8px',
      lineHeight: '1.5',
    },
    pageBreak: {
      pageBreakBefore: 'always' as const,
      height: '1px',
    },
    footer: {
      marginTop: '30px',
      fontSize: '10px',
      color: '#999',
      textAlign: 'center' as const,
      borderTop: '1px solid #ddd',
      paddingTop: '10px',
      position: 'absolute' as const,
      bottom: '15mm',
      left: '15mm',
      right: '15mm',
    },
  };

  // Fonctions utilitaires pour les calculs
  function calculateAverageHoursPerEmployee() {
    if (!data?.daily || data.daily.length === 0) return "0 h";
    
    let totalEmployeeHours = 0;
    let totalEmployeeCount = 0;
    
    data.daily.forEach(day => {
      if (day?.count && day?.duration) {
        totalEmployeeHours += day.duration;
        totalEmployeeCount += day.count;
      }
    });
    
    if (totalEmployeeCount === 0) return "0 h";
    return ((totalEmployeeHours / 60) / totalEmployeeCount).toFixed(1) + " h";
  }

  function calculateTrend() {
    if (!data?.daily || data.daily.length < 2) return "Données insuffisantes pour analyser la tendance";
    
    const midpoint = Math.floor(data.daily.length / 2);
    const firstHalf = data.daily.slice(0, midpoint);
    const secondHalf = data.daily.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + (day?.duration || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + (day?.duration || 0), 0) / secondHalf.length;
    
    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    if (Math.abs(percentChange) < 5) {
      return "Tendance stable sur la période";
    } else if (percentChange > 0) {
      return `Tendance à la hausse (+${percentChange.toFixed(1)}%)`;
    } else {
      return `Tendance à la baisse (${percentChange.toFixed(1)}%)`;
    }
  }

  // Préparation des données pour les graphiques
  const dailyChartData = data?.daily?.map(day => ({
    date: format(new Date(day.date), 'dd/MM'),
    heures: parseFloat((day.duration / 60).toFixed(1)),
    employes: day.count
  })) || [];

  const groupChartData = data?.employeeStats?.map(stat => ({
    name: stat.name || 'Inconnu',
    value: parseFloat((stat.avgDuration / 60).toFixed(1))
  })) || [];

  // Génération des recommandations basées sur les données
  function generateRecommendations() {
    const recommendations: string[] = [];
    
    // Vérifier le taux de présence moyen
    if (data?.summary) {
      const presenceRate = data.summary.avgEmployeePerDay * 100 / Math.max(1, data.summary.totalEmployees);
      if (presenceRate < 70) {
        recommendations.push("Le taux de présence moyen est inférieur à 70%. Envisagez une analyse des facteurs d'absences et des mesures pour améliorer la présence.");
      }
    }
    
    // Vérifier les tendances
    const trend = calculateTrend();
    if (trend.includes('baisse')) {
      recommendations.push("Une tendance à la baisse du temps de présence a été détectée. Il serait utile d'identifier les causes potentielles de cette baisse.");
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

  return (
    <div style={styles.page}>
      {/* En-tête du rapport */}
      <div style={styles.header}>
        <div style={styles.title}>Rapport de Temps de Présence</div>
        <div style={styles.subtitle}>
          {dateRange.from && dateRange.to ? 
            `Période du ${format(dateRange.from, 'dd MMMM yyyy', { locale: fr })} au ${format(dateRange.to, 'dd MMMM yyyy', { locale: fr })}` : 
            'Période complète'}
        </div>
      </div>

      {/* Résumé des statistiques */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Vue d'ensemble</div>
        <div style={styles.grid}>
          {/* Carte 1: Taux de présence moyen */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Taux de présence moyen</div>
            <div style={styles.cardValue}>
              {data?.summary ? 
                `${(data.summary.avgEmployeePerDay * 100 / Math.max(1, data.summary.totalEmployees)).toFixed(1)}%` : 
                "0%"}
            </div>
            <div style={styles.cardDescription}>
              {data?.summary ? 
                `${data.summary.avgEmployeePerDay} employés présents en moyenne sur ${data.summary.totalEmployees} total` : 
                "Aucune donnée disponible"}
            </div>
          </div>

          {/* Carte 2: Temps total de présence */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Temps total de présence</div>
            <div style={styles.cardValue}>
              {data?.summary && data.summary.totalHours > 0 ? 
                `${data.summary.totalHours.toFixed(1)} h` : 
                "0 h"}
            </div>
            <div style={styles.cardDescription}>
              Sur une période de {data?.daily ? data.daily.length : 0} jours
            </div>
          </div>

          {/* Carte 3: Temps moyen par employé */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Temps moyen par employé</div>
            <div style={styles.cardValue}>
              {calculateAverageHoursPerEmployee()}
            </div>
            <div style={styles.cardDescription}>
              Moyenne journalière par personne
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques - insérer un saut de page si nécessaire */}
      {options.includeCharts && dailyChartData.length > 0 && (
        <>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Distribution du temps par jour</div>
            <div style={styles.chartContainer} id="dailyChart">
              {/* Ce div sera remplacé par une image du graphique lors de la génération */}
              <div className="chart-placeholder" data-chart-id="dailyChart" data-chart-type="bar">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" stroke="#007B65" />
                    <YAxis yAxisId="right" orientation="right" stroke="#3B82F6" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="heures" fill="#007B65" name="Heures de présence" />
                    <Bar yAxisId="right" dataKey="employes" fill="#3B82F6" name="Nombre d'employés" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Insérer un saut de page si on a beaucoup de données et aussi le graphique par groupe */}
          {(dailyChartData.length > 14 || groupChartData.length > 0) && <div style={styles.pageBreak}></div>}

          {/* Graphique de répartition par groupe */}
          {groupChartData.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Présence par groupe</div>
              <div style={styles.chartContainer} id="groupChart">
                {/* Ce div sera remplacé par une image du graphique lors de la génération */}
                <div className="chart-placeholder" data-chart-id="groupChart" data-chart-type="pie">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={groupChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({name, value}) => `${name}: ${value}h`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {groupChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} heures`, 'Temps moyen']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tableau détaillé - commencer sur une nouvelle page */}
      {options.includeDetails && data?.detailedLogs && data.detailedLogs.length > 0 && (
        <>
          <div style={styles.pageBreak}></div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Détails des présences</div>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Date</th>
                  <th style={styles.tableHeaderCell}>Employé</th>
                  <th style={styles.tableHeaderCell}>Badge</th>
                  <th style={styles.tableHeaderCell}>Groupe</th>
                  <th style={styles.tableHeaderCell}>Entrée</th>
                  <th style={styles.tableHeaderCell}>Sortie</th>
                  <th style={styles.tableHeaderCell}>Durée (h)</th>
                </tr>
              </thead>
              <tbody>
                {/* Limiter à 20 lignes par page */}
                {data.detailedLogs.slice(0, 20).map((log, index) => (
                  <tr key={index}>
                    <td style={styles.tableCell}>{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                    <td style={styles.tableCell}>{log.name || 'N/A'}</td>
                    <td style={styles.tableCell}>{log.badge_number || 'N/A'}</td>
                    <td style={styles.tableCell}>{log.groupe || 'N/A'}</td>
                    <td style={styles.tableCell}>{log.first_badge || 'N/A'}</td>
                    <td style={styles.tableCell}>{log.last_badge || 'N/A'}</td>
                    <td style={styles.tableCell}>{(log.duration / 60).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Si plus de 20 enregistrements, afficher un message et continuer sur la page suivante */}
            {data.detailedLogs.length > 20 && (
              <>
                <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '10px', textAlign: 'center' as const }}>
                  Suite du tableau sur la page suivante ({data.detailedLogs.length - 20} enregistrements supplémentaires)
                </div>
                
                <div style={styles.pageBreak}></div>
                <div style={styles.sectionTitle}>Détails des présences (suite)</div>
                
                <table style={styles.table}>
                  <thead style={styles.tableHeader}>
                    <tr>
                      <th style={styles.tableHeaderCell}>Date</th>
                      <th style={styles.tableHeaderCell}>Employé</th>
                      <th style={styles.tableHeaderCell}>Badge</th>
                      <th style={styles.tableHeaderCell}>Groupe</th>
                      <th style={styles.tableHeaderCell}>Entrée</th>
                      <th style={styles.tableHeaderCell}>Sortie</th>
                      <th style={styles.tableHeaderCell}>Durée (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detailedLogs.slice(20, 50).map((log, index) => (
                      <tr key={index + 20}>
                        <td style={styles.tableCell}>{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                        <td style={styles.tableCell}>{log.name || 'N/A'}</td>
                        <td style={styles.tableCell}>{log.badge_number || 'N/A'}</td>
                        <td style={styles.tableCell}>{log.groupe || 'N/A'}</td>
                        <td style={styles.tableCell}>{log.first_badge || 'N/A'}</td>
                        <td style={styles.tableCell}>{log.last_badge || 'N/A'}</td>
                        <td style={styles.tableCell}>{(log.duration / 60).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {data.detailedLogs.length > 50 && (
                  <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '10px', textAlign: 'center' as const }}>
                    {data.detailedLogs.length - 50} enregistrements supplémentaires non affichés dans ce rapport.
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Recommandations - sur une nouvelle page si nécessaire */}
      {options.includeRecommendations && (
        <>
          {(options.includeDetails && data?.detailedLogs?.length > 0) && <div style={styles.pageBreak}></div>}
          
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Recommandations</div>
            <div style={styles.recommendations}>
              <div style={styles.recommendationTitle}>Analyse et suggestions</div>
              <ul>
                {generateRecommendations().map((rec, index) => (
                  <li key={index} style={styles.recommendationItem}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Pied de page */}
      <div style={styles.footer}>
        <div>
          Rapport généré le {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}
        </div>
        <div>
          Senator InvesTech © {new Date().getFullYear()} - Tous droits réservés
        </div>
      </div>
    </div>
  );
} 