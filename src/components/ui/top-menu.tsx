"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Sun, Moon, Menu, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONFIG } from '@/config/app';

// Événement personnalisé pour le toggle du sidebar
export const toggleSidebarEvent = new Event('toggleSidebar');

export default function TopMenu() {
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Get user initials from name
  const getUserInitials = (name: string = 'User') => {
    const nameParts = name.split(' ');
    return nameParts.length > 1 
      ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}` 
      : `${nameParts[0].charAt(0)}${nameParts[0].charAt(1) || ''}`;
  };

  const userInitials = getUserInitials(user?.name || 'User');

  const handleToggleSidebar = () => {
    window.dispatchEvent(toggleSidebarEvent);
  };

  // Fermer le menu utilisateur si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  // Utiliser un rendu qui fonctionne à la fois côté serveur et client
  return (
    <header className={`border-b bg-[#0078D4] dark:bg-[#0078D4] dark:border-gray-800`}>
      <div className="flex items-center justify-between w-full px-4 py-3">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-3 text-white hover:bg-[#106EBE] hover:text-white"
            onClick={handleToggleSidebar}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0078D4] to-[#106EBE] rounded-md"></div>
              <div className="absolute inset-1 bg-white dark:bg-gray-900 rounded-sm flex items-center justify-center text-[#0078D4] dark:text-[#2B88D8] font-bold text-lg">E</div>
            </div>
            <span className="text-lg font-medium text-white">{APP_CONFIG.name}</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-[#106EBE] hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-[#106EBE] hover:text-white"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Switch theme"
            suppressHydrationWarning
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          {isAuthenticated ? (
            <div className="hidden md:block relative" ref={userMenuRef}>
              <button 
                className="flex items-center space-x-2 text-white hover:text-[#2B88D8]"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                role="button"
                aria-haspopup="menu"
              >
                <div className="w-8 h-8 rounded-full bg-[#106EBE] flex items-center justify-center">
                  <span className="text-sm font-medium text-white">{userInitials}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-1">{user?.name || 'Utilisateur'}</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50" role="menu">
                  <Link 
                    href="/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profil
                  </Link>
                  <Link 
                    href="/settings" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Paramètres
                  </Link>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button 
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 text-white border-white hover:bg-[#106EBE] hover:text-white hover:border-[#106EBE]"
              >
                <User className="h-4 w-4" />
                <span>Connexion</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 