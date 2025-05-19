// Ce script est un exemple pour tester le flux de changement de mot de passe
// Il utilise Playwright (mais pourrait être adapté pour Cypress)

import { test, expect } from '@playwright/test';

test('Flux complet de changement de mot de passe', async ({ page }) => {
  // Variables pour les tests
  const userEmail = 'gaegnakou@senator.com';
  const currentPassword = 'P@ssw0rd21';
  const newPassword = 'NewP@ssw0rd22';
  
  // Configurer un délai d'attente plus long pour ce test
  page.setDefaultTimeout(60000);
  
  console.log('1. Accès à la page de login');
  try {
    // 1. Accéder à la page de login
    await page.goto('http://localhost:3010/auth/login');
    
    console.log('2. Tentative de connexion');
    // 2. Se connecter avec les identifiants actuels
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', currentPassword);
    await page.click('button[type="submit"]');
    
    console.log('3. Vérification de la redirection');
    // 3. Attendre la redirection vers la page de changement de mot de passe (si nécessaire)
    try {
      await page.waitForURL('**/auth/change-password**', { timeout: 10000 });
      console.log('Redirigé vers la page de changement de mot de passe');
    } catch (e) {
      console.log('Pas redirigé vers la page de changement de mot de passe. Accès manuel à la page.');
      // Si l'utilisateur a déjà changé son mot de passe, accéder manuellement à la page
      await page.goto('http://localhost:3010/auth/change-password');
    }
    
    console.log('4. Remplissage du formulaire de changement de mot de passe');
    // 4. Remplir et soumettre le formulaire de changement de mot de passe
    // Attendre que les champs soient visibles
    await page.waitForSelector('[data-testid="current-password-input"]', { state: 'visible' });
    await page.fill('[data-testid="current-password-input"]', currentPassword);
    await page.fill('[data-testid="new-password-input"]', newPassword);
    await page.fill('[data-testid="confirm-password-input"]', newPassword);
    
    // Prendre une capture d'écran avant de soumettre
    await page.screenshot({ path: 'before-submit.png' });
    console.log('Formulaire rempli, soumission...');
    
    // Soumettre le formulaire
    await page.click('[data-testid="submit-button"]');
    
    console.log('5. Attente du message de succès');
    // 5. Attendre le message de succès - essayer différents sélecteurs
    try {
      // Prendre une capture d'écran immédiatement après la soumission
      await page.screenshot({ path: 'after-submit.png' });
      
      // Attendre un peu pour laisser le temps au serveur de répondre
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'after-delay.png' });
      
      // Vérifier si nous avons un message d'erreur
      const hasError = await page.locator('div:has(> .p-3.bg-red-50)').isVisible();
      if (hasError) {
        const errorText = await page.locator('div.p-3.bg-red-50 span, div[class*="bg-red"] span').textContent();
        console.error(`Erreur affichée dans le formulaire: ${errorText}`);
        await page.screenshot({ path: 'form-error.png' });
        throw new Error(`Erreur lors du changement de mot de passe: ${errorText}`);
      }
      
      // Essayer différents sélecteurs pour le message de succès
      const successSelectors = [
        'text=Mot de passe modifié avec succès',
        'h3:has-text("Mot de passe modifié")',
        '.text-green-600', 
        'div:has(> .h-12.w-12.text-green-500)',
        'button:has-text("Aller à la page de connexion")'
      ];
      
      let successFound = false;
      for (const selector of successSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`Message de succès trouvé avec le sélecteur: ${selector}`);
          successFound = true;
          break;
        } catch (e) {
          console.log(`Sélecteur non trouvé: ${selector}`);
        }
      }
      
      if (successFound) {
        console.log('Message de succès affiché');
        await page.screenshot({ path: 'success-message.png' });
      } else {
        console.error('Aucun sélecteur de succès trouvé');
        await page.screenshot({ path: 'no-success-selectors.png' });
        throw new Error('Aucun message de succès trouvé');
      }
    } catch (e) {
      console.error('Erreur: Message de succès non trouvé', e);
      // Prendre une capture d'écran de l'erreur
      await page.screenshot({ path: 'error-no-success.png' });
      throw e;
    }
    
    console.log('6. Redirection vers la page de login');
    // 6. Attendre la redirection vers la page de login ou y aller manuellement
    try {
      await page.waitForURL('**/auth/login**', { timeout: 10000 });
      console.log('Redirigé automatiquement vers la page de login');
    } catch (e) {
      console.log('Pas redirigé automatiquement, cliquer sur le bouton de redirection');
      await page.click('text=Aller à la page de connexion');
    }
    
    console.log('7. Reconnexion avec le nouveau mot de passe');
    // 7. Se connecter avec le nouveau mot de passe
    await page.waitForSelector('input[type="email"]', { state: 'visible' });
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', newPassword);
    await page.click('button[type="submit"]');
    
    console.log('8. Vérification de la redirection vers le dashboard');
    // 8. Vérifier qu'on est bien redirigé vers le dashboard
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
      console.log('Redirigé vers le dashboard avec succès');
      
      // Prendre une capture d'écran du dashboard
      await page.screenshot({ path: 'dashboard-success.png' });
    } catch (e) {
      console.error('Erreur: Non redirigé vers le dashboard', e);
      // Prendre une capture d'écran de l'erreur
      await page.screenshot({ path: 'error-no-dashboard.png' });
      throw e;
    }
    
    // 9. Facultatif: Restaurer l'ancien mot de passe pour les tests suivants
    console.log('Test terminé avec succès');
    
  } catch (error) {
    console.error('Erreur lors du test:', error);
    // Prendre une capture d'écran de l'erreur générale
    await page.screenshot({ path: 'error-general.png' });
    throw error;
  }
}); 