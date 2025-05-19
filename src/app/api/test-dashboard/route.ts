import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Liste des APIs à tester
    const apis = [
      '/api/statistics',
      '/api/access-data',
      '/api/activities/recent?limit=3',
      '/api/departments/statistics',
      '/api/readers/usage',
      '/api/presence?period=daily',
      '/api/csv-analysis'
    ];
    
    const results: Record<string, any> = {};
    
    // Tester chaque API
    for (const api of apis) {
      try {
        const response = await fetch(`http://localhost:3010${api}`, {
          headers: {
            // Bypass l'authentification pour les tests en définissant l'utilisateur admin
            'x-test-bypass-auth': 'admin'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          results[api] = {
            status: response.status,
            success: true,
            sample: JSON.stringify(data).substring(0, 100) + '...' // Échantillon des données
          };
        } else {
          results[api] = {
            status: response.status,
            success: false,
            error: await response.text()
          };
        }
      } catch (error) {
        results[api] = {
          success: false,
          error: `Erreur: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    return NextResponse.json({
      error: `Erreur lors du test des APIs: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
} 