import React from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  FileDigit, 
  Database, 
  Layout, 
  Users, 
  Key, 
  BookOpen,
  Calendar,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Configuration | SenatorFX",
  description: "Paramètres de l&apos;application",
};

export default function SettingsPage() {
  const settingsSections = [
    {
      title: "Gestion des utilisateurs",
      description: "Gérer les utilisateurs de l&apos;application SenatorFX",
      icon: <User className="h-8 w-8 text-blue-500" />,
      href: "/settings/users",
    },
    {
      title: "Contrôle d'accès",
      description: "Gérer les profils, rôles et permissions d'accès au système",
      icon: <Lock className="h-8 w-8 text-purple-500" />,
      href: "/settings/access-control",
      isNew: true,
    },
    {
      title: "Sécurité",
      description: "Paramètres de sécurité et authentification",
      icon: <Shield className="h-8 w-8 text-red-500" />,
      href: "/settings/security",
    },
    {
      title: "Gestion du temps & présences",
      description: "Configurer les horaires, pauses, jours fériés, règles de présence et calcul du temps de travail",
      icon: <Calendar className="h-8 w-8 text-orange-500" />,
      href: "/settings/work-calendar",
    },
    {
      title: "Audit",
      description: "Journal d&apos;audit et traces de l&apos;application",
      icon: <FileDigit className="h-8 w-8 text-yellow-500" />,
      href: "/settings/audit",
    },
    {
      title: "Données de référence",
      description: "Gérer les libellés et valeurs de référence",
      icon: <Database className="h-8 w-8 text-purple-500" />,
      href: "/settings/reference-data",
    },
    {
      title: "Interface",
      description: "Personnalisation de l&apos;interface utilisateur",
      icon: <Layout className="h-8 w-8 text-pink-500" />,
      href: "/settings/interface",
    },
    {
      title: "Documentation",
      description: "Accéder à la documentation du système",
      icon: <BookOpen className="h-8 w-8 text-gray-500" />,
      href: "/settings/documentation",
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuration</h1>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Réinitialiser les paramètres
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsSections.map((section, index) => (
          <Link 
            key={index}
            href={section.href}
            className={`block border ${section.isNew ? 'border-purple-300 dark:border-purple-800 ring-2 ring-purple-300 dark:ring-purple-800' : 'border-gray-200 dark:border-gray-800'} rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors relative`}
          >
            {section.isNew && (
              <span className="absolute top-3 right-3 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium py-1 px-2 rounded">
                Nouveau
              </span>
            )}
            <div className="flex items-start mb-4">
              <div className="mr-4">
                {section.icon}
              </div>
              <div>
                <h3 className="text-lg font-medium">{section.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Configurer
            </Button>
          </Link>
        ))}
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start">
          <div className="mr-4">
            <Settings className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-700 dark:text-blue-400">Version du système</h3>
            <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">
              SenatorFX v1.2.4 - Dernière mise à jour: 15/06/2023
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              Licence: Enterprise - Valide jusqu&apos;au 31/12/2023
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 