import React from 'react';

type ChartCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export default function ChartCard({ 
  title, 
  description, 
  children,
  action
}: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        {action && (
          <div>
            {action}
          </div>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
} 