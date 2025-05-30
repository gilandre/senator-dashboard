import { NextResponse } from 'next/server';

// GET /api/permissions/:id - Récupérer une permission spécifique
export async function GET(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

// PUT /api/permissions/:id - Mettre à jour une permission
export async function PUT(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

// DELETE /api/permissions/:id - Supprimer une permission
export async function DELETE(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

export async function POST(request: Request) {
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