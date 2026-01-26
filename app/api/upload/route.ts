// app/api/upload/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Types autorisés avec support des vidéos
    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/gif",
      "image/webp", "image/bmp", "image/svg+xml",
      "application/pdf",
      "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/avi"
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Type de fichier non autorisé: ${file.type}`,
        allowedTypes: allowedTypes
      }, { status: 400 });
    }

    // Limites de taille selon le type de fichier
    let maxSize = 10 * 1024 * 1024; // 10MB par défaut
    
    if (file.type.startsWith('video/')) {
      maxSize = 50 * 1024 * 1024; // 50MB pour les vidéos
    }
    
    if (title === "Vidéo" && file.type.startsWith('video/')) {
      maxSize = 100 * 1024 * 1024; // 100MB si c'est une vidéo explicite
    }

    if (file.size > maxSize) {
      const maxMB = maxSize / 1024 / 1024;
      return NextResponse.json({ 
        error: `Fichier trop volumineux (max ${maxMB}MB, actuel: ${(file.size / 1024 / 1024).toFixed(2)}MB)` 
      }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET!;

    if (!cloudName || !uploadPreset) {
      console.error("Variables Cloudinary manquantes:", {
        cloudName: !!cloudName,
        uploadPreset: !!uploadPreset
      });
      return NextResponse.json({ 
        error: "Configuration Cloudinary manquante. Vérifiez vos variables d'environnement." 
      }, { status: 500 });
    }

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("upload_preset", uploadPreset);
    cloudinaryForm.append("folder", "linkify");
    
    // Ajouter des tags pour l'organisation (paramètres autorisés)
    if (title) {
      cloudinaryForm.append("tags", `linkify,${title.toLowerCase()}`);
    }

    // Ajouter un nom de fichier personnalisé pour éviter les conflits
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalName = file.name.replace(/\.[^/.]+$/, ""); // Enlever l'extension
    const safeName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const publicId = `${safeName}_${timestamp}_${randomString}`;
    
    // Paramètres autorisés pour upload unsigned
    cloudinaryForm.append("public_id", publicId);
    
    // Pour les vidéos, ajouter des paramètres d'optimisation autorisés
    if (file.type.startsWith('video/')) {
      cloudinaryForm.append("resource_type", "video");
      
      // Seuls ces paramètres sont autorisés pour unsigned upload:
      // upload_preset, callback, public_id, folder, tags, context, metadata, etc.
      // NE PAS ajouter: eager, eager_async, transformation, etc.
      
      // Option: utiliser context pour stocker des métadonnées
      cloudinaryForm.append("context", `caption=${title || "video"}|alt=${file.name}`);
    }

    console.log(`Upload vers Cloudinary:`, {
      type: file.type,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      publicId: publicId,
      uploadPreset: uploadPreset
    });

    // Déterminer le type de ressource
    let resourceType = "image";
    if (file.type === "application/pdf") {
      resourceType = "raw";
    } else if (file.type.startsWith('video/')) {
      resourceType = "video";
    }

    // Upload vers Cloudinary avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
      console.log("URL Cloudinary:", cloudinaryUrl);
      
      const response = await fetch(cloudinaryUrl, { 
        method: "POST", 
        body: cloudinaryForm,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = await response.text();
        console.error("Cloudinary error response:", errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          const errorMsg = errorData.error?.message || "Erreur Cloudinary";
          
          // Suggestions basées sur l'erreur
          let suggestion = "";
          if (errorMsg.includes("unsigned")) {
            suggestion = "Vérifiez que votre upload preset est configuré pour accepter les vidéos.";
          } else if (errorMsg.includes("size")) {
            suggestion = "Le fichier est peut-être trop volumineux pour votre plan Cloudinary.";
          }
          
          return NextResponse.json({ 
            error: errorMsg,
            suggestion: suggestion
          }, { status: response.status });
        } catch {
          return NextResponse.json({ 
            error: `Erreur Cloudinary: ${response.status} ${response.statusText}` 
          }, { status: response.status });
        }
      }

      const data = await response.json();
      
      console.log("Cloudinary upload successful:", {
        public_id: data.public_id,
        format: data.format,
        bytes: data.bytes,
        resource_type: data.resource_type,
        url: data.secure_url
      });

      // Pour les vidéos, générer une URL de lecture
      let playableUrl = data.secure_url;
      
      if (resourceType === "video") {
        // Cloudinary génère automatiquement une URL de lecture pour les vidéos
        // Si vous voulez des transformations, vous pouvez les ajouter plus tard
        // Exemple: https://res.cloudinary.com/cloudname/video/upload/public_id.mp4
        playableUrl = data.secure_url;
        
        // Option: générer une URL avec des paramètres de lecture
        // playableUrl = data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      }

      return NextResponse.json({
        success: true,
        url: playableUrl,
        thumbnail: data.secure_url, // Pour les vidéos, c'est la même URL
        public_id: data.public_id,
        bytes: data.bytes,
        format: data.format,
        type: file.type,
        resource_type: resourceType,
        duration: data.duration, // Pour les vidéos
        width: data.width,
        height: data.height,
        original_filename: file.name
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: "Timeout: l'upload a pris trop de temps",
          suggestion: "Réduisez la taille de la vidéo ou essayez un format plus léger (MP4 avec compression)"
        }, { status: 408 });
      }
      
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }

  } catch (e: any) {
    console.error("Upload API error:", e);
    
    let errorMessage = "Erreur interne du serveur";
    let statusCode = 500;
    
    if (e.message.includes("NetworkError") || e.message.includes("fetch")) {
      errorMessage = "Erreur réseau. Vérifiez votre connexion internet.";
    } else if (e.message.includes("timeout")) {
      errorMessage = "Timeout lors de l'upload.";
      statusCode = 408;
    } else if (e.message.includes("CLOUDINARY")) {
      errorMessage = "Erreur de configuration Cloudinary.";
      statusCode = 500;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    }, { status: statusCode });
  }
}

// Route GET pour tester la configuration
export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  
  return NextResponse.json({
    status: "ok",
    message: "Upload API fonctionnelle",
    cloudinary_configured: !!(cloudName && uploadPreset),
    cloudinary: {
      cloud_name: cloudName ? "✓ configuré" : "✗ manquant",
      upload_preset: uploadPreset ? "✓ configuré" : "✗ manquant",
      note: uploadPreset ? "Vérifiez que le preset autorise les vidéos" : "Configurez CLOUDINARY_UPLOAD_PRESET"
    },
    supported_types: [
      "Images: JPEG, PNG, GIF, WebP, BMP, SVG",
      "PDF: application/pdf",
      "Vidéos: MP4, WebM, OGG, MOV, AVI"
    ],
    max_sizes: {
      images_pdf: "10MB",
      videos: "50-100MB"
    }
  });
}