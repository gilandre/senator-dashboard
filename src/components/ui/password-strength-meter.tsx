'use client';

import React, { useState, useEffect } from 'react';
import { Progress } from './progress';
import { ISecuritySettings } from '@/models/SecuritySettings';
import { evaluatePasswordStrength } from '@/lib/security/passwordStrengthMeter';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  securitySettings: ISecuritySettings;
}

export function PasswordStrengthMeter({ password, securitySettings }: PasswordStrengthMeterProps) {
  const [evaluation, setEvaluation] = useState(() => 
    evaluatePasswordStrength(password, securitySettings)
  );
  
  useEffect(() => {
    setEvaluation(evaluatePasswordStrength(password, securitySettings));
  }, [password, securitySettings]);
  
  // Déterminer la couleur en fonction du score
  const getProgressColor = (score: number) => {
    if (score < 20) return 'bg-red-500';
    if (score < 40) return 'bg-orange-500';
    if (score < 60) return 'bg-yellow-500';
    if (score < 80) return 'bg-green-500';
    return 'bg-emerald-500';
  };
  
  if (!password) {
    return null;
  }
  
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Force: {evaluation.strength}
        </span>
        <span className="text-xs font-medium">
          {evaluation.score}/100
        </span>
      </div>
      
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div 
          className={cn("h-full transition-all", getProgressColor(evaluation.score))}
          style={{ width: `${evaluation.score}%` }}
        />
      </div>
      
      {evaluation.feedback.length > 0 && (
        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 mt-2">
          {evaluation.feedback.map((message, index) => (
            <li key={index} className="flex items-start">
              <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900 rounded-full mr-2 mt-0.5 flex-shrink-0"></span>
              {message}
            </li>
          ))}
        </ul>
      )}
      
      {evaluation.meetsRequirements && evaluation.score >= 60 && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          Ce mot de passe répond à toutes les exigences de sécurité.
        </p>
      )}
    </div>
  );
} 