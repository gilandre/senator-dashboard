import { NextResponse } from 'next/server';

// GET /api/user-activities - Récupérer les activités récentes
export async function GET(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

// POST /api/user-activities - Enregistrer une nouvelle activité
export async function POST(request: Request) {
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

export async function DELETE(request: Request) {
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