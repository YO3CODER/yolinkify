// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    console.log("🔵 Début de l'upload...");
    
    const data = await req.formData();
    const file = data.get("file") as File;
    
    if (!file) {
      console.error("❌ Aucun fichier reçu");
      return NextResponse.json({ error: "Pas de fichier" }, { status: 400 });
    }

    console.log(`📁 Fichier reçu: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Vérifier le type de fichier
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ Type de fichier non autorisé: ${file.type}`);
      return NextResponse.json({ 
        error: "Type de fichier non autorisé. Utilisez une image (JPEG, PNG, GIF, WebP) ou un PDF." 
      }, { status: 400 });
    }

    // Vérifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error(`❌ Fichier trop volumineux: ${file.size} bytes`);
      return NextResponse.json({ 
        error: "Le fichier est trop volumineux (max 10MB)" 
      }, { status: 400 });
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      console.log(`📂 Création du dossier: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalName = file.name;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueName = `${baseName}_${timestamp}_${randomString}${extension}`;
    const filePath = path.join(uploadDir, uniqueName);

    console.log(`📝 Sauvegarde du fichier: ${filePath}`);

    // Convertir le fichier en buffer et l'écrire
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ Fichier sauvegardé avec succès: ${uniqueName}`);
    } catch (writeError) {
      console.error("❌ Erreur lors de l'écriture du fichier:", writeError);
      return NextResponse.json({ 
        error: "Erreur lors de l'écriture du fichier sur le serveur" 
      }, { status: 500 });
    }

    // Vérifier que le fichier a bien été écrit
    if (!fs.existsSync(filePath)) {
      console.error("❌ Le fichier n'a pas été créé");
      return NextResponse.json({ 
        error: "Erreur lors de la création du fichier" 
      }, { status: 500 });
    }

    // Retourner l'URL publique
    const publicUrl = `/uploads/${uniqueName}`;
    
    console.log(`🎉 Upload réussi! URL: ${publicUrl}`);
    
    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      filename: uniqueName,
      originalName: originalName,
      size: file.size,
      type: file.type,
      message: "Fichier uploadé avec succès"
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'upload:", error);
    
    let errorMessage = "Erreur inconnue lors de l'upload";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage 
    }, { status: 500 });
  }
}

// Optionnel : GET pour tester que l'API fonctionne
export async function GET() {
  return NextResponse.json({ 
    message: "API Upload fonctionnelle",
    endpoint: "/api/upload",
    method: "POST",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
    maxSize: "10MB"
  });
}