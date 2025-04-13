/**
 * SENATOR Dashboard - Script de compatibilité et récupération d'erreurs
 * Ce script intercepte les erreurs JavaScript et tente de les corriger automatiquement
 * Version 1.0
 */
(function() {
    // Activer le mode debug
    const DEBUG = true;
    
    // Fonction de log
    function debug(message) {
        if (DEBUG) {
            console.log('%c[COMPAT] ' + message, 'color: #e67e22; font-weight: bold;');
        }
    }
    
    // Intercepter les erreurs JavaScript
    window.addEventListener('error', function(event) {
        debug('Erreur interceptée: ' + event.message);
        debug('Fichier: ' + event.filename);
        debug('Ligne: ' + event.lineno + ', Colonne: ' + event.colno);
        
        // Essayer de récupérer automatiquement certaines erreurs connues
        if (event.message.includes('getAttribute is not a function')) {
            debug('Tentative de récupération de l\'erreur getAttribute...');
            fixGetAttributeError();
            return true; // Indiquer que l'erreur a été gérée
        }
        
        if (event.message.includes('undefined is not an object')) {
            debug('Tentative de récupération d\'une erreur d\'objet undefined...');
            fixUndefinedObjectError();
            return true;
        }
        
        return false; // Laisser les autres erreurs se propager normalement
    });
    
    // Correctif pour les erreurs getAttribute
    function fixGetAttributeError() {
        // Fournir une méthode getAttribute de secours pour tous les objets
        Object.prototype.safeGetAttribute = function(attr) {
            if (this instanceof Element) {
                return this.getAttribute(attr);
            }
            return null;
        };
        
        // Réinitialiser les menus et boutons problématiques
        setTimeout(function() {
            try {
                debug('Réparation des menus et boutons...');
                
                // Trouver les boutons de toggle et menu
                const toggleBtn = document.querySelector('#sidebarCollapse');
                const userBtn = document.querySelector('#userDropdown, .user-icon-btn');
                
                if (toggleBtn) {
                    debug('Réparation du bouton toggle sidebar...');
                    // Supprimer puis réattacher les écouteurs d'événements
                    const newToggleBtn = toggleBtn.cloneNode(true);
                    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
                    
                    newToggleBtn.addEventListener('click', function() {
                        const sidebar = document.querySelector('#sidebar, .sidebar');
                        if (sidebar) {
                            sidebar.classList.toggle('collapsed');
                            document.body.classList.toggle('sidebar-collapsed');
                            
                            // Changer l'icône
                            const icon = newToggleBtn.querySelector('i');
                            if (icon) {
                                if (sidebar.classList.contains('collapsed')) {
                                    icon.classList.remove('fa-chevron-left');
                                    icon.classList.add('fa-chevron-right');
                                } else {
                                    icon.classList.remove('fa-chevron-right');
                                    icon.classList.add('fa-chevron-left');
                                }
                            }
                        }
                    });
                }
                
                if (userBtn) {
                    debug('Réparation du menu utilisateur...');
                    // Supprimer puis réattacher les écouteurs d'événements
                    const newUserBtn = userBtn.cloneNode(true);
                    userBtn.parentNode.replaceChild(newUserBtn, userBtn);
                    
                    newUserBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const userMenu = document.querySelector('#userDropdownMenu, .custom-dropdown-menu');
                        if (userMenu) {
                            if (userMenu.classList.contains('show')) {
                                userMenu.classList.remove('show');
                                userMenu.style.display = 'none';
                            } else {
                                userMenu.classList.add('show');
                                userMenu.style.display = 'block';
                            }
                        }
                    });
                }
                
                debug('Réparation terminée!');
            } catch (error) {
                debug('Échec de la réparation: ' + error.message);
            }
        }, 500);
    }
    
    // Correctif pour les erreurs d'objet undefined
    function fixUndefinedObjectError() {
        setTimeout(function() {
            try {
                debug('Réparation des références undefined...');
                
                // Réinitialiser les menus
                const userMenu = document.querySelector('#userDropdownMenu, .custom-dropdown-menu');
                if (userMenu) {
                    userMenu.style.display = 'none';
                    userMenu.classList.remove('show');
                }
                
                debug('Réparation terminée!');
            } catch (error) {
                debug('Échec de la réparation: ' + error.message);
            }
        }, 500);
    }
    
    // Initialisation de la compatibilité
    function init() {
        debug('Script de compatibilité initialisé');
        
        // Vérifier si jQuery est présent 
        if (typeof jQuery !== 'undefined') {
            debug('jQuery détecté (version ' + jQuery.fn.jquery + ')');
            
            // S'assurer que les événements jQuery sont correctement gérés
            jQuery(document).ready(function($) {
                debug('Document prêt (jQuery)');
                
                // Compatibilité bootstrap
                if (typeof bootstrap !== 'undefined') {
                    debug('Bootstrap détecté');
                }
            });
        } else {
            debug('jQuery non détecté');
        }
        
        // Vérifier si d'autres bibliothèques sont présentes
        if (typeof bootstrap !== 'undefined') {
            debug('Bootstrap détecté sans jQuery');
        }
    }
    
    // Initialiser quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Exposer les fonctions utiles globalement (pour le débogage)
    window.senatorCompat = {
        debug: debug,
        fixGetAttributeError: fixGetAttributeError,
        fixUndefinedObjectError: fixUndefinedObjectError
    };
    
    debug('Script de compatibilité chargé');
})(); 