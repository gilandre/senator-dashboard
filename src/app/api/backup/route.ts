import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/employees/:id - Récupérer un employé par ID
export async function GET(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

// PUT /api/employees/:id - Mettre à jour un employé
export async function PUT(request: Request) {
  return NextResponse.json({
    error: 'Routes de sauvegarde désactivées',
    message: 'Les routes de sauvegarde MongoDB ont été désactivées en faveur de Prisma/MySQL'
  }, { status: 410 }); // 410 Gone
}

// DELETE /api/employees/:id - Supprimer un employé
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