'use client';

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Propriétés pour les composants de diagramme
interface ChartProps {
  data: any[];
  title: string;
  description?: string;
}

// Propriétés pour le composant de table
interface TableProps {
  data: any[];
  columns: { key: string; header: string }[];
  title: string;
  description?: string;
}

// Propriétés du composant principal de template de rapport
interface ReportTemplateProps {
  title: string;
  subtitle?: string;
  dateStart?: Date;
  dateEnd?: Date;
  children: React.ReactNode;
  footer?: string;
  department?: string;
  authors?: string[];
  logoUrl?: string;
}

// Palettes de couleurs harmonieuses
const CHART_COLORS = [
  '#3498db', '#2980b9', '#1abc9c', '#16a085', '#27ae60', 
  '#2ecc71', '#f1c40f', '#f39c12', '#e67e22', '#d35400'
];

/**
 * Composant pour afficher un diagramme à barres
 */
export const BarChartComponent: React.FC<ChartProps> = ({ data, title, description }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3498db" name="Valeur" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Composant pour afficher un diagramme circulaire
 */
export const PieChartComponent: React.FC<ChartProps> = ({ data, title, description }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, 'Valeur']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Composant pour afficher un diagramme linéaire
 */
export const LineChartComponent: React.FC<ChartProps> = ({ data, title, description }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#3498db" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Composant pour afficher un tableau de données
 */
export const TableComponent: React.FC<TableProps> = ({ data, columns, title, description }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={`${index}-${column.key}`}>{row[column.key]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/**
 * Composant principal du template de rapport
 */
const ReportTemplate: React.FC<ReportTemplateProps> = ({
  title,
  subtitle,
  dateStart,
  dateEnd,
  children,
  footer,
  department,
  authors,
  logoUrl = '/logo.png' // Logo par défaut
}) => {
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'dd MMMM yyyy', { locale: fr });
  
  const dateRange = dateStart && dateEnd
    ? `Du ${format(dateStart, 'dd/MM/yyyy')} au ${format(dateEnd, 'dd/MM/yyyy')}`
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-4 md:p-8 print:p-4">
      {/* En-tête */}
      <header className="flex justify-between items-center mb-8 print:mb-6">
        <div className="flex items-center">
          <div className="mr-4">
            <Image
              src={logoUrl}
              alt="Logo SENATOR_INVESTECH"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Date d'émission : {formattedDate}</p>
          {dateRange && <p className="text-sm text-gray-500 dark:text-gray-400">{dateRange}</p>}
          {department && <p className="text-sm text-gray-500 dark:text-gray-400">Département : {department}</p>}
        </div>
      </header>
      
      <Separator className="mb-8" />
      
      {/* Contenu du rapport */}
      <main>
        {children}
      </main>
      
      <Separator className="my-8" />
      
      {/* Pied de page */}
      <footer className="text-sm text-gray-500 dark:text-gray-400 mt-8">
        <div className="flex justify-between items-center">
          <div>
            <p>© {currentDate.getFullYear()} SENATOR INVESTECH</p>
            {authors && authors.length > 0 && (
              <p>Rapport généré par : {authors.join(', ')}</p>
            )}
          </div>
          <div className="text-right">
            {footer && <p>{footer}</p>}
            <p className="print:hidden">Ce rapport a été généré automatiquement le {formattedDate}.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ReportTemplate; 