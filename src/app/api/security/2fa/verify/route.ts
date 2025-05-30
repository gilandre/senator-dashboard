import { NextResponse } from 'next/server';

// POST /api/security/2fa/verify - Vérifier un code 2FA
export async function POST(req: Request) {
  return NextResponse.json({
    error: "Fonctionnalité temporairement désactivée",
    message: "Cette route est en cours de maintenance"
  }, { status: 503 });
} 