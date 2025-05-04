"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function DashboardHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      <div className="flex space-x-4">
        <Button asChild>
          <Link href="/import">Importer des données</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/reports">Rapports</Link>
        </Button>
      </div>
    </div>
  );
} 