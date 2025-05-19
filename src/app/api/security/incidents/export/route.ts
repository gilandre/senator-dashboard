import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SecurityIncidentService } from "@/services";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * GET /api/security/incidents/export
 * Exporter les incidents de sécurité au format CSV
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est administrateur
    // @ts-ignore
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les paramètres de recherche
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const userId = searchParams.get('userId') || undefined;

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer tous les incidents correspondant aux filtres (sans pagination)
    const incidents = await SecurityIncidentService.getExportData({
      filters: {
        type,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId
      }
    });

    // Si aucun incident trouvé
    if (!incidents || incidents.length === 0) {
      return NextResponse.json({ error: 'Aucun incident à exporter' }, { status: 404 });
    }

    // Générer le contenu selon le format demandé
    if (format === 'csv') {
      const csvContent = generateCsvContent(incidents);
      const headers = new Headers();
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="incidents_securite_${new Date().toISOString().split('T')[0]}.csv"`);
      
      return new NextResponse(csvContent, {
        status: 200,
        headers
      });
    } else {
      // Format non supporté
      return NextResponse.json({ error: 'Format d\'export non supporté' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'exportation des incidents de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exportation des incidents de sécurité' },
      { status: 500 }
    );
  }
}

/**
 * Génère le contenu CSV à partir des incidents
 */
function generateCsvContent(incidents: any[]) {
  // Définir les en-têtes CSV
  const headers = [
    'ID', 
    'Type', 
    'Date', 
    'Utilisateur', 
    'Adresse IP', 
    'Détails', 
    'Statut'
  ];
  
  // Préparer les lignes
  const rows = incidents.map(incident => [
    incident._id || '',
    incident.type || '',
    incident.timestamp ? new Date(incident.timestamp).toISOString() : '',
    incident.userEmail || '',
    incident.ipAddress || '',
    incident.details ? incident.details.replace(/,/g, ' ') : '', // Échapper les virgules
    incident.status || ''
  ]);
  
  // Construire le contenu CSV
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
} 