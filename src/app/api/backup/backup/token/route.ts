import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/database";
import User, { IUser } from "@/models/User";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";

/**
 * Endpoint pour générer un token JWT à utiliser pour les tests d'API
 * POST /api/token
 * Body: { email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Rechercher l'utilisateur par email
    const user = await User.findOne({ email }) as IUser & { _id: Types.ObjectId };

    // Si l'utilisateur n'existe pas
    if (!user) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      );
    }

    // Vérifier le statut de l'utilisateur
    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Compte désactivé" },
        { status: 401 }
      );
    }

    // Comparer le mot de passe
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    // Si le mot de passe est incorrect
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      );
    }

    // Créer le payload du token
    const payload = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "user"
    };

    // Générer le token JWT
    const token = jwt.sign(
      payload,
      process.env.NEXTAUTH_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    // Retourner le token
    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Erreur lors de la génération du token:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du token" },
      { status: 500 }
    );
  }
} 