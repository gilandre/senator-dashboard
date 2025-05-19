import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import accessLogService from '../../../lib/accessLogService';
import { timeStringToDate, combineDateAndTime } from '../../../lib/dateUtils';

// Fonction pour vérifier l'authentification
async function checkAuth() {
  console.log('🔒 Vérification de l\'authentification...');
  const session = await getServerSession();
  if (!session || !session.user) {
    console.log('❌ Non authentifié');
    return { authenticated: false, error: 'Non authentifié' };
  }
  console.log('✅ Authentifié:', session.user.email);
  return { authenticated: true, user: session.user };
}

// Initialisation de la connexion MySQL
let isInitialized = false;
async function initialize() {
  if (!isInitialized) {
    console.log('🔄 Initialisation de la connexion MySQL...');
    try {
      await accessLogService.init();
      isInitialized = true;
      console.log('✅ Connexion MySQL initialisée avec succès');
    } catch (error) {
      console.error('❌ Erreur d\'initialisation de la connexion MySQL:', error);
      throw error;
    }
  }
}

// GET /api/access-logs
export async function GET(request) {
  try {
    await initialize();
    
    // Vérifier l'authentification
    const { authenticated, error } = await checkAuth();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    
    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url);
    
    // Créer les paramètres de recherche
    const searchParameters = {
      badgeNumber: searchParams.get('badgeNumber'),
      personType: searchParams.get('personType'),
      eventType: searchParams.get('eventType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      fullName: searchParams.get('fullName'),
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0')
    };
    
    // Si un ID est spécifié, récupérer un log spécifique
    if (searchParams.has('id')) {
      const id = parseInt(searchParams.get('id'));
      const log = await accessLogService.getLogById(id);
      
      if (!log) {
        return NextResponse.json({ error: 'Log non trouvé' }, { status: 404 });
      }
      
      return NextResponse.json(log);
    }
    
    // Si mode stats est activé, retourner les statistiques
    if (searchParams.get('stats') === 'true') {
      const filters = {};
      
      if (searchParameters.startDate) {
        filters.event_date = filters.event_date || {};
        filters.event_date.$gte = searchParameters.startDate;
      }
      
      if (searchParameters.endDate) {
        filters.event_date = filters.event_date || {};
        filters.event_date.$lte = searchParameters.endDate;
      }
      
      if (searchParameters.badgeNumber) {
        filters.badge_number = searchParameters.badgeNumber;
      }
      
      if (searchParameters.personType) {
        filters.person_type = searchParameters.personType;
      }
      
      const stats = await accessLogService.getStatistics(filters);
      return NextResponse.json(stats);
    }
    
    // Sinon, rechercher les logs selon les critères
    const logs = await accessLogService.search(searchParameters);
    
    // Récupérer le nombre total pour la pagination
    const totalCount = await accessLogService.query(
      `SELECT COUNT(*) as total FROM access_logs ${searchParameters.whereClause || ''}`,
      searchParameters.params || []
    );
    
    return NextResponse.json({
      logs,
      total: totalCount[0]?.total || logs.length,
      limit: searchParameters.limit,
      offset: searchParameters.offset
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs d\'accès:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des logs' }, { status: 500 });
  }
}

// POST /api/access-logs
export async function POST(request) {
  console.log('📨 Réception d\'une requête POST /api/access-logs');
  
  try {
    await initialize();
    
    // Vérifier l'authentification
    const { authenticated, error, user } = await checkAuth();
    if (!authenticated) {
      console.log('❌ Authentification échouée:', error);
      return NextResponse.json({ error }, { status: 401 });
    }
    
    // Vérifier les autorisations
    const hasWriteAccess = true; // À implémenter avec le système d'autorisation
    if (!hasWriteAccess) {
      console.log('❌ Autorisations insuffisantes');
      return NextResponse.json({ error: 'Autorisations insuffisantes' }, { status: 403 });
    }
    
    // Récupérer les données
    const data = await request.json();
    console.log('📦 Données reçues:', JSON.stringify(data, null, 2));
    
    // Valider les données
    if (!data.badgeNumber || !data.eventDate || !data.eventTime) {
      console.log('❌ Données incomplètes:', { 
        badgeNumber: !!data.badgeNumber, 
        eventDate: !!data.eventDate, 
        eventTime: !!data.eventTime 
      });
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
    }
    
    // Convertir les dates et heures
    try {
      console.log('🔄 Conversion des dates et heures...');
      console.log('⏰ eventTime avant conversion:', data.eventTime);
      data.event_time = timeStringToDate(data.eventTime);
      console.log('⏰ event_time après conversion:', data.event_time);
      
      console.log('📅 eventDate avant conversion:', data.eventDate);
      data.event_date = new Date(data.eventDate);
      console.log('📅 event_date après conversion:', data.event_date);
    } catch (error) {
      console.error('❌ Erreur lors de la conversion des dates:', error);
      return NextResponse.json({ error: 'Format de date/heure invalide' }, { status: 400 });
    }
    
    // Ajouter les informations utilisateur
    data.createdBy = user.email;
    data.processed = true;
    console.log('👤 Informations utilisateur ajoutées:', { createdBy: user.email });
    
    // Ajouter le log
    console.log('📝 Ajout du log dans la base de données...');
    const result = await accessLogService.addLog(data);
    console.log('✅ Log ajouté avec succès, ID:', result.insertId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Log d\'accès ajouté avec succès',
      logId: result.insertId 
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du log d\'accès:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'ajout du log' }, { status: 500 });
  }
}

// PUT /api/access-logs
export async function PUT(request) {
  try {
    await initialize();
    
    // Vérifier l'authentification
    const { authenticated, error, user } = await checkAuth();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    
    // Vérifier les autorisations
    const hasWriteAccess = true; // À implémenter avec le système d'autorisation
    if (!hasWriteAccess) {
      return NextResponse.json({ error: 'Autorisations insuffisantes' }, { status: 403 });
    }
    
    // Récupérer les données
    const data = await request.json();
    
    // Valider les données
    if (!data.id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }
    
    // Vérifier si le log existe
    const existingLog = await accessLogService.getLogById(data.id);
    if (!existingLog) {
      return NextResponse.json({ error: 'Log non trouvé' }, { status: 404 });
    }
    
    // Ajouter les informations utilisateur
    data.updatedBy = user.email;
    data.updatedAt = new Date();
    
    // Mettre à jour le log
    const result = await accessLogService.updateLog(data.id, data);
    
    if (result.modifiedCount === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Aucune modification nécessaire',
        modified: false
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Log d\'accès mis à jour avec succès',
      modified: true
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du log d\'accès:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du log' }, { status: 500 });
  }
}

// DELETE /api/access-logs
export async function DELETE(request) {
  try {
    await initialize();
    
    // Vérifier l'authentification
    const { authenticated, error } = await checkAuth();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    
    // Vérifier les autorisations
    const hasWriteAccess = true; // À implémenter avec le système d'autorisation
    if (!hasWriteAccess) {
      return NextResponse.json({ error: 'Autorisations insuffisantes' }, { status: 403 });
    }
    
    // Récupérer l'ID à supprimer
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }
    
    // Vérifier si le log existe
    const existingLog = await accessLogService.getLogById(id);
    if (!existingLog) {
      return NextResponse.json({ error: 'Log non trouvé' }, { status: 404 });
    }
    
    // Supprimer le log
    const result = await accessLogService.deleteLog(id);
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Échec de la suppression du log'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Log d\'accès supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du log d\'accès:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du log' }, { status: 500 });
  }
} 