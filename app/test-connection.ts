// app/test-connection.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Test de connexion à la base de données...');
    
    // Test 1: Compter les utilisateurs
    const userCount = await prisma.user.count();
    console.log(`✅ Nombre d'utilisateurs: ${userCount}`);
    
    // Test 2: Lister les utilisateurs
    const users = await prisma.user.findMany({
      select: { email: true, pseudo: true, id: true }
    });
    console.log('✅ Utilisateurs trouvés:', users);
    
    // Test 3: Compter les liens
    const linkCount = await prisma.socialLink.count();
    console.log(`✅ Nombre de liens: ${linkCount}`);
    
    // Test 4: Afficher quelques liens
    const links = await prisma.socialLink.findMany({
      take: 5,
      select: { title: true, url: true, pseudo: true }
    });
    console.log('✅ Liens trouvés:', links);
    
    await prisma.$disconnect();
    
  } catch (error: any) {
    console.error('❌ Erreur de connexion:', error.message);
    console.error('Détails:', error);
    
    // Vérifiez l'URL de la base de données
    const dbUrl = process.env.DATABASE_URL;
    console.log('URL de la base de données:', dbUrl ? 'Définie' : 'Non définie');
    if (dbUrl) {
      // Masque le mot de passe pour la sécurité
      const maskedUrl = dbUrl.replace(/:[^:]*@/, ':***@');
      console.log('URL (masquée):', maskedUrl);
    }
  }
}

testConnection();