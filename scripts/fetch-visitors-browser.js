// Script pour récupérer les visiteurs via un navigateur headless
require('dotenv').config();
const puppeteer = require('puppeteer');

// Configuration
const BASE_URL = process.env.APP_URL || 'http://localhost:3010';
const EMAIL = 'admin@senator.com';
const PASSWORD = 'P@ssw0rd123';

async function getVisitorsWithBrowser() {
  console.log(`Lancement du navigateur pour accéder à ${BASE_URL}...`);
  
  const browser = await puppeteer.launch({
    headless: false, // Pour voir ce qui se passe (debug)
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Activer la capture des réponses réseau
    let visitorsData = null;
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/visitors') && response.status() === 200) {
        try {
          const data = await response.json();
          visitorsData = data;
          console.log('Données visiteurs capturées avec succès!');
        } catch (e) {
          console.error('Erreur lors de la capture des données:', e);
        }
      }
    });
    
    // Naviguer vers la page de connexion
    console.log('Accès à la page de connexion...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Se connecter
    console.log('Saisie des identifiants...');
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    
    // Cliquer sur le bouton de connexion
    console.log('Soumission du formulaire...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    // Vérifier si connecté
    const url = page.url();
    if (url.includes('/login')) {
      throw new Error('Échec de la connexion. Vérifiez les identifiants.');
    }
    
    console.log('Connexion réussie!');
    
    // Naviguer vers la page des visiteurs
    console.log('Navigation vers la page des visiteurs...');
    await page.goto(`${BASE_URL}/visitors`, { waitUntil: 'networkidle2' });
    
    // Attendre que les données soient chargées
    console.log('Attente du chargement des données...');
    await page.waitForTimeout(2000);
    
    // Vérifier si nous avons les données
    if (!visitorsData) {
      console.log('Tentative de récupération manuelle des données...');
      // Exécuter du code dans le navigateur pour récupérer les données
      visitorsData = await page.evaluate(async () => {
        const response = await fetch('/api/visitors?page=1&limit=10', {
          credentials: 'include'
        });
        return await response.json();
      });
    }
    
    // Afficher les données
    if (visitorsData) {
      const { visitors, total, totalPages, companies } = visitorsData;
      
      console.log(`\nTrouvé ${total} visiteurs (Page 1/${totalPages})`);
      
      if (visitors.length === 0) {
        console.log('Aucun visiteur trouvé.');
      } else {
        console.table(visitors.map(v => ({
          id: v.id,
          badge: v.badge_number,
          nom: `${v.first_name} ${v.last_name}`,
          entreprise: v.company,
          statut: v.status,
          accès: v.access_count,
          dernière_visite: v.last_seen ? new Date(v.last_seen).toLocaleString() : 'Jamais'
        })));
      }
      
      // Afficher les entreprises
      console.log('\nEntreprises:');
      console.log(companies);
      
      // Afficher les badges partagés
      const sharedBadges = visitors.filter(v => v.isSharedBadge);
      console.log('\nBadges partagés:');
      
      if (sharedBadges.length === 0) {
        console.log('Aucun badge partagé trouvé.');
      } else {
        console.table(sharedBadges.map(v => ({
          badge: v.badge_number,
          utilisateurs: v.badgeHistory?.length || 0
        })));
      }
    } else {
      console.log('Impossible de récupérer les données des visiteurs.');
    }
    
    // Faire une capture d'écran
    await page.screenshot({ path: 'visitors-page.png' });
    console.log('Capture d\'écran enregistrée dans visitors-page.png');
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    // Fermer le navigateur
    await browser.close();
    console.log('Navigateur fermé.');
  }
}

// Exécuter la fonction
getVisitorsWithBrowser()
  .then(() => {
    console.log('Terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 