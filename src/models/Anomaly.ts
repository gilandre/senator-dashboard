import { prisma } from '@/lib/prisma';

// Définir les enums localement pour éviter les problèmes d'importation
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus = 'new' | 'investigating' | 'resolved' | 'ignored';

export interface IAnomalyCreate {
  badge_number?: string;
  description: string;
  severity?: AnomalySeverity;
  status?: AnomalyStatus;
  detected_at?: Date;
}

export interface IAnomalyUpdate {
  description?: string;
  severity?: AnomalySeverity;
  status?: AnomalyStatus;
  resolved_at?: Date;
  resolved_by?: number;
}

/**
 * Créer une nouvelle anomalie
 */
export async function createAnomaly(data: IAnomalyCreate) {
  return await prisma.anomalies.create({
    data: {
      badge_number: data.badge_number,
      description: data.description,
      severity: data.severity || 'medium',
      status: data.status || 'new',
      detected_at: data.detected_at || new Date()
    }
  });
}

/**
 * Récupérer une anomalie par son ID
 */
export async function getAnomalyById(id: number) {
  return await prisma.anomalies.findUnique({
    where: { id },
    include: {
      users: true // Inclure les informations sur l'utilisateur qui a résolu l'anomalie
    }
  });
}

/**
 * Mettre à jour une anomalie
 */
export async function updateAnomaly(id: number, data: IAnomalyUpdate) {
  return await prisma.anomalies.update({
    where: { id },
    data
  });
}

/**
 * Marquer une anomalie comme résolue
 */
export async function resolveAnomaly(id: number, resolvedBy: number) {
  return await prisma.anomalies.update({
    where: { id },
    data: {
      status: 'resolved',
      resolved_at: new Date(),
      resolved_by: resolvedBy
    }
  });
}

/**
 * Récupérer toutes les anomalies avec filtrage et pagination
 */
export async function getAnomalies(filters?: {
  status?: AnomalyStatus | AnomalyStatus[];
  severity?: AnomalySeverity | AnomalySeverity[];
  badge_number?: string;
  fromDate?: Date;
  toDate?: Date;
  skip?: number;
  take?: number;
}) {
  // Construire les conditions de filtrage
  const where: any = {};
  
  if (filters?.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }
  
  if (filters?.severity) {
    where.severity = Array.isArray(filters.severity)
      ? { in: filters.severity }
      : filters.severity;
  }
  
  if (filters?.badge_number) {
    where.badge_number = filters.badge_number;
  }
  
  if (filters?.fromDate || filters?.toDate) {
    where.detected_at = {};
    
    if (filters.fromDate) {
      where.detected_at.gte = filters.fromDate;
    }
    
    if (filters.toDate) {
      where.detected_at.lte = filters.toDate;
    }
  }
  
  // Effectuer la requête avec filtrage et pagination
  const [anomalies, total] = await Promise.all([
    prisma.anomalies.findMany({
      where,
      orderBy: { detected_at: 'desc' },
      skip: filters?.skip || 0,
      take: filters?.take || 50,
      include: {
        users: true // Inclure les informations sur l'utilisateur qui a résolu l'anomalie
      }
    }),
    prisma.anomalies.count({ where })
  ]);
  
  return { anomalies, total };
}

export default {
  createAnomaly,
  getAnomalyById,
  updateAnomaly,
  resolveAnomaly,
  getAnomalies
}; 