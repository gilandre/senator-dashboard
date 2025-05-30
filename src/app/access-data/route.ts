import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  
  try {
    // Vérifier si la donnée d'accès existe
    const existingLog = await prisma.access_logs.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingLog) {
      return NextResponse.json({ error: 'Access log not found' }, { status: 404 });
    }
    
    return NextResponse.json({ data: existingLog });
  } catch (error) {
    console.error('Error fetching access log:', error);
    return NextResponse.json({ error: 'Failed to fetch access log' }, { status: 500 });
  }
} 