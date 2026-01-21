"use server"

import prisma from "@/lib/prisma";
import { SocialLink } from "@prisma/client";

export async function generateUniquePseudo(base: string) {
    let pseudo = base;
    let count = 1;

    while (await prisma.user.findUnique({ where: { pseudo } })) {
        pseudo = `${base}${count}`;
        count++;
    }

    return pseudo;
}

export async function checkAndAddUser(email: string, name: string) {
    if (!email) return;

    try {
        const existingUser = await prisma.user.findUnique(
            {
                where: { email }
            }
        )

        if (!existingUser && name) {
            const basePseudo = name.toLocaleLowerCase().replace(/\s+/g, "_");
            const pseudo = await generateUniquePseudo(basePseudo);
            await prisma.user.create({
                data: { email, name, pseudo }
            });
        }
    } catch (error) {
        console.error(error);
    }
}

export async function getUserInfo(identifier: string) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { pseudo: identifier }]
            },
            select: { pseudo: true, theme: true }
        });

        return {
            pseudo: user?.pseudo,
            theme: user?.theme
        };
    } catch (error) {
        console.error(error);
    }
}

export async function addSocialLink(
    email: string,
    title: string,
    url: string,
    pseudo: string,
    description?: string,
    fileType?: "pdf" | "image" | "url",
) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const newLink = await prisma.socialLink.create({
            data: {
                userId: user.id,
                title,
                url,
                pseudo,
                description,
                fileType: fileType || "url",
            },
        });

        return newLink;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getSocialLinks(identifier: string) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { pseudo: identifier }]
            },
        });

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const isEmail = identifier.includes('@');
        let socialLinks: SocialLink[] = [];

        if (isEmail) {
            socialLinks = await prisma.socialLink.findMany({
                where: { userId: user.id }
            });
        } else {
            socialLinks = await prisma.socialLink.findMany({
                where: {
                    userId: user.id,
                    active: true,
                }
            });
        }
        return socialLinks;

    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function toggleSocialLinkActive(linkId: string) {
    try {
        const socialLink = await prisma.socialLink.findUnique({
            where: { id: linkId }
        });

        if (!socialLink) {
            throw new Error("Lien social non trouvé");
        }
        const updatedLink = await prisma.socialLink.update({
            where: { id: linkId },
            data: { active: !socialLink.active }
        });

        return updatedLink;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateSocialdLink(linkId: string, data: { title?: string, url?: string, pseudo?: string, description?: string }) {
    if (!linkId) {
        throw new Error("L'ID du lien est requis.");
    }
    try {
        const updatedLink = await prisma.socialLink.update({
            where: { id: linkId },
            data
        });
        return updatedLink;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function removeSocialLink(email: string, linkId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const socialLink = await prisma.socialLink.findUnique({
            where: { id: linkId }
        });

        if (!socialLink) {
            throw new Error("Lien non trouvé");
        }

        if (socialLink.userId != user.id) {
            throw new Error("Vous n'avez pas la permission de supprimer ce lien");
        }

        await prisma.socialLink.delete({
            where: { id: linkId }
        });

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
}

export async function incrementClickCount(linkId: string) {
    try {
        const updatedLink = await prisma.socialLink.update({
            where: { id: linkId },
            data: {
                clicks: {
                    increment: 1
                }
            }
        });
        return updatedLink;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateUserTheme(email: string, newTheme: string) {
    try {
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { theme: newTheme }
        });
        return updatedUser;
    } catch (error) {
        console.error("Erreur lors de la mise à jour du thème :", error);
        throw error;
    }
}
// ========== FONCTIONS POUR GÉRER LES LIKES (VERSION CORRIGÉE) ==========

// Ajouter un like
export async function addLike(socialLinkId: string, userId: string) {
    try {
        // Vérifier si l'utilisateur a déjà liké ce lien avec SQL
        const existingLike: any[] = await prisma.$queryRaw`
            SELECT id FROM likes 
            WHERE "socialLinkId" = ${socialLinkId} AND "userid" = ${userId}
            LIMIT 1
        `;

        if (existingLike && existingLike.length > 0) {
            return { 
                success: false, 
                likesCount: await getLikesCount(socialLinkId),
                message: "Vous avez déjà liké ce lien" 
            };
        }

        // Créer le like avec SQL - CORRECTION: "createdat" au lieu de "createdAt"
        await prisma.$executeRaw`
            INSERT INTO likes (id, "socialLinkId", "userid", "createdat")
            VALUES (gen_random_uuid(), ${socialLinkId}, ${userId}, NOW())
        `;

        // Récupérer le nouveau nombre de likes
        const likesCount = await getLikesCount(socialLinkId);

        return { 
            success: true, 
            likesCount,
            message: "Like ajouté avec succès" 
        };
    } catch (error) {
        console.error('Erreur lors de l\'ajout du like:', error);
        return { 
            success: false, 
            likesCount: 0,
            message: "Erreur lors de l'ajout du like" 
        };
    }
}

// Retirer un like
export async function removeLike(socialLinkId: string, userId: string) {
    try {
        // Supprimer le like avec SQL
        await prisma.$executeRaw`
            DELETE FROM likes 
            WHERE "socialLinkId" = ${socialLinkId} AND "userid" = ${userId}
        `;

        // Récupérer le nouveau nombre de likes
        const likesCount = await getLikesCount(socialLinkId);

        return { 
            success: true, 
            likesCount,
            message: "Like retiré avec succès" 
        };
    } catch (error) {
        console.error('Erreur lors de la suppression du like:', error);
        return { 
            success: false, 
            likesCount: await getLikesCount(socialLinkId),
            message: "Erreur lors de la suppression du like" 
        };
    }
}

// Obtenir le nombre de likes pour un lien
export async function getLikesCount(socialLinkId: string) {
    try {
        const result: any[] = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM likes 
            WHERE "socialLinkId" = ${socialLinkId}
        `;
        
        return Number(result[0]?.count || 0);
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre de likes:', error);
        return 0;
    }
}

// Vérifier si l'utilisateur actuel a liké un lien
export async function hasUserLiked(socialLinkId: string, userId: string) {
    try {
        const result: any[] = await prisma.$queryRaw`
            SELECT id FROM likes 
            WHERE "socialLinkId" = ${socialLinkId} AND "userid" = ${userId}
            LIMIT 1
        `;
        
        return result && result.length > 0;
    } catch (error) {
        console.error('Erreur lors de la vérification du like:', error);
        return false;
    }
}

// Récupérer tous les liens avec leurs likes
export async function getSocialLinksWithLikes(identifier: string, currentUserId?: string) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { pseudo: identifier }]
            },
        });

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const isEmail = identifier.includes('@');
        let socialLinks;

        // Récupérer les liens
        if (isEmail) {
            socialLinks = await prisma.socialLink.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            socialLinks = await prisma.socialLink.findMany({
                where: {
                    userId: user.id,
                    active: true,
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        // Pour chaque lien, récupérer le nombre de likes et si l'utilisateur a liké
        const linksWithLikes = await Promise.all(
            socialLinks.map(async (link) => {
                const likesCount = await getLikesCount(link.id);
                let isLikedByCurrentUser = false;
                
                if (currentUserId) {
                    isLikedByCurrentUser = await hasUserLiked(link.id, currentUserId);
                }

                return {
                    ...link,
                    likesCount,
                    isLikedByCurrentUser
                };
            })
        );

        return linksWithLikes;
    } catch (error) {
        console.error('Erreur lors de la récupération des liens avec likes:', error);
        return [];
    }
}

// Basculer l'état like/unlike
export async function toggleLike(socialLinkId: string, userId: string) {
    try {
        // Vérifier si l'utilisateur a déjà liké
        const hasLiked = await hasUserLiked(socialLinkId, userId);
        
        if (hasLiked) {
            // Retirer le like
            return await removeLike(socialLinkId, userId);
        } else {
            // Ajouter le like
            return await addLike(socialLinkId, userId);
        }
    } catch (error) {
        console.error('Erreur lors du basculement du like:', error);
        return { 
            success: false, 
            likesCount: await getLikesCount(socialLinkId),
            message: "Erreur lors du basculement du like" 
        };
    }
}