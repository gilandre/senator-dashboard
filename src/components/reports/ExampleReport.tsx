'use client';

import React from 'react';
import { subDays } from 'date-fns';
import ReportTemplate, { 
  BarChartComponent, 
  PieChartComponent, 
  LineChartComponent,
  TableComponent 
} from './ReportTemplate';

// Données d'exemple pour un rapport d'analyse d'accès
const accessByHourData = [
  { name: '7:00', value: 35 },
  { name: '8:00', value: 126 },
  { name: '9:00', value: 68 },
  { name: '10:00', value: 42 },
  { name: '11:00', value: 36 },
  { name: '12:00', value: 57 },
  { name: '13:00', value: 65 },
  { name: '14:00', value: 39 },
  { name: '15:00', value: 32 },
  { name: '16:00', value: 41 },
  { name: '17:00', value: 117 },
  { name: '18:00', value: 58 },
];

const departmentAccessData = [
  { name: 'IT', value: 85 },
  { name: 'Finance', value: 47 },
  { name: 'RH', value: 38 },
  { name: 'Marketing', value: 42 },
  { name: 'Direction', value: 26 },
  { name: 'Juridique', value: 19 },
  { name: 'R&D', value: 67 },
];

const accessPointsData = [
  { name: 'Entrée Principale', value: 145 },
  { name: 'Entrée Secondaire', value: 98 },
  { name: 'Parking', value: 124 },
  { name: 'Salle Serveurs', value: 43 },
  { name: 'Étage Direction', value: 32 },
  { name: 'Zone Sécurisée', value: 17 },
];

const weeklyTrendsData = [
  { name: 'Lun', value: 312 },
  { name: 'Mar', value: 298 },
  { name: 'Mer', value: 285 },
  { name: 'Jeu', value: 306 },
  { name: 'Ven', value: 278 },
  { name: 'Sam', value: 96 },
  { name: 'Dim', value: 52 },
];

const unusualActivitiesData = [
  { timestamp: '08:27', user: 'Jean Dupont', department: 'IT', location: 'Salle Serveurs', type: 'Accès hors horaires', severity: 'Moyenne' },
  { timestamp: '10:15', user: 'Marie Lambert', department: 'Finance', location: 'Zone Sécurisée', type: 'Accès non autorisé', severity: 'Haute' },
  { timestamp: '12:36', user: 'Thomas Bernard', department: 'Marketing', location: 'Étage Direction', type: 'Badge inhabituel', severity: 'Basse' },
  { timestamp: '14:22', user: 'Sophie Martin', department: 'RH', location: 'Archives', type: 'Multiples tentatives', severity: 'Moyenne' },
  { timestamp: '15:47', user: 'Lucas Petit', department: 'IT', location: 'Salle Serveurs', type: 'Accès répétés', severity: 'Basse' },
  { timestamp: '17:03', user: 'Camille Durand', department: 'Juridique', location: 'Zone Sécurisée', type: 'Accès non autorisé', severity: 'Haute' },
];

const unusualActivitiesColumns = [
  { key: 'timestamp', header: 'Heure' },
  { key: 'user', header: 'Utilisateur' },
  { key: 'department', header: 'Département' },
  { key: 'location', header: 'Localisation' },
  { key: 'type', header: 'Type d\'anomalie' },
  { key: 'severity', header: 'Sévérité' },
];

const recentAccessData = [
  { timestamp: '08:03', user: 'Emma Blanchard', department: 'IT', location: 'Entrée Principale', action: 'Entrée' },
  { timestamp: '08:12', user: 'Antoine Richard', department: 'Finance', location: 'Entrée Principale', action: 'Entrée' },
  { timestamp: '08:14', user: 'Julie Martin', department: 'RH', location: 'Entrée Secondaire', action: 'Entrée' },
  { timestamp: '08:17', user: 'Thomas Klein', department: 'Marketing', location: 'Parking', action: 'Entrée' },
  { timestamp: '08:22', user: 'Léa Robert', department: 'Direction', location: 'Entrée Principale', action: 'Entrée' },
  { timestamp: '08:26', user: 'Hugo Dubois', department: 'R&D', location: 'Entrée Principale', action: 'Entrée' },
  { timestamp: '08:31', user: 'Sarah Leroy', department: 'IT', location: 'Entrée Secondaire', action: 'Entrée' },
  { timestamp: '08:35', user: 'Matthieu Fournier', department: 'Juridique', location: 'Parking', action: 'Entrée' },
  { timestamp: '08:38', user: 'Chloé Vincent', department: 'Finance', location: 'Entrée Principale', action: 'Entrée' },
  { timestamp: '08:42', user: 'Noah Girard', department: 'IT', location: 'Entrée Principale', action: 'Entrée' },
];

const accessLogColumns = [
  { key: 'timestamp', header: 'Heure' },
  { key: 'user', header: 'Utilisateur' },
  { key: 'department', header: 'Département' },
  { key: 'location', header: 'Localisation' },
  { key: 'action', header: 'Action' },
];

interface ExampleReportProps {
  reportType?: 'daily' | 'weekly' | 'monthly';
  department?: string;
}

const ExampleReport: React.FC<ExampleReportProps> = ({ 
  reportType = 'daily',
  department 
}) => {
  // Définir les dates de début et de fin selon le type de rapport
  let dateStart, dateEnd, title, subtitle;
  const today = new Date();
  
  switch (reportType) {
    case 'weekly':
      dateStart = subDays(today, 7);
      dateEnd = today;
      title = 'Analyse Hebdomadaire des Accès';
      subtitle = 'Synthèse des modèles d\'accès et anomalies détectées';
      break;
    case 'monthly':
      dateStart = new Date(today.getFullYear(), today.getMonth(), 1);
      dateEnd = today;
      title = 'Analyse Mensuelle des Accès';
      subtitle = 'Évaluation des tendances d\'accès et incidents de sécurité';
      break;
    default: // daily
      dateStart = today;
      dateEnd = today;
      title = 'Analyse Quotidienne des Accès';
      subtitle = 'Surveillance des accès et anomalies du jour';
  }
  
  // Ajouter le département au titre si spécifié
  if (department) {
    subtitle = `${subtitle} - Département ${department}`;
  }

  return (
    <ReportTemplate
      title={title}
      subtitle={subtitle}
      dateStart={dateStart}
      dateEnd={dateEnd}
      department={department}
      authors={['Système de Sécurité SENATOR']}
      logoUrl="/logo.png"
    >
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Synthèse</h2>
        <p className="mb-4">
          Ce rapport présente une analyse des modèles d'accès{' '}
          {reportType === 'daily' ? 'de la journée' : reportType === 'weekly' ? 'de la semaine' : 'du mois'}{' '}
          {department ? `pour le département ${department}` : 'pour l\'ensemble de l\'entreprise'}.
          Les données couvrent la période du {dateStart.toLocaleDateString('fr-FR')} au {dateEnd.toLocaleDateString('fr-FR')}.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Total des accès</h3>
            <p className="text-3xl font-bold">728</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Points d'accès actifs</h3>
            <p className="text-3xl font-bold">12</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Anomalies détectées</h3>
            <p className="text-3xl font-bold">6</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Distribution des Accès</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartComponent
            title="Accès par heure"
            description="Distribution du nombre d'événements d'accès par heure"
            data={accessByHourData}
          />
          <PieChartComponent
            title="Accès par département"
            description="Répartition des accès entre les départements"
            data={departmentAccessData}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Analyse des Points d'Accès</h2>
        <div className="grid grid-cols-1 gap-6">
          <BarChartComponent
            title="Utilisation des points d'accès"
            description="Fréquence d'utilisation des différents points d'accès"
            data={accessPointsData}
          />
        </div>
      </section>
      
      {reportType !== 'daily' && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Tendances d'Accès</h2>
          <LineChartComponent
            title="Évolution des accès"
            description={reportType === 'weekly' ? 'Nombre d\'accès par jour de la semaine' : 'Évolution des accès sur le mois'}
            data={weeklyTrendsData}
          />
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Anomalies et Alertes de Sécurité</h2>
        <TableComponent
          title="Activités inhabituelles détectées"
          description="Liste des comportements d'accès suspects ou anormaux"
          columns={unusualActivitiesColumns}
          data={unusualActivitiesData}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Journal des Accès Récents</h2>
        <TableComponent
          title="Derniers accès enregistrés"
          description="10 événements d'accès les plus récents"
          columns={accessLogColumns}
          data={recentAccessData}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recommandations</h2>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="mb-2">Basées sur l'analyse des données d'accès de cette période, les recommandations suivantes sont proposées :</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Renforcer la surveillance aux heures de pointe (8h-9h et 17h-18h)</li>
            <li>Vérifier les autorisations des badges du département IT pour la salle serveurs</li>
            <li>Effectuer une revue des permissions d'accès aux zones sécurisées</li>
            <li>Mettre en place une procédure d'alerte pour les accès répétés aux zones sensibles</li>
            <li>Former le personnel de sécurité à la détection des comportements suspects</li>
          </ul>
          <p className="font-medium mt-4">Niveau d'alerte global: <span className="text-amber-600 dark:text-amber-400">Moyen</span></p>
        </div>
      </section>
    </ReportTemplate>
  );
};

export default ExampleReport; 