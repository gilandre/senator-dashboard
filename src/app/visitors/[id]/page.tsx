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

interface Visitor {
  id: number;
  badge_number: string;
  first_name: string;
  lastName: string;  // Pour compatibilité
  last_name: string;
  firstName: string; // Pour compatibilité
  company: string;
  reason: string | null;
  status: 'active' | 'inactive';
  access_count: number;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  isSharedBadge?: boolean;
  badgeHistory?: Visitor[];
}

export default function VisitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitorData();
  }, [params.id]);

  const fetchVisitorData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/visitors/${params.id}`);
      setVisitor(response.data);
      
      // Vérifier si le badge est partagé entre plusieurs visiteurs
      if (response.data.badge_number) {
        const badgeResponse = await axios.get(`/api/visitors?badge=${response.data.badge_number}`);
        if (badgeResponse.data.badgeHistories && badgeResponse.data.badgeHistories.length > 0) {
          const badgeInfo = badgeResponse.data.badgeHistories.find(
            (bh: any) => bh.badge_number === response.data.badge_number
          );
          
          if (badgeInfo && badgeInfo.isShared) {
            setVisitor({
              ...response.data,
              isSharedBadge: true,
              badgeHistory: badgeInfo.history
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching visitor data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les données du visiteur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" } = {
      active: "default",
      inactive: "secondary"
    };

    const labels: { [key: string]: string } = {
      active: "Actif",
      inactive: "Inactif"
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

  if (!visitor) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-muted-foreground mb-4">Visiteur non trouvé</p>
        <Button onClick={() => router.push('/visitors')} variant="outline">
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
          <Button variant="ghost" size="sm" onClick={() => router.push('/visitors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">
            {visitor.first_name} {visitor.last_name}
          </h1>
          {renderStatusBadge(visitor.status)}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/attendance?badge=${visitor.badge_number}`)}
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
              Informations de base du visiteur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom complet</p>
                <p className="font-medium">{visitor.first_name} {visitor.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Numéro de badge</p>
                <div className="font-medium">
                  {visitor.badge_number}
                  {visitor.isSharedBadge && (
                    <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                      Badge partagé
                    </Badge>
                  )}
                </div>
                {visitor.isSharedBadge && visitor.badgeHistory && visitor.badgeHistory.length > 1 && (
                  <div className="mt-1 text-xs text-amber-600">
                    Badge utilisé par {visitor.badgeHistory.length} personnes
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Société</p>
                <p className="font-medium">{visitor.company || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Motif de visite</p>
                <p className="font-medium">{visitor.reason || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Première visite</p>
                <p className="font-medium">
                  {visitor.first_seen 
                    ? format(new Date(visitor.first_seen), 'dd MMMM yyyy', { locale: fr }) 
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dernière visite</p>
                <p className="font-medium">
                  {visitor.last_seen 
                    ? format(new Date(visitor.last_seen), 'dd MMMM yyyy', { locale: fr }) 
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Statistiques de visites</CardTitle>
            <CardDescription>
              Résumé des visites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nombre de visites:</span>
              <span className="font-medium">{visitor.access_count || 0}</span>
            </div>
            <Button 
              className="w-full mt-4" 
              onClick={() => router.push(`/attendance?badge=${visitor.badge_number}`)}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Voir historique détaillé
            </Button>
          </CardContent>
        </Card>

        {/* Utilisateurs du badge */}
        {visitor.isSharedBadge && visitor.badgeHistory && visitor.badgeHistory.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs du badge</CardTitle>
              <CardDescription>
                Personnes partageant ce numéro de badge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {visitor.badgeHistory.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : '-'}
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