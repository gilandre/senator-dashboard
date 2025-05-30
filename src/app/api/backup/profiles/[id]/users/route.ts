import { NextResponse } from 'next/server';

// GET /api/profiles/:id/users - Récupérer les utilisateurs avec un profil spécifique
export async function GET(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

// POST /api/profiles/:id/users - Ajouter un utilisateur à un profil
export async function POST(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

// DELETE /api/profiles/:id/users - Retirer un utilisateur d'un profil
export async function DELETE(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

export async function PUT(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

export async function PATCH(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
} 