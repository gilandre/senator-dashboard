import React from 'react';
import { Metadata } from 'next';
import { VisitorList } from '@/components/visitors/visitor-list';

export const metadata: Metadata = {
  title: "Visiteurs | SenatorFX",
  description: "Gestion des visiteurs et de leurs accès",
};

export default function VisitorsPage() {
  return (
    <VisitorList />
  );
} 