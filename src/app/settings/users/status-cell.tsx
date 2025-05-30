'use client';

import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, UserCheck } from "lucide-react";
import { useReferenceData } from "@/components/reference-data-provider";

// Mapping des noms d'icônes vers les composants
const iconMap: Record<string, any> = {
  CheckCircle,
  XCircle,
  UserCheck
};

// Propriétés du composant
interface StatusCellProps {
  statusId?: number;
  fallbackStatusCode?: string;
  deactivationReason?: string;
}

// Composant de cellule de statut
export function StatusCell({ statusId, fallbackStatusCode, deactivationReason }: StatusCellProps) {
  const { getItems, getItemByCode } = useReferenceData();
  
  // Variables pour stocker les infos du statut
  let displayName = "Non défini";
  let colorClass = "bg-gray-100 text-gray-800";
  let IconComponent = XCircle;
  
  // Si un ID de statut est fourni, chercher dans les données de référence
  if (statusId) {
    const statusItems = getItems('status', 'users');
    const statusInfo = statusItems.find(item => item.id === statusId);
    
    if (statusInfo) {
      displayName = statusInfo.display_name;
      colorClass = statusInfo.color_code || colorClass;
      IconComponent = statusInfo.icon_name ? iconMap[statusInfo.icon_name] : XCircle;
    }
  }
  // Fallback sur le code de statut hérité si disponible
  else if (fallbackStatusCode) {
    // Chercher le statut par son code
    const statusInfo = getItemByCode('status', fallbackStatusCode, 'users');
    
    if (statusInfo) {
      displayName = statusInfo.display_name;
      colorClass = statusInfo.color_code || colorClass;
      IconComponent = statusInfo.icon_name ? iconMap[statusInfo.icon_name] : XCircle;
    } else {
      // Fallback pour la rétrocompatibilité
      displayName = fallbackStatusCode.charAt(0).toUpperCase() + fallbackStatusCode.slice(1);
      
      if (fallbackStatusCode === 'active') {
        colorClass = 'bg-green-100 text-green-800';
        IconComponent = CheckCircle;
      } else if (fallbackStatusCode === 'inactive') {
        colorClass = 'bg-gray-100 text-gray-800';
        IconComponent = XCircle;
      } else if (fallbackStatusCode === 'suspended') {
        colorClass = 'bg-amber-100 text-amber-800';
        IconComponent = UserCheck;
      }
    }
  }
  
  // Détermine si le statut est inactif pour afficher éventuellement la raison
  const isInactive = statusId ? 
    getItems('status', 'users').find(item => item.id === statusId)?.code === 'inactive' : 
    fallbackStatusCode === 'inactive';
  
  return (
    <div className="flex items-center gap-2">
      <Badge className={colorClass}>
        {IconComponent && <IconComponent className="h-3.5 w-3.5 mr-1" />}
        {displayName}
      </Badge>
      
      {/* Afficher la raison de désactivation si disponible */}
      {isInactive && deactivationReason && (
        <span 
          className="text-xs text-muted-foreground ml-2" 
          title={deactivationReason}
        >
          ({deactivationReason.length > 15 
            ? deactivationReason.substring(0, 15) + "..." 
            : deactivationReason})
        </span>
      )}
    </div>
  );
} 