'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReportTemplate, { 
  BarChartComponent, 
  PieChartComponent, 
  LineChartComponent,
  TableComponent 
} from './ReportTemplate';

// Données fictives pour le rapport de présence journalier
const entryTimeDistributionData = [
  { name: '7:00', value: 12 },
  { name: '8:00', value: 45 },
  { name: '8:30', value: 68 },
  { name: '9:00', value: 24 },
  { name: '9:30', value: 13 },
  { name: '10:00', value: 8 },
  { name: 'Autres', value: 5 },
];

const exitTimeDistributionData = [
  { name: '16:00', value: 9 },
  { name: '16:30', value: 14 },
  { name: '17:00', value: 32 },
  { name: '17:30', value: 43 },
  { name: '18:00', value: 38 },
  { name: '18:30', value: 21 },
  { name: '19:00', value: 12 },
  { name: 'Autres', value: 6 },
];

const departmentPresenceData = [
  { name: 'IT', value: 96 },
  { name: 'Finance', value: 92 },
  { name: 'RH', value: 88 },
  { name: 'Marketing', value: 94 },
  { name: 'Direction', value: 90 },
  { name: 'Juridique', value: 85 },
  { name: 'R&D', value: 93 },
];

const presenceStatusData = [
  { name: 'À l\'heure', value: 125 },
  { name: 'En retard', value: 18 },
  { name: 'Sortie anticipée', value: 12 },
  { name: 'Absent', value: 8 },
  { name: 'Jour férié/Congé', value: 2 },
];

const employeePresenceTableColumns = [
  { key: 'employee', header: 'Employé' },
  { key: 'department', header: 'Département' },
  { key: 'entryTime', header: 'Heure d\'arrivée' },
  { key: 'exitTime', header: 'Heure de départ' },
  { key: 'duration', header: 'Durée de présence' },
  { key: 'status', header: 'Statut' },
];

const employeePresenceData = [
  { employee: 'Jean Dupont', department: 'IT', entryTime: '08:32', exitTime: '17:45', duration: '8h13', status: 'À l\'heure' },
  { employee: 'Marie Lambert', department: 'Finance', entryTime: '08:15', exitTime: '18:05', duration: '9h50', status: 'À l\'heure' },
  { employee: 'Thomas Bernard', department: 'Marketing', entryTime: '09:10', exitTime: '17:30', duration: '8h20', status: 'En retard' },
  { employee: 'Sophie Martin', department: 'RH', entryTime: '08:05', exitTime: '16:45', duration: '8h40', status: 'À l\'heure' },
  { employee: 'Lucas Petit', department: 'IT', entryTime: '08:45', exitTime: '18:15', duration: '9h30', status: 'À l\'heure' },
  { employee: 'Camille Durand', department: 'Juridique', entryTime: '09:25', exitTime: '17:15', duration: '7h50', status: 'En retard' },
  { employee: 'Pierre Leroy', department: 'Direction', entryTime: '08:30', exitTime: '19:05', duration: '10h35', status: 'À l\'heure' },
  { employee: 'Emma Richard', department: 'IT', entryTime: '08:10', exitTime: '16:30', duration: '8h20', status: 'Sortie anticipée' },
  { employee: 'Nicolas Moreau', department: 'R&D', entryTime: '08:20', exitTime: '17:55', duration: '9h35', status: 'À l\'heure' },
  { employee: 'Julie Fournier', department: 'Finance', entryTime: '08:55', exitTime: '18:10', duration: '9h15', status: 'À l\'heure' },
];

const anomaliesTableColumns = [
  { key: 'timestamp', header: 'Heure' },
  { key: 'employee', header: 'Employé' },
  { key: 'department', header: 'Département' },
  { key: 'issue', header: 'Problème' },
  { key: 'status', header: 'Statut' },
];

const anomaliesData = [
  { timestamp: '08:45', employee: 'Michel Roux', department: 'Marketing', issue: 'Badge non reconnu', status: 'Résolu' },
  { timestamp: '09:12', employee: 'Léa Blanc', department: 'RH', issue: 'Tentatives multiples', status: 'Résolu' },
  { timestamp: '10:30', employee: 'François Lefebvre', department: 'IT', issue: 'Accès refusé à la salle serveurs', status: 'En cours' },
  { timestamp: '12:05', employee: 'Mathilde Girard', department: 'Juridique', issue: 'Oubli de badge de sortie', status: 'Résolu' },
  { timestamp: '14:25', employee: 'Alexandre Simon', department: 'Finance', issue: 'Badge utilisé pendant absence', status: 'En investigation' },
];

interface DailyPresenceReportProps {
  date?: Date;
  department?: string;
}

const DailyPresenceReport: React.FC<DailyPresenceReportProps> = ({
  date = new Date(),
  department
}) => {
  // Titre et description du rapport
  let title = 'Rapport de Présence Journalier';
  let subtitle = 'Analyse détaillée des heures de présence et statistiques';
  
  // Ajouter le département au titre si spécifié
  if (department) {
    subtitle = `${subtitle} - Département ${department}`;
  }

  return (
    <ReportTemplate
      title={title}
      subtitle={subtitle}
      dateStart={date}
      dateEnd={date}
      department={department}
      authors={['Système de Gestion SENATOR']}
      logoUrl="/logo.png"
    >
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Synthèse de la journée</h2>
        <p className="mb-4">
          Ce rapport présente une analyse détaillée des temps de présence pour la journée du {format(date, 'dd MMMM yyyy', { locale: fr })}.
          {department ? ` Les données présentées concernent spécifiquement le département ${department}.` : ' Les données couvrent l\'ensemble des départements de l\'entreprise.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Employés présents</h3>
            <p className="text-3xl font-bold">165</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Temps moyen</h3>
            <p className="text-3xl font-bold">8h42</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Taux de présence</h3>
            <p className="text-3xl font-bold">94%</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Anomalies</h3>
            <p className="text-3xl font-bold">5</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Distribution des Heures</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartComponent
            title="Heures d'arrivée"
            description="Distribution des heures d'arrivée des employés"
            data={entryTimeDistributionData}
          />
          <BarChartComponent
            title="Heures de départ"
            description="Distribution des heures de départ des employés"
            data={exitTimeDistributionData}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Présence par Département</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartComponent
            title="Taux de présence par département"
            description="Pourcentage d'employés présents par département"
            data={departmentPresenceData}
          />
          <PieChartComponent
            title="Statuts de présence"
            description="Répartition des statuts de présence des employés"
            data={presenceStatusData}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Détails des Présences</h2>
        <TableComponent
          title="Journal de présence des employés"
          description="Heures d'arrivée, départ et durée de présence par employé"
          columns={employeePresenceTableColumns}
          data={employeePresenceData}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Anomalies Détectées</h2>
        <TableComponent
          title="Problèmes et incidents"
          description="Liste des anomalies liées à la présence détectées aujourd'hui"
          columns={anomaliesTableColumns}
          data={anomaliesData}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Analyse et Recommandations</h2>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="mb-2">Sur la base des données de présence analysées pour cette journée :</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Le taux de présence global est de 94%, ce qui est conforme aux objectifs de l'entreprise.</li>
            <li>Les arrivées sont principalement concentrées entre 8h00 et 9h00, avec un pic notable à 8h30.</li>
            <li>18 employés sont arrivés en retard (après 9h00), principalement des départements Marketing et Juridique.</li>
            <li>Le département IT présente le meilleur taux de présence (96%), suivi de près par le Marketing (94%).</li>
            <li>5 anomalies ont été détectées, dont 3 ont été résolues et 2 sont encore en cours de traitement.</li>
          </ul>
          <p className="font-medium">Recommandations :</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Organiser une sensibilisation sur les horaires d'arrivée pour les départements Marketing et Juridique.</li>
            <li>Examiner les raisons des sorties anticipées qui ont augmenté de 15% par rapport à la moyenne mensuelle.</li>
            <li>Réviser le processus de gestion des anomalies pour améliorer le temps de résolution.</li>
          </ul>
        </div>
      </section>
    </ReportTemplate>
  );
};

export default DailyPresenceReport; 