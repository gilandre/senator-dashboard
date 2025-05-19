'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, UserCog, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface Employee {
  id: number;
  badge_number: string;
  employee_id: string | null;
  first_name: string;
  lastName: string;  // Pour compatibilité
  last_name: string;
  firstName: string; // Pour compatibilité
  email: string | null;
  department: string | null;
  department_id: number | null;
  position: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  dept: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  isSharedBadge?: boolean;
  badgeHistory?: Employee[];
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeData();
  }, [params.id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/employees/${params.id}`);
      setEmployee(response.data);
      
      // Vérifier si le badge est partagé entre plusieurs employés
      if (response.data.badge_number) {
        const badgeResponse = await axios.get(`/api/employees?badge=${response.data.badge_number}`);
        if (badgeResponse.data.badgeHistories && badgeResponse.data.badgeHistories.length > 0) {
          const badgeInfo = badgeResponse.data.badgeHistories.find(
            (bh: any) => bh.badge_number === response.data.badge_number
          );
          
          if (badgeInfo && badgeInfo.isShared) {
            setEmployee({
              ...response.data,
              isSharedBadge: true,
              badgeHistory: badgeInfo.history
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les données de l'employé",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" } = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive"
    };

    const labels: { [key: string]: string } = {
      active: "Actif",
      inactive: "Inactif",
      suspended: "Suspendu"
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-muted-foreground mb-4">Employé non trouvé</p>
        <Button onClick={() => router.push('/employees')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">
            {employee.first_name} {employee.last_name}
          </h1>
          {renderStatusBadge(employee.status)}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/attendance?badge=${employee.badge_number}`)}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Voir les présences
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Informations de base de l'employé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom complet</p>
                <p className="font-medium">{employee.first_name} {employee.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Numéro de badge</p>
                <div className="font-medium">
                  {employee.badge_number}
                  {employee.isSharedBadge && (
                    <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                      Badge partagé
                    </Badge>
                  )}
                </div>
                {employee.isSharedBadge && employee.badgeHistory && employee.badgeHistory.length > 1 && (
                  <div className="mt-1 text-xs text-amber-600">
                    Badge utilisé par {employee.badgeHistory.length} personnes
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ID Employé</p>
                <p className="font-medium">{employee.employee_id || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Groupe</p>
                <p className="font-medium">{employee.dept?.name || employee.department || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date de création</p>
                <p className="font-medium">
                  {employee.created_at 
                    ? format(new Date(employee.created_at), 'dd MMMM yyyy', { locale: fr }) 
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
                <p className="font-medium">
                  {employee.updated_at 
                    ? format(new Date(employee.updated_at), 'dd MMMM yyyy', { locale: fr }) 
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Statistiques de présence</CardTitle>
            <CardDescription>
              Résumé des présences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">
              Consultez le rapport de présence pour plus de détails.
            </p>
            <Button 
              className="w-full mt-4" 
              onClick={() => router.push(`/attendance?badge=${employee.badge_number}`)}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Voir les présences
            </Button>
          </CardContent>
        </Card>

        {/* Utilisateurs du badge */}
        {employee.isSharedBadge && employee.badgeHistory && employee.badgeHistory.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs du badge</CardTitle>
              <CardDescription>
                Personnes partageant ce numéro de badge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {employee.badgeHistory.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(user.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={user.status === 'active' ? "default" : "secondary"}>
                      {user.status === 'active' ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Toaster />
    </div>
  );
} 