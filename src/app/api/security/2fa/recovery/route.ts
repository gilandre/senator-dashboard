import { NextResponse } from 'next/server';

// GET /api/security/2fa/recovery - Récupérer les codes de récupération
export async function GET(req: Request) {
  return NextResponse.json({
    error: "Fonctionnalité temporairement désactivée",
    message: "Cette route est en cours de maintenance"
  }, { status: 503 });
}

// POST /api/security/2fa/recovery/verify - Vérifier un code de récupération
export async function POST(req: Request) {
  return NextResponse.json({
    error: "Fonctionnalité temporairement désactivée",
    message: "Cette route est en cours de maintenance"
  }, { status: 503 });
}

// PUT /api/security/2fa/recovery/generate - Générer de nouveaux codes de récupération
export async function PUT(req: Request) {
  return NextResponse.json({
    error: "Fonctionnalité temporairement désactivée",
    message: "Cette route est en cours de maintenance"
  }, { status: 503 });
} 