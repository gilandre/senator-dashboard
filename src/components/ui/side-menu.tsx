"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  FileText,
  Settings,
  Clock,
  Building,
  DoorOpen,
  AlertTriangle,
  Download,
  Upload,
  UserCog,
  ShieldCheck,
  FileDigit,
  Database,
  Layout,
  Key,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  UserRound,
  CalendarCheck,
  Calendar,
  Lock,
  RefreshCw
} from "lucide-react";
import { toggleSidebarEvent } from "./top-menu";
import { cn } from "@/lib/utils";

// Définir les types pour les items de menu
interface MenuItem {
  name: string;
  href: string;
  icon: any;
  subItems?: MenuItem[];
  isNew?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export default function SideMenu() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});

  // Écouter l'événement de toggle du sidebar
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsCollapsed(prev => !prev);
    };

    window.addEventListener('toggleSidebar', handleToggleSidebar);
    
    // Nettoyer l'écouteur d'événement lors du démontage
    return () => {
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  const menuGroups: MenuGroup[] = [
    {
      title: "Tableau de bord",
      items: [
        {
          name: "Vue d'ensemble",
          href: "/dashboard",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "Rapports",
      items: [
        {
          name: "Rapports",
          href: "/reports",
          icon: FileText,
        },
        {
          name: "Importer",
          href: "/import",
          icon: Download,
        },
        {
          name: "Exporter",
          href: "/export",
          icon: Upload,
        },
      ],
    },
    {
      title: "Accès",
      items: [
        {
          name: "Contrôle d'accès",
          href: "/access",
          icon: DoorOpen,
        },
        {
          name: "Anomalies",
          href: "/anomalies",
          icon: AlertTriangle,
        },
        {
          name: "Historique d'accès",
          href: "/access-history",
          icon: Clock,
        },
      ],
    },
    {
      title: "Collaborateurs",
      items: [
        {
          name: "Employés",
          href: "/employees",
          icon: Users,
        },
        {
          name: "Présences",
          href: "/attendance",
          icon: CalendarCheck,
        },
        {
          name: "Visiteurs",
          href: "/visitors",
          icon: UserRound,
        },
        {
          name: "Départements",
          href: "/departments",
          icon: Building,
        },
      ],
    },
    {
      title: "Paramètres",
      items: [
        {
          name: "Configuration",
          href: "/settings",
          icon: Settings,
          subItems: [
            {
              name: "Gestion du temps et présences",
              href: "/settings/work-calendar",
              icon: CalendarCheck,
            }
          ]
        },
        {
          name: "Utilisateurs",
          href: "/settings/users",
          icon: UserCog,
        },
        {
          name: "Contrôle d'accès",
          href: "/settings/access-control",
          icon: Lock,
          isNew: true,
        },
        {
          name: "Sécurité",
          href: "/settings/security",
          icon: ShieldCheck,
        },
        {
          name: "Audit",
          href: "/settings/audit",
          icon: FileDigit,
        },
        {
          name: "Données de référence",
          href: "/settings/reference-data",
          icon: Database,
        },
        {
          name: "Interface",
          href: "/settings/interface",
          icon: Layout,
        },
      ],
    },
  ];

  // Regrouper les sous-menus
  const processedMenuGroups = menuGroups.map(group => {
    // Identifier si des éléments ont le même chemin de base
    const mainItems: MenuItem[] = [];
    const itemsByPrefix: {[key: string]: MenuItem} = {};
    
    group.items.forEach(item => {
      const pathParts = item.href.split('/').filter(Boolean);
      if (pathParts.length <= 1 || item.href === `/${pathParts[0]}`) {
        // C'est un élément principal
        item.subItems = item.subItems || [];
        mainItems.push(item);
        itemsByPrefix[pathParts[0]] = item;
      } else {
        // C'est un sous-élément
        const prefix = pathParts[0];
        if (!itemsByPrefix[prefix]) {
          // Créer un élément principal s'il n'existe pas encore
          const mainItem: MenuItem = {
            name: pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1),
            href: `/${prefix}`,
            icon: item.icon,
            subItems: [item]
          };
          mainItems.push(mainItem);
          itemsByPrefix[prefix] = mainItem;
        } else {
          // Ajouter à un élément principal existant
          if (!itemsByPrefix[prefix].subItems) {
            itemsByPrefix[prefix].subItems = [];
          }
          itemsByPrefix[prefix].subItems?.push(item);
        }
      }
    });

    return {
      ...group,
      items: mainItems
    };
  });

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} border-r bg-white dark:bg-gray-950 dark:border-gray-800 overflow-y-auto h-full transition-all duration-300`}>
      <div className="py-4 flex flex-col h-full">
        <div className="px-4 mb-2 flex justify-end">
          <button 
            onClick={toggleSidebar} 
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            aria-label={isCollapsed ? "Étendre le menu" : "Réduire le menu"}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {processedMenuGroups.map((group, index) => (
            <div key={index} className="mb-4 px-2">
              {!isCollapsed && (
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                  {group.title}
                </h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const isGroupExpanded = expandedGroups[item.name] || false;
                  
                  return (
                    <li key={item.name} className="relative">
                      {hasSubItems ? (
                        <>
                          <button
                            onClick={() => toggleGroup(item.name)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm ${
                              isActive(item.href)
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              {!isCollapsed && (
                                <div className="flex items-center">
                                  <span>{item.name}</span>
                                  {item.isNew && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                      Nouveau
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {!isCollapsed && (
                              isGroupExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          
                          {!isCollapsed && isGroupExpanded && (
                            <ul className="pl-9 space-y-1 mt-1">
                              {item.subItems?.map((subItem) => (
                                <li key={subItem.name}>
                                  <Link
                                    href={subItem.href}
                                    className={`block px-3 py-2 rounded-md text-sm ${
                                      isActive(subItem.href)
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
                                    }`}
                                  >
                                    {subItem.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-sm ${
                            isActive(item.href)
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && (
                            <div className="flex items-center">
                              <span>{item.name}</span>
                              {item.isNew && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                  Nouveau
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
} 