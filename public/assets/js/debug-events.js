/**
 * Script de débogage pour les événements de l'interface
 * Utilisé temporairement pour diagnostiquer les problèmes d'événements
 */
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que tout soit chargé
    setTimeout(function() {
        console.group('%cDIAGNOSTIC ÉVÉNEMENTS INTERFACE', 'color: #e74c3c; font-weight: bold; font-size: 16px;');
        
        // Éléments à vérifier
        const elements = [
            { name: 'Toggle Sidebar', selector: '#sidebarCollapse' },
            { name: 'Menu Utilisateur', selector: '#userDropdown, .user-icon-btn' },
            { name: 'Sidebar', selector: '#sidebar, .sidebar' },
            { name: 'Contenu Principal', selector: '.main-content' }
        ];
        
        // Vérifier chaque élément
        elements.forEach(function(item) {
            const element = document.querySelector(item.selector);
            
            if (element) {
                console.group(`%c${item.name} (${element.tagName})`, 'color: #3498db; font-weight: bold;');
                console.log('Élément trouvé:', element);
                console.log('data-has-listeners:', element.getAttribute('data-has-listeners'));
                
                // Vérifier manuellement les click handlers
                const elementClone = element.cloneNode(true);
                const hasClickHandlers = element.onclick || 
                                        element.getAttribute('onclick') || 
                                        element.getAttribute('data-has-listeners');
                
                console.log('Handlers de clic détectés:', hasClickHandlers ? 'OUI' : 'NON');
                
                // Si c'est un bouton, ajouter un handler de test
                if (element.tagName === 'BUTTON' || element.classList.contains('btn') || 
                    element.id === 'sidebarCollapse' || element.id === 'userDropdown') {
                    
                    element.setAttribute('data-debug-click', 'true');
                    console.log('%cAjout d\'un handler de débogage sur cet élément', 'color: #2ecc71;');
                    
                    // Écouter les clics avec capture pour être sûr de l'intercepter
                    element.addEventListener('click', function(e) {
                        console.log(`%cÉvénement de clic détecté sur ${item.name}`, 
                                    'background: #2ecc71; color: white; padding: 2px 5px; border-radius: 3px;');
                    }, true);
                }
                
                console.groupEnd();
            } else {
                console.warn(`Élément non trouvé: ${item.name} (${item.selector})`);
            }
        });
        
        console.log('%cConseil: Vérifiez que les événements de clic sont détectés dans la console quand vous cliquez sur les éléments.', 
                   'color: #f39c12; font-weight: bold;');
        console.log('%cSi aucun événement n\'est détecté, il y a un problème avec l\'attachement des écouteurs.', 
                   'color: #f39c12;');
        
        console.groupEnd();
    }, 1000);
}); 