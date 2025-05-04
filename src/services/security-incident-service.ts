import SecurityIncident from '@/models/SecurityIncident';

interface IncidentFilters {
  type?: string;
  status?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface QueryOptions {
  page: number;
  limit: number;
  filters?: IncidentFilters;
}

interface ExportOptions {
  filters?: IncidentFilters;
}

export class SecurityIncidentService {
  /**
   * Récupère les incidents de sécurité avec pagination et filtrage
   */
  static async getIncidents(options: QueryOptions) {
    try {
      const { page = 1, limit = 20, filters = {} } = options;
      const skip = (page - 1) * limit;
      
      // Construire les filtres pour la requête
      const queryFilters: any = {};
      
      if (filters.type) {
        queryFilters.type = filters.type;
      }
      
      if (filters.status) {
        queryFilters.status = filters.status;
      }
      
      if (filters.userId) {
        queryFilters.userId = filters.userId;
      }
      
      // Filtre de date
      if (filters.startDate || filters.endDate) {
        queryFilters.timestamp = {};
        
        if (filters.startDate) {
          queryFilters.timestamp.$gte = filters.startDate;
        }
        
        if (filters.endDate) {
          queryFilters.timestamp.$lte = filters.endDate;
        }
      }
      
      // Exécuter la requête avec pagination
      const incidents = await SecurityIncident.find(queryFilters)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Compter le nombre total d'incidents
      const total = await SecurityIncident.countDocuments(queryFilters);
      
      return {
        data: incidents,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des incidents de sécurité:', error);
      throw error;
    }
  }
  
  /**
   * Récupère tous les incidents pour l'exportation sans pagination
   */
  static async getExportData(options: ExportOptions) {
    try {
      const { filters = {} } = options;
      
      // Construire les filtres pour la requête
      const queryFilters: any = {};
      
      if (filters.type) {
        queryFilters.type = filters.type;
      }
      
      if (filters.status) {
        queryFilters.status = filters.status;
      }
      
      if (filters.userId) {
        queryFilters.userId = filters.userId;
      }
      
      // Filtre de date
      if (filters.startDate || filters.endDate) {
        queryFilters.timestamp = {};
        
        if (filters.startDate) {
          queryFilters.timestamp.$gte = filters.startDate;
        }
        
        if (filters.endDate) {
          queryFilters.timestamp.$lte = filters.endDate;
        }
      }
      
      // Exécuter la requête sans pagination
      const incidents = await SecurityIncident.find(queryFilters)
        .sort({ timestamp: -1 })
        .lean();
      
      return incidents;
    } catch (error) {
      console.error('Erreur lors de la récupération des incidents pour export:', error);
      throw error;
    }
  }

  /**
   * Crée un nouvel incident de sécurité
   */
  static async createIncident(incidentData: any) {
    try {
      // S'assurer que l'incident a une adresse IP requise par le schema
      if (!incidentData.ipAddress) {
        incidentData.ipAddress = '127.0.0.1';
      }
      
      const incident = await SecurityIncident.create({
        ...incidentData,
        timestamp: new Date()
      });
      
      return incident.toObject();
    } catch (error) {
      console.error('Erreur lors de la création d\'un incident de sécurité:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques des incidents par type
   */
  static async getIncidentStats(days = 30) {
    try {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      
      const stats = await SecurityIncident.aggregate([
        {
          $match: {
            timestamp: { $gte: dateLimit }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            type: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques d\'incidents:', error);
      throw error;
    }
  }
} 