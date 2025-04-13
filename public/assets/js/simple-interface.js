/**
 * SENATOR Dashboard - Gestionnaire d'interface unifié et simplifié
 * Version 4.1 - Architecture simplifiée
 */
(function() {
    'use strict';
    
    // Configuration simplifiée
    const config = {
        debug: true,
        sidebarKey: 'sidebarState'
    };
    
    // Fonction de log simplifiée
    function log(message) {
        if (config.debug) {
            console.log('[SENATOR UI] ' + message);
        }
    }
    
    // Raccourci pour querySelector
    function $(selector) {
        return document.querySelector(selector);
    }
    
    // Gestionnaire du Sidebar Toggle
    const SidebarToggle = {
        // Éléments DOM
        sidebar: null,
        toggleBtn: null,
        mainContent: null,
        
        // Initialisation
        init: function() {
            log('Initialisation du toggle sidebar');
            
            // Récupérer les éléments avec différents sélecteurs possibles
            this.sidebar = $('#sidebar') || $('.sidebar');
            this.toggleBtn = $('#sidebarCollapse') || $('.sidebar-toggle');
            this.mainContent = $('.main-content') || $('.content');
            
            // Vérifier que les éléments essentiels existent
            if (!this.sidebar || !this.toggleBtn) {
                log('Éléments sidebar non trouvés');
                return false;
            }
            
            // Configurer le clic
            this.setupToggle();
            
            // Restaurer l'état sauvegardé
            this.restoreState();
            
            log('Toggle sidebar initialisé');
            return true;
        },
        
        // Configuration de l'événement de clic
        setupToggle: function() {
            // Utiliser une fonction fléchée pour garder le contexte "this"
            this.toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        },
        
        // Basculer l'état du sidebar
        toggle: function() {
            // Toggle de la classe CSS
            this.sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sidebar-collapsed');
            
            if (this.mainContent) {
                this.mainContent.classList.toggle('expanded');
            }
            
            // Changer l'icône
            this.updateIcon();
            
            // Sauvegarder l'état
            this.saveState();
            
            log('État du sidebar basculé');
        },
        
        // Mise à jour de l'icône
        updateIcon: function() {
            const icon = this.toggleBtn.querySelector('i');
            if (!icon) return;
            
            if (this.sidebar.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        },
        
        // Sauvegarder l'état dans localStorage
        saveState: function() {
            try {
                const state = this.sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded';
                localStorage.setItem(config.sidebarKey, state);
            } catch (e) {
                log('Erreur de sauvegarde: ' + e.message);
            }
        },
        
        // Restaurer l'état depuis localStorage
        restoreState: function() {
            try {
                const savedState = localStorage.getItem(config.sidebarKey);
                
                if (savedState === 'collapsed') {
                    this.sidebar.classList.add('collapsed');
                    document.body.classList.add('sidebar-collapsed');
                    
                    if (this.mainContent) {
                        this.mainContent.classList.add('expanded');
                    }
                    
                    this.updateIcon();
                    log('État réduit restauré');
                }
            } catch (e) {
                log('Erreur de restauration: ' + e.message);
            }
        }
    };
    
    // Gestionnaire du Menu Utilisateur
    const UserMenu = {
        // Éléments DOM
        button: null,
        menu: null,
        
        // Initialisation
        init: function() {
            log('Initialisation du menu utilisateur');
            
            // Récupérer les éléments avec différents sélecteurs possibles
            this.button = $('#userDropdown') || $('.user-icon-btn');
            this.menu = $('#userDropdownMenu') || $('.custom-dropdown-menu');
            
            // Vérifier que les éléments essentiels existent
            if (!this.button || !this.menu) {
                log('Éléments menu utilisateur non trouvés');
                return false;
            }
            
            // Configurer les clics
            this.setupEvents();
            
            // S'assurer que le menu est caché au départ
            this.hide();
            
            log('Menu utilisateur initialisé');
            return true;
        },
        
        // Configuration des événements
        setupEvents: function() {
            // Utiliser des fonctions fléchées pour garder le contexte "this"
            this.button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
            
            // Fermer le menu en cliquant ailleurs
            document.addEventListener('click', (e) => {
                if (this.isVisible() && 
                    !this.button.contains(e.target) && 
                    !this.menu.contains(e.target)) {
                    this.hide();
                }
            });
            
            // Fermer le menu en cliquant sur un élément du menu
            const menuItems = this.menu.querySelectorAll('.dropdown-item, .custom-dropdown-item');
            menuItems.forEach(item => {
                item.addEventListener('click', () => this.hide());
            });
        },
        
        // Vérifier si le menu est visible
        isVisible: function() {
            return this.menu.classList.contains('show');
        },
        
        // Afficher le menu
        show: function() {
            this.menu.classList.add('show');
            this.menu.style.display = 'block';
        },
        
        // Masquer le menu
        hide: function() {
            this.menu.classList.remove('show');
            this.menu.style.display = 'none';
        },
        
        // Basculer l'état du menu
        toggle: function() {
            if (this.isVisible()) {
                this.hide();
            } else {
                this.show();
            }
        }
    };
    
    // Fonction d'initialisation principale
    function init() {
        log('Initialisation de l\'interface SENATOR');
        
        // Initialiser les composants
        SidebarToggle.init();
        UserMenu.init();
        
        log('Interface initialisée avec succès');
    }
    
    // Démarrer l'initialisation quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Le DOM est déjà chargé
        init();
    }
    
    // API publique pour le débogage
    window.senatorUI = {
        version: '4.1',
        debug: function(enable) {
            config.debug = enable;
        },
        init: init,
        sidebar: SidebarToggle,
        userMenu: UserMenu
    };
})(); 