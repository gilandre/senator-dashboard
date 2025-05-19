import React from 'react';
import { Metadata } from "next";
import { EmployeeTimeTracker } from '@/components/employee-attendance/employee-time-tracker';

export const metadata: Metadata = {
  title: "Suivi des présences | SenatorFX",
  description: "Suivi des heures d'arrivée et de départ des employés",
};

export default function AttendancePage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <EmployeeTimeTracker />
    </div>
  );
} 