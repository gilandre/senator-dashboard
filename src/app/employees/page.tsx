import { Metadata } from 'next';
import { EmployeeList } from '@/components/employees/employee-list';

export const metadata: Metadata = {
  title: 'Gestion des Employés | Senator',
  description: 'Gestion complète des employés - consulter, ajouter, modifier et suivre les employés',
};

export default function EmployeesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion des Employés</h2>
          <p className="text-muted-foreground">
            Gérez les employés, leurs badges et leurs informations
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <EmployeeList />
      </div>
    </div>
  );
} 