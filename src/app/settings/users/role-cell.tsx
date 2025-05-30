'use client';

import { Badge } from "@/components/ui/badge";
import { UserCog, User, Shield, CircleUser } from "lucide-react";
import { useReferenceData } from "@/components/reference-data-provider";
import { useEffect, useState } from "react";

// Mapping des noms d'icônes vers les composants
const iconMap: Record<string, any> = {
  UserCog,
  User,
  Shield,
  CircleUser
};

// Propriétés du composant
interface RoleCellProps {
  roleId?: number;
  fallbackRoleCode?: string;
}

// Mapping statique des rôles par défaut au cas où les données de référence échouent
const defaultRoleMap: Record<string, {displayName: string, colorClass: string, icon: string}> = {
  'admin': {
    displayName: 'Admin',
    colorClass: 'bg-blue-100 text-blue-800',
    icon: 'Shield'
  },
  'user': {
    displayName: 'Utilisateur',
    colorClass: 'bg-green-100 text-green-800',
    icon: 'User'
  },
  'operator': {
    displayName: 'Opérateur',
    colorClass: 'bg-purple-100 text-purple-800',
    icon: 'UserCog'
  },
  'viewer': {
    displayName: 'Observateur',
    colorClass: 'bg-gray-100 text-gray-800',
    icon: 'CircleUser'
  }
};

// Composant de cellule de rôle
export function RoleCell({ roleId, fallbackRoleCode }: RoleCellProps) {
  const { getItems, getItemByCode } = useReferenceData();
  const [roleData, setRoleData] = useState<{
    displayName: string;
    colorClass: string;
    IconComponent: any;
  }>({
    displayName: "Non défini",
    colorClass: "bg-gray-100 text-gray-800",
    IconComponent: User
  });
  
  // Log des props pour déboguer
  console.log("RoleCell - Props:", { roleId, fallbackRoleCode });
  
  // Utiliser useEffect pour calculer les données de rôle une seule fois lors du montage
  useEffect(() => {
    // Récupérer tous les rôles disponibles
    const roleItems = getItems('role', 'users');
    console.log("RoleCell - Available roles:", roleItems);
    
    let foundRole = false;
    let displayName = "Non défini";
    let colorClass = "bg-gray-100 text-gray-800";
    let IconComponent = User;
    
    // Stratégie 1: Chercher par ID (solution la plus fiable)
    if (roleId) {
      // Créer un mapping explicite des ID vers les données de rôle
      const roleIdMap = roleItems.reduce((acc: Record<number, any>, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      
      console.log("RoleCell - Role ID map:", roleIdMap);
      console.log("RoleCell - Looking for roleId:", roleId);
      
      const roleInfo = roleIdMap[roleId];
      
      if (roleInfo) {
        displayName = roleInfo.display_name;
        colorClass = roleInfo.color_code || colorClass;
        IconComponent = roleInfo.icon_name ? iconMap[roleInfo.icon_name] : User;
        foundRole = true;
        console.log("RoleCell - Found by ID:", roleInfo);
      }
    }
    
    // Stratégie 2: Chercher par code si ID n'a pas fonctionné
    if (!foundRole && fallbackRoleCode) {
      const roleInfo = getItemByCode('role', fallbackRoleCode, 'users');
      
      if (roleInfo) {
        displayName = roleInfo.display_name;
        colorClass = roleInfo.color_code || colorClass;
        IconComponent = roleInfo.icon_name ? iconMap[roleInfo.icon_name] : User;
        foundRole = true;
        console.log("RoleCell - Found by code:", roleInfo);
      }
    }
    
    // Stratégie 3: Utiliser le mapping statique si tout échoue
    if (!foundRole && fallbackRoleCode && defaultRoleMap[fallbackRoleCode]) {
      const defaultRole = defaultRoleMap[fallbackRoleCode];
      displayName = defaultRole.displayName;
      colorClass = defaultRole.colorClass;
      IconComponent = iconMap[defaultRole.icon] || User;
      foundRole = true;
      console.log("RoleCell - Using default mapping:", defaultRole);
    }
    
    // Stratégie 4: Formatage par défaut du code en titre
    if (!foundRole && fallbackRoleCode) {
      displayName = fallbackRoleCode.charAt(0).toUpperCase() + fallbackRoleCode.slice(1);
      console.log("RoleCell - Using capitalized code:", displayName);
    }
    
    // Mettre à jour l'état
    setRoleData({
      displayName,
      colorClass,
      IconComponent
    });
    
  }, [roleId, fallbackRoleCode, getItems, getItemByCode]);
  
  return (
    <Badge className={roleData.colorClass}>
      {roleData.IconComponent && <roleData.IconComponent className="h-3.5 w-3.5 mr-1" />}
      {roleData.displayName}
    </Badge>
  );
} 