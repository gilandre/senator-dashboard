const db = require('./mysql');
const { timeStringToDate, dateToTimeString, combineDateAndTime } = require('./dateUtils');

/**
 * Service pour gérer les logs d'accès
 */
class AccessLogService {
  constructor() {
    this.tableName = 'access_logs';
  }

  /**
   * Initialise la connexion à MySQL
   */
  async init() {
    console.log('🔄 Initialisation du service des logs d\'accès...');
    try {
      await db.connect();
      console.log('✅ Service des logs d\'accès initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du service:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les logs d'accès
   * @param {Object} filters - Filtres à appliquer
   * @param {Object} options - Options de pagination et tri
   * @returns {Promise<Array>} - Liste des logs d'accès
   */
  async getAllLogs(filters = {}, options = {}) {
    // Adapter les noms des champs de MongoDB à MySQL
    const adaptedFilters = this._adaptFilters(filters);
    const adaptedOptions = this._adaptOptions(options);
    
    return await db.find(this.tableName, adaptedFilters, adaptedOptions);
  }

  /**
   * Récupère un log d'accès par son ID
   * @param {number} id - ID du log
   * @returns {Promise<Object>} - Log d'accès
   */
  async getLogById(id) {
    return await db.findOne(this.tableName, { id });
  }

  /**
   * Récupère les logs d'accès par numéro de badge
   * @param {string} badgeNumber - Numéro de badge
   * @returns {Promise<Array>} - Liste des logs d'accès
   */
  async getLogsByBadge(badgeNumber) {
    return await db.find(this.tableName, { badge_number: badgeNumber });
  }

  /**
   * Ajoute un nouveau log d'accès
   * @param {Object} logData - Données du log
   * @returns {Promise<Object>} - Résultat de l'insertion
   */
  async addLog(logData) {
    console.log('📝 Ajout d\'un nouveau log d\'accès...');
    console.log('📦 Données reçues:', JSON.stringify(logData, null, 2));
    
    try {
      // Adapter les noms des champs de MongoDB à MySQL
      const adaptedData = this._adaptData(logData);
      console.log('🔄 Données adaptées:', JSON.stringify(adaptedData, null, 2));
      
      // Ajouter la date de création
      adaptedData.created_at = new Date();
      
      const result = await db.insertOne(this.tableName, adaptedData);
      console.log('✅ Log d\'accès ajouté avec succès, ID:', result.insertId);
      
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du log:', error);
      throw error;
    }
  }

  /**
   * Ajoute plusieurs logs d'accès
   * @param {Array<Object>} logsData - Données des logs
   * @returns {Promise<Object>} - Résultat de l'insertion
   */
  async addLogs(logsData) {
    console.log(`📝 Ajout de ${logsData.length} logs d'accès...`);
    
    if (!Array.isArray(logsData) || logsData.length === 0) {
      console.log('⚠️ Aucun log à ajouter');
      return { insertIds: [], affectedRows: 0 };
    }
    
    try {
      // Adapter les noms des champs de MongoDB à MySQL pour chaque log
      const adaptedLogsData = logsData.map(log => {
        const adaptedLog = this._adaptData(log);
        adaptedLog.created_at = new Date();
        return adaptedLog;
      });
      
      console.log('🔄 Données adaptées pour le premier log:', JSON.stringify(adaptedLogsData[0], null, 2));
      
      const result = await db.insertMany(this.tableName, adaptedLogsData);
      console.log(`✅ ${logsData.length} logs d'accès ajoutés avec succès`);
      
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout des logs:', error);
      throw error;
    }
  }

  /**
   * Met à jour un log d'accès
   * @param {number} id - ID du log
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<Object>} - Résultat de la mise à jour
   */
  async updateLog(id, updateData) {
    // Adapter les noms des champs de MongoDB à MySQL
    const adaptedData = this._adaptData(updateData);
    
    // Ajouter la date de mise à jour
    adaptedData.updated_at = new Date();
    
    return await db.updateOne(this.tableName, { id }, adaptedData);
  }

  /**
   * Supprime un log d'accès
   * @param {number} id - ID du log
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  async deleteLog(id) {
    return await db.deleteOne(this.tableName, { id });
  }

  /**
   * Récupère les statistiques d'accès
   * @param {Object} filters - Filtres à appliquer
   * @returns {Promise<Object>} - Statistiques d'accès
   */
  async getStatistics(filters = {}) {
    const adaptedFilters = this._adaptFilters(filters);
    
    // Requête pour compter les entrées et sorties
    const entriesExitsSql = `
      SELECT 
        SUM(CASE WHEN event_type = 'entry' THEN 1 ELSE 0 END) as entries,
        SUM(CASE WHEN event_type = 'exit' THEN 1 ELSE 0 END) as exits,
        COUNT(*) as total
      FROM ${this.tableName}
      ${adaptedFilters.whereClause}
    `;
    
    // Requête pour compter par type de personne
    const personTypesSql = `
      SELECT 
        person_type,
        COUNT(*) as count
      FROM ${this.tableName}
      ${adaptedFilters.whereClause}
      GROUP BY person_type
    `;
    
    const [entriesExits, personTypes] = await Promise.all([
      db.query(entriesExitsSql, adaptedFilters.params),
      db.query(personTypesSql, adaptedFilters.params)
    ]);
    
    // Transformer les résultats en format attendu
    const stats = entriesExits[0] || { entries: 0, exits: 0, total: 0 };
    
    // Organiser les types de personnes en dictionnaire
    const personTypesDict = {};
    personTypes.forEach(pt => {
      personTypesDict[pt.person_type] = pt.count;
    });
    
    return {
      total: stats.total,
      entries: stats.entries,
      exits: stats.exits,
      personTypes: personTypesDict
    };
  }

  /**
   * Recherche des logs d'accès
   * @param {Object} searchParams - Paramètres de recherche
   * @returns {Promise<Array>} - Résultats de la recherche
   */
  async search(searchParams) {
    // Construire les filtres de recherche
    const filters = {};
    const options = { limit: searchParams.limit || 100, offset: searchParams.offset || 0 };
    
    // Date de début
    if (searchParams.startDate) {
      filters.event_date = filters.event_date || {};
      filters.event_date.$gte = searchParams.startDate;
    }
    
    // Date de fin
    if (searchParams.endDate) {
      filters.event_date = filters.event_date || {};
      filters.event_date.$lte = searchParams.endDate;
    }
    
    // Numéro de badge
    if (searchParams.badgeNumber) {
      filters.badge_number = searchParams.badgeNumber;
    }
    
    // Type de personne
    if (searchParams.personType) {
      filters.person_type = searchParams.personType;
    }
    
    // Type d'événement
    if (searchParams.eventType) {
      filters.event_type = searchParams.eventType;
    }
    
    // Nom complet (recherche partielle)
    if (searchParams.fullName) {
      filters.full_name = { $regex: new RegExp(searchParams.fullName, 'i') };
    }
    
    return await this.getAllLogs(filters, options);
  }

  /**
   * Adapte les noms de champs de MongoDB à MySQL
   * @param {Object} logData - Données avec noms de champs MongoDB
   * @returns {Object} - Données avec noms de champs MySQL
   * @private
   */
  _adaptData(logData) {
    console.log('🔄 Adaptation des données...');
    console.log('📦 Données d\'entrée:', JSON.stringify(logData, null, 2));
    
    // Gérer event_time
    let eventTime;
    if (logData.event_time instanceof Date) {
      console.log('⏰ event_time est déjà un objet Date');
      eventTime = logData.event_time;
    } else if (logData.eventTime) {
      console.log('⏰ Conversion de eventTime en Date:', logData.eventTime);
      eventTime = timeStringToDate(logData.eventTime);
    } else {
      console.log('⏰ Utilisation de la date/heure actuelle comme valeur par défaut');
      eventTime = new Date();
    }

    // Gérer event_date
    let eventDate;
    if (logData.event_date instanceof Date) {
      console.log('📅 event_date est déjà un objet Date');
      eventDate = logData.event_date;
    } else if (logData.eventDate) {
      console.log('📅 Conversion de eventDate en Date:', logData.eventDate);
      eventDate = new Date(logData.eventDate);
    } else {
      console.log('📅 Utilisation de la date actuelle comme valeur par défaut');
      eventDate = new Date();
    }

    const adaptedData = {
      badge_number: logData.badgeNumber,
      person_type: logData.personType || 'employee',
      event_date: eventDate,
      event_time: eventTime,
      reader: logData.reader || null,
      terminal: logData.terminal || null,
      event_type: logData.eventType || 'unknown',
      direction: logData.direction || 'unknown',
      full_name: logData.fullName || null,
      group_name: logData.groupName || 'Default Group',
      processed: logData.processed || false,
      created_at: logData.created_at || new Date()
    };

    console.log('✅ Données adaptées:', JSON.stringify(adaptedData, null, 2));
    return adaptedData;
  }

  /**
   * Adapte les filtres de MongoDB à MySQL
   * @param {Object} filters - Filtres avec noms de champs MongoDB
   * @returns {Object} - Filtres avec noms de champs MySQL
   * @private
   */
  _adaptFilters(filters) {
    return this._adaptData(filters);
  }

  /**
   * Adapte les options de MongoDB à MySQL
   * @param {Object} options - Options de requête MongoDB
   * @returns {Object} - Options de requête MySQL
   * @private
   */
  _adaptOptions(options) {
    const adaptedOptions = { ...options };
    
    // Adapter le tri
    if (options.sort) {
      adaptedOptions.sort = {};
      Object.entries(options.sort).forEach(([key, value]) => {
        const mappedKey = key === 'badgeNumber' ? 'badge_number' : 
                        key === 'eventDate' ? 'event_date' : 
                        key === 'personType' ? 'person_type' : key;
        
        adaptedOptions.sort[mappedKey] = value;
      });
    }
    
    return adaptedOptions;
  }
}

module.exports = new AccessLogService(); 