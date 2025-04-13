/**
 * SENATOR Dashboard - Gestionnaire d'interface unifié
 * Ce script gère à la fois le toggle du sidebar et le menu déroulant utilisateur
 * Version 3.2 - Solution sans conflit
 */
(function() {
    'use strict';
    
    // Variables globales
    let sidebarElement = null;
    let sidebarToggleBtn = null;
    let mainContentElement = null;
    let userDropdownBtn = null;
    let userDropdownMenu = null;
    let isInterfaceInitialized = false;
    
    // Configuration
    const config = {
        debug: true,
        sidebarStorageKey: 'sidebarState',
        selectors: {
            sidebar: '#sidebar',
            sidebarToggle: '#sidebarCollapse',
            mainContent: '.main-content',
            userDropdownBtn: '#userDropdown, .user-icon-btn',
            userDropdownMenu: '#userDropdownMenu, .custom-dropdown-menu',
            dropdownItems: '.custom-dropdown-item'
        },
        classes: {
            collapsed: 'collapsed',
            bodyCollapsed: 'sidebar-collapsed',
            expanded: 'expanded',
            show: 'show'
        }
    };
    
    /**
     * Fonction de logging avec niveau de debug
     */
    function log(message, type = 'info', data = null) {
        if (!config.debug) return;
        
        const styles = {
            info: 'color: #3498db; font-weight: bold;',
            error: 'color: #e74c3c; font-weight: bold;',
            success: 'color: #2ecc71; font-weight: bold;',
            warning: 'color: #f39c12; font-weight: bold;'
        };
        
        const prefix = '[SENATOR UI]';
        
        if (data) {
            console.groupCollapsed(`%c${prefix} ${message}`, styles[type]);
            console.log(data);
            console.groupEnd();
        } else {
            console.log(`%c${prefix} ${message}`, styles[type]);
        }
    }
    
    /**
     * Sélection d'éléments avec fallbacks
     * @param {string} selector - Chaîne de sélecteurs séparés par des virgules
     * @return {Element|null} - Premier élément trouvé ou null
     */
    function selectElement(selector) {
        log(`Recherche d'élément avec le sélecteur: "${selector}"`, 'info');
        
        // Diviser le sélecteur en options séparées par des virgules
        const options = selector.split(',').map(s => s.trim());
        
        // Essayer chaque option jusqu'à ce qu'un élément soit trouvé
        for (const option of options) {
            try {
                const element = document.querySelector(option);
                if (element) {
                    log(`Élément trouvé avec le sélecteur: "${option}"`, 'success');
                    if (!(element instanceof Element)) {
                        log(`ATTENTION: L'élément trouvé n'est pas un objet DOM valide`, 'error', element);
                    }
                    return element;
                }
            } catch (error) {
                log(`Erreur lors de la recherche avec le sélecteur: "${option}"`, 'error', error);
            }
        }
        
        log(`Aucun élément trouvé avec les sélecteurs: ${selector}`, 'warning');
        return null;
    }
    
    /**
     * Initialise les références aux éléments DOM
     */
    function initElements() {
        log('Initialisation des éléments DOM');
        
        try {
            sidebarElement = selectElement(config.selectors.sidebar);
            sidebarToggleBtn = selectElement(config.selectors.sidebarToggle);
            mainContentElement = selectElement(config.selectors.mainContent);
            userDropdownBtn = selectElement(config.selectors.userDropdownBtn);
            userDropdownMenu = selectElement(config.selectors.userDropdownMenu);
            
            // Vérifier que tous les éléments sont des objets DOM valides
            const validation = {
                sidebar: sidebarElement instanceof Element,
                sidebarToggle: sidebarToggleBtn instanceof Element,
                mainContent: mainContentElement instanceof Element,
                userDropdownBtn: userDropdownBtn instanceof Element,
                userDropdownMenu: userDropdownMenu instanceof Element
            };
            
            log('Validation des éléments DOM:', 'info', validation);
            
            if (!validation.userDropdownBtn || !validation.userDropdownMenu) {
                log('Éléments dropdown non valides, tentative avec des sélecteurs directs', 'warning');
                
                // Tenter avec des sélecteurs plus spécifiques
                if (!validation.userDropdownBtn) {
                    userDropdownBtn = document.getElementById('userDropdown');
                    if (!userDropdownBtn) {
                        userDropdownBtn = document.querySelector('.user-icon-btn');
                    }
                }
                
                if (!validation.userDropdownMenu) {
                    userDropdownMenu = document.getElementById('userDropdownMenu');
                    if (!userDropdownMenu) {
                        userDropdownMenu = document.querySelector('.custom-dropdown-menu');
                    }
                }
                
                log('Résultat après tentative directe:', 'info', {
                    userDropdownBtn: userDropdownBtn instanceof Element,
                    userDropdownMenu: userDropdownMenu instanceof Element
                });
            }
            
            // Vérifier que tous les éléments sont trouvés
            const elementsStatus = {
                sidebar: sidebarElement !== null,
                sidebarToggle: sidebarToggleBtn !== null,
                mainContent: mainContentElement !== null,
                userDropdownBtn: userDropdownBtn !== null,
                userDropdownMenu: userDropdownMenu !== null
            };
            
            log('Statut des éléments DOM:', 'info', elementsStatus);
            
            // Si userDropdownBtn est trouvé mais pas userDropdownMenu,
            // chercher un menu dropdown à proximité
            if (elementsStatus.userDropdownBtn && !elementsStatus.userDropdownMenu) {
                log('Recherche alternative du menu dropdown utilisateur', 'warning');
                const parentContainer = userDropdownBtn.closest('.dropdown-container');
                if (parentContainer) {
                    userDropdownMenu = parentContainer.querySelector('.custom-dropdown-menu, .dropdown-menu');
                    if (userDropdownMenu) {
                        log('Menu dropdown trouvé via recherche alternative', 'success');
                        elementsStatus.userDropdownMenu = true;
                    }
                }
            }
            
            return Object.values(elementsStatus).every(status => status === true);
        } catch (error) {
            log('Erreur lors de l\'initialisation des éléments DOM:', 'error', error);
            return false;
        }
    }
    
    /**
     * Vérifie si un élément a déjà un écouteur d'événement attaché
     * (méthode approximative basée sur les données personnalisées)
     */
    function hasEventListener(element, eventName) {
        if (!element) return false;
        
        // Vérifier que l'élément est un objet DOM qui possède la méthode getAttribute
        if (!(element instanceof Element) || typeof element.getAttribute !== 'function') {
            return false;
        }
        
        // Vérifier si l'élément a un attribut data-has-listeners
        const hasListeners = element.getAttribute('data-has-listeners');
        return hasListeners && hasListeners.includes(eventName);
    }
    
    /**
     * Marque un élément comme ayant un écouteur d'événement attaché
     */
    function markWithEventListener(element, eventName) {
        if (!element) return;
        
        // Vérifier que l'élément est un objet DOM qui possède la méthode getAttribute
        if (!(element instanceof Element) || typeof element.getAttribute !== 'function') {
            return;
        }
        
        // Récupérer la liste actuelle des écouteurs
        let listeners = element.getAttribute('data-has-listeners') || '';
        if (!listeners.includes(eventName)) {
            listeners = listeners ? listeners + ',' + eventName : eventName;
            element.setAttribute('data-has-listeners', listeners);
        }
    }
    
    /**
     * Configure le toggle du sidebar
     */
    function setupSidebarToggle() {
        if (!sidebarElement || !sidebarToggleBtn) {
            log('Éléments sidebar manquants, impossible de configurer le toggle', 'error');
            return false;
        }
        
        // Vérifier si le bouton a déjà un écouteur d'événement
        if (hasEventListener(sidebarToggleBtn, 'click')) {
            log('Le bouton toggle sidebar a déjà un écouteur d\'événement, configuration ignorée', 'warning');
            return true;
        }
        
        log('Configuration du toggle sidebar');
        
        // Ajouter l'écouteur d'événements SANS cloner le bouton
        sidebarToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            log('Clic sur le bouton toggle sidebar');
            
            // Toggle des classes
            sidebarElement.classList.toggle(config.classes.collapsed);
            document.body.classList.toggle(config.classes.bodyCollapsed);
            
            if (mainContentElement) {
                mainContentElement.classList.toggle(config.classes.expanded);
            }
            
            // Changer l'icône
            const icon = sidebarToggleBtn.querySelector('i');
            if (icon) {
                if (sidebarElement.classList.contains(config.classes.collapsed)) {
                    icon.classList.remove('fa-chevron-left');
                    icon.classList.add('fa-chevron-right');
                    log('Sidebar réduite');
                } else {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-left');
                    log('Sidebar étendue');
                }
            }
            
            // Sauvegarder l'état
            const state = sidebarElement.classList.contains(config.classes.collapsed) ? 'collapsed' : 'expanded';
            localStorage.setItem(config.sidebarStorageKey, state);
        });
        
        // Marquer le bouton comme ayant un écouteur d'événement
        markWithEventListener(sidebarToggleBtn, 'click');
        
        // Restaurer l'état précédent
        restoreSidebarState();
        
        log('Toggle sidebar configuré avec succès', 'success');
        return true;
    }
    
    /**
     * Restaure l'état précédent du sidebar depuis le localStorage
     */
    function restoreSidebarState() {
        const savedState = localStorage.getItem(config.sidebarStorageKey);
        
        if (savedState === 'collapsed') {
            log('Restauration de l\'état réduit du sidebar');
            
            sidebarElement.classList.add(config.classes.collapsed);
            document.body.classList.add(config.classes.bodyCollapsed);
            
            if (mainContentElement) {
                mainContentElement.classList.add(config.classes.expanded);
            }
            
            const icon = sidebarToggleBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        }
    }
    
    /**
     * Configure le menu déroulant utilisateur
     */
    function setupUserDropdown() {
        if (!userDropdownBtn || !userDropdownMenu) {
            log('Éléments du menu utilisateur manquants, impossible de configurer le dropdown', 'error');
            
            // Log des valeurs pour le débogage
            log('userDropdownBtn =', 'error', userDropdownBtn);
            log('userDropdownMenu =', 'error', userDropdownMenu);
            
            // Tenter de récupérer les éléments par sélecteurs alternatifs
            const altUserBtn = document.querySelector('.user-icon-btn') || document.getElementById('userDropdown');
            const altUserMenu = document.querySelector('.custom-dropdown-menu') || document.getElementById('userDropdownMenu');
            
            log('Sélecteurs alternatifs :', 'warning', {
                'altUserBtn': altUserBtn,
                'altUserMenu': altUserMenu
            });
            
            if (altUserBtn && altUserMenu) {
                log('Éléments trouvés via sélecteurs alternatifs, tentative de récupération', 'info');
                userDropdownBtn = altUserBtn;
                userDropdownMenu = altUserMenu;
            } else {
                return false;
            }
        }
        
        // Vérifier que les éléments sont bien des objets DOM
        if (!(userDropdownBtn instanceof Element) || !(userDropdownMenu instanceof Element)) {
            log('Les éléments ne sont pas des objets DOM valides', 'error', {
                'userDropdownBtn est Element': userDropdownBtn instanceof Element,
                'userDropdownMenu est Element': userDropdownMenu instanceof Element,
                'userDropdownBtn type': typeof userDropdownBtn,
                'userDropdownMenu type': typeof userDropdownMenu
            });
            return false;
        }
        
        // Vérifier si le bouton a déjà un écouteur d'événement
        if (hasEventListener(userDropdownBtn, 'click')) {
            log('Le bouton utilisateur a déjà un écouteur d\'événement, configuration ignorée', 'warning');
            return true;
        }
        
        log('Configuration du menu déroulant utilisateur');
        
        // Assurer que le menu est visible dans le DOM mais caché visuellement
        userDropdownMenu.classList.remove('hide', 'hidden', 'invisible');
        if (!userDropdownMenu.classList.contains(config.classes.show)) {
            userDropdownMenu.style.display = 'none';
        }
        
        // Ajouter l'écouteur d'événements au bouton SANS cloner
        userDropdownBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            log('Clic sur le bouton utilisateur');
            toggleUserDropdown();
        });
        
        // Marquer le bouton comme ayant un écouteur d'événement
        markWithEventListener(userDropdownBtn, 'click');
        
        // Ajouter un écouteur pour fermer le menu quand on clique ailleurs
        if (!hasEventListener(document, 'click-outside')) {
            document.addEventListener('click', function(e) {
                if (userDropdownMenu.classList.contains(config.classes.show) && 
                    !userDropdownBtn.contains(e.target) && 
                    !userDropdownMenu.contains(e.target)) {
                    
                    log('Clic extérieur détecté, fermeture du menu utilisateur');
                    closeUserDropdown();
                }
            });
            markWithEventListener(document, 'click-outside');
        }
        
        // Configurer les éléments du menu pour qu'ils ferment le menu au clic
        const menuItems = userDropdownMenu.querySelectorAll(config.selectors.dropdownItems);
        menuItems.forEach(function(item, index) {
            if (!hasEventListener(item, 'click')) {
                item.addEventListener('click', function() {
                    log('Clic sur un élément du menu, fermeture du menu');
                    closeUserDropdown();
                });
                markWithEventListener(item, 'click');
            }
        });
        
        log('Menu déroulant utilisateur configuré avec succès', 'success');
        return true;
    }
    
    /**
     * Ouvre le menu déroulant utilisateur
     */
    function openUserDropdown() {
        userDropdownMenu.classList.add(config.classes.show);
        userDropdownMenu.style.display = 'block';
        log('Menu utilisateur ouvert');
    }
    
    /**
     * Ferme le menu déroulant utilisateur
     */
    function closeUserDropdown() {
        userDropdownMenu.classList.remove(config.classes.show);
        userDropdownMenu.style.display = 'none';
        log('Menu utilisateur fermé');
    }
    
    /**
     * Bascule l'état du menu déroulant utilisateur
     */
    function toggleUserDropdown() {
        if (userDropdownMenu.classList.contains(config.classes.show)) {
            closeUserDropdown();
        } else {
            openUserDropdown();
        }
    }
    
    /**
     * Fonction principale pour initialiser le gestionnaire d'interface
     */
    function init() {
        // Vérifier si l'interface est déjà initialisée
        if (isInterfaceInitialized) {
            log('Interface déjà initialisée, initialisation ignorée', 'warning');
            return;
        }
        
        log('Initialisation du gestionnaire d\'interface v3.3 (ultra-robuste)', 'info');
        
        // Approche simplifiée et résistante aux erreurs
        document.addEventListener('DOMContentLoaded', function() {
            try {
                // Toggle sidebar - Méthode ultra-simplifiée
                const toggleBtn = document.querySelector('#sidebarCollapse');
                const sidebar = document.querySelector('#sidebar, .sidebar');
                const mainContent = document.querySelector('.main-content');
                
                if (toggleBtn && sidebar) {
                    toggleBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        log('Clic sur toggle sidebar', 'info');
                        
                        sidebar.classList.toggle('collapsed');
                        document.body.classList.toggle('sidebar-collapsed');
                        if (mainContent) {
                            mainContent.classList.toggle('expanded');
                        }
                        
                        // Gestion de l'icône
                        const icon = toggleBtn.querySelector('i');
                        if (icon) {
                            if (sidebar.classList.contains('collapsed')) {
                                icon.classList.remove('fa-chevron-left');
                                icon.classList.add('fa-chevron-right');
                            } else {
                                icon.classList.remove('fa-chevron-right');
                                icon.classList.add('fa-chevron-left');
                            }
                        }
                        
                        // Sauvegarder l'état
                        localStorage.setItem(config.sidebarStorageKey, 
                            sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
                    });
                    log('Toggle sidebar initialisé', 'success');
                    
                    // Restaurer l'état sauvegardé
                    if (localStorage.getItem(config.sidebarStorageKey) === 'collapsed') {
                        sidebar.classList.add('collapsed');
                        document.body.classList.add('sidebar-collapsed');
                        if (mainContent) {
                            mainContent.classList.add('expanded');
                        }
                        
                        const icon = toggleBtn.querySelector('i');
                        if (icon) {
                            icon.classList.remove('fa-chevron-left');
                            icon.classList.add('fa-chevron-right');
                        }
                    }
                }
                
                // Menu utilisateur - Méthode ultra-simplifiée
                const userBtn = document.querySelector('#userDropdown, .user-icon-btn');
                const userMenu = document.querySelector('#userDropdownMenu, .custom-dropdown-menu');
                
                if (userBtn && userMenu) {
                    // Assurer que le menu est caché par défaut
                    if (!userMenu.classList.contains('show')) {
                        userMenu.style.display = 'none';
                    }
                    
                    userBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        log('Clic sur menu utilisateur', 'info');
                        
                        if (userMenu.classList.contains('show')) {
                            userMenu.classList.remove('show');
                            userMenu.style.display = 'none';
                        } else {
                            userMenu.classList.add('show');
                            userMenu.style.display = 'block';
                        }
                    });
                    
                    // Fermer le menu en cliquant ailleurs
                    document.addEventListener('click', function(e) {
                        if (userMenu.classList.contains('show') && 
                            !userBtn.contains(e.target) && 
                            !userMenu.contains(e.target)) {
                            
                            userMenu.classList.remove('show');
                            userMenu.style.display = 'none';
                        }
                    });
                    
                    // Fermer le menu en cliquant sur un élément du menu
                    const menuItems = userMenu.querySelectorAll('.custom-dropdown-item');
                    menuItems.forEach(function(item) {
                        item.addEventListener('click', function() {
                            userMenu.classList.remove('show');
                            userMenu.style.display = 'none';
                        });
                    });
                    
                    log('Menu utilisateur initialisé', 'success');
                }
                
                isInterfaceInitialized = true;
                log('Initialisation réussie (méthode simplifiée)', 'success');
            } catch (error) {
                log('Erreur lors de l\'initialisation, mais l\'application continue de fonctionner', 'error', error);
            }
        });
        
        // En cas d'erreur ou si le DOMContentLoaded est déjà passé
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(function() {
                document.dispatchEvent(new Event('DOMContentLoaded'));
            }, 100);
        }
    }
    
    // Démarrer l'initialisation
    init();
    
})(); 