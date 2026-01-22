import { NextRequest, NextResponse } from "next/server";
import { toggleLike, getLikesCount } from "@/app/server";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  let linkId: string = "";
  
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Connectez-vous pour liker" },
        { status: 401 }
      );
    }

    ({ linkId } = await request.json());

    if (!linkId) {
      return NextResponse.json(
        { error: "ID du lien requis" },
        { status: 400 }
      );
    }

    // Toggle like avec vérification automatique du propriétaire
    const result = await toggleLike(linkId, userId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      liked: result.message.includes("ajouté"),
      likesCount: result.likesCount,
      message: result.message
    });
  } catch (error: any) {
    console.error("Erreur API like:", error);
    return NextResponse.json(
      { 
        error: error.message || "Erreur interne du serveur",
        likesCount: await getLikesCount(linkId)
      },
      { status: 500 }
    );
  }
}