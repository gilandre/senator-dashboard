import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({
    error: 'Fonction temporairement désactivée',
    message: 'La route d\'importation CSV est en cours de maintenance'
  }, { status: 503 }); // 503 Service Unavailable
} 