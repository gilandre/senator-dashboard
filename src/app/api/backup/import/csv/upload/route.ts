import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Fonction pour lire le contenu d'un fichier
const readFileFromFormData = async (formData: FormData): Promise<{ buffer: Buffer; filename: string }> => {
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new Error('No file uploaded');
  }
  
  // Vérifier le type de fichier
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Only CSV files are allowed');
  }
  
  // Lire le contenu du fichier
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  return { buffer, filename: file.name };
};

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification de l'utilisateur
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Préparer le répertoire d'upload
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Créer le répertoire s'il n'existe pas
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    
    // Lire le formData de la requête
    const formData = await request.formData();
    const { buffer, filename } = await readFileFromFormData(formData);
    
    // Générer un nom de fichier unique pour éviter les collisions
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // Vérifier que le contenu est bien au format CSV
    const firstKb = buffer.slice(0, 1024).toString();
    if (!firstKb.includes(';')) {
      return NextResponse.json(
        { error: 'The file does not appear to be a valid CSV with semicolon delimiter' }, 
        { status: 400 }
      );
    }
    
    // Écrire le fichier sur le disque
    await writeFile(filePath, buffer);
    
    // Retourner le chemin du fichier pour le traitement ultérieur
    return NextResponse.json({ 
      success: true, 
      filePath, 
      originalFilename: filename,
      size: buffer.length,
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    
    return NextResponse.json(
      { 
        error: 'Error uploading file', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
} 