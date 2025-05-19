// Script pour interroger l'API des visiteurs en gérant l'authentification
require('dotenv').config();
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Configuration
const BASE_URL = process.env.APP_URL || 'http://localhost:3010';
const EMAIL = 'admin@senator.com';
const PASSWORD = 'P@ssw0rd123';

// Créer un jar de cookies et configurer axios
const jar = new CookieJar();
const client = wrapper(axios.create({ 
  jar,
  withCredentials: true,
  baseURL: BASE_URL
}));

async function getVisitorsFromAPI() {
  try {
    console.log(`Connexion à l'API: ${BASE_URL}...`);
    
    // 1. Se connecter pour obtenir la session
    const loginResponse = await client.post('/api/auth/login', {
      email: EMAIL,
      password: PASSWORD
    });
    
    console.log('Statut de connexion:', loginResponse.status);
    console.log('Utilisateur connecté:', loginResponse.data.user?.name || 'Inconnu');
    
    // 2. Récupérer les visiteurs
    console.log('\nRécupération des visiteurs depuis l\'API...');
    const visitorsResponse = await client.get('/api/visitors', {
      params: {
        page: 1,
        limit: 10,
        search: '',
        status: ''
      }
    });
    
    console.log('Statut de la requête visiteurs:', visitorsResponse.status);
    
    const { visitors, total, totalPages, companies } = visitorsResponse.data;
    
    // Afficher les résultats
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
    
  } catch (error) {
    console.error('Erreur:', error.message);
    
    if (error.response) {
      console.error('Statut:', error.response.status);
      console.error('Données:', error.response.data);
    }
  }
}

// Exécuter la fonction
getVisitorsFromAPI()
  .then(() => {
    console.log('\nTerminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 