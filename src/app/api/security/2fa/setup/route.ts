import { NextResponse } from 'next/server';

// GET /api/security/2fa/setup - Obtenir le QR code pour configurer le 2FA
export async function GET(req: Request) {
  return NextResponse.json({
    error: "Fonctionnalité temporairement désactivée",
    message: "Cette route est en cours de maintenance"
  }, { status: 503 });
}

// POST /api/security/2fa/setup - Vérifier et activer le 2FA
export async function POST(req: Request) {
  return NextResponse.json({
    error: "Fonctionnalité temporairement désactivée",
    message: "Cette route est en cours de maintenance"
  }, { status: 503 });
}

// DELETE /api/security/2fa/setup - Désactiver le 2FA
export async function DELETE(req: Request) {
  return NextResponse.json({
    error: "Fonctionnalité temporairement désactivée",
    message: "Cette route est en cours de maintenance"
  }, { status: 503 });
} 