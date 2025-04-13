/**
 * SENATOR Dashboard - Gestionnaire d'interface unifié et robuste
 * Ce script gère à la fois le toggle du sidebar et le menu déroulant utilisateur
 * Version 4.1 - Architecture simplifiée
 */
(function() {
    'use strict';
    
    /**
     * Configuration principale
     */
    const config = {
        debug: true,
        selectors: {
            sidebar: '#sidebar',
            sidebarToggle: '#sidebarCollapse',
            mainContent: '.main-content',
            userDropdownBtn: '#userDropdown',
            userDropdownMenu: '#userDropdownMenu'
        },
        storage: {
            sidebarKey: 'sidebarState'
        }
    };
    
    /**
     * Système de logging simplifié
     */
    function log(message, type = 'info') {
        if (!config.debug) return;
        const styles = {
            info: 'color: #3498db; font-weight: bold;',
            error: 'color: #e74c3c; font-weight: bold;',
            success: 'color: #2ecc71; font-weight: bold;'
        };
        console.log(`%c[SENATOR UI] ${message}`, styles[type] || styles.info);
    }
    
    /**
     * Sélectionne un élément DOM avec facilité
     */
    function $(selector) {
        return document.querySelector(selector);
    }
    
    /**
     * ======================================
     * COMPOSANT TOGGLE SIDEBAR - SIMPLIFIÉ
     * ======================================
     */
    const SidebarToggle = {
        /**
         * Éléments DOM
         */
        elements: {
            sidebar: null,
            toggleBtn: null,
            mainContent: null
        },
        
        /**
         * Initialise le toggle sidebar
         */
        init: function() {
            log('Initialisation du toggle sidebar');
            
            // Récupérer les éléments
            this.elements.sidebar = $(config.selectors.sidebar);
            this.elements.toggleBtn = $(config.selectors.sidebarToggle);
            this.elements.mainContent = $(config.selectors.mainContent);
            
            // Vérifier que les éléments existent
            if (!this.elements.sidebar || !this.elements.toggleBtn) {
                log('Éléments sidebar non trouvés, tentative avec des sélecteurs alternatifs', 'error');
                this.elements.sidebar = $('.sidebar') || $('#sidebar');
                this.elements.toggleBtn = $('#sidebarCollapse') || $('.sidebar-toggle');
                
                if (!this.elements.sidebar || !this.elements.toggleBtn) {
                    log('Impossible de trouver les éléments sidebar', 'error');
                    return false;
                }
            }
            
            // Configurer le clic
            this.setupClickHandler();
            
            // Restaurer l'état sauvegardé
            this.restoreState();
            
            log('Toggle sidebar initialisé avec succès', 'success');
            return true;
        },
        
        /**
         * Configure le gestionnaire de clic
         */
        setupClickHandler: function() {
            const self = this;
            
            // Supprimer les gestionnaires existants pour éviter les doublons
            const newBtn = this.elements.toggleBtn.cloneNode(true);
            this.elements.toggleBtn.parentNode.replaceChild(newBtn, this.elements.toggleBtn);
            this.elements.toggleBtn = newBtn;
            
            // Ajouter le nouveau gestionnaire
            this.elements.toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                self.toggle();
            });
            
            log('Gestionnaire de clic configuré');
        },
        
        /**
         * Fait basculer l'état du sidebar
         */
        toggle: function() {
            // Toggle des classes
            this.elements.sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sidebar-collapsed');
            
            if (this.elements.mainContent) {
                this.elements.mainContent.classList.toggle('expanded');
            }
            
            // Mise à jour de l'icône
            this.updateIcon();
            
            // Sauvegarder l'état
            this.saveState();
            
            log('État du sidebar basculé');
        },
        
        /**
         * Met à jour l'icône du bouton toggle
         */
        updateIcon: function() {
            const icon = this.elements.toggleBtn.querySelector('i');
            if (!icon) return;
            
            if (this.elements.sidebar.classList.contains('collapsed')) {
                icon.className = icon.className.replace('fa-chevron-left', 'fa-chevron-right');
                if (!icon.classList.contains('fa-chevron-right')) {
                    icon.classList.add('fa-chevron-right');
                }
            } else {
                icon.className = icon.className.replace('fa-chevron-right', 'fa-chevron-left');
                if (!icon.classList.contains('fa-chevron-left')) {
                    icon.classList.add('fa-chevron-left');
                }
            }
        },
        
        /**
         * Sauvegarde l'état du sidebar
         */
        saveState: function() {
            try {
                const state = this.elements.sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded';
                localStorage.setItem(config.storage.sidebarKey, state);
            } catch (error) {
                log('Erreur lors de la sauvegarde de l\'état: ' + error.message, 'error');
            }
        },
        
        /**
         * Restaure l'état sauvegardé du sidebar
         */
        restoreState: function() {
            try {
                const savedState = localStorage.getItem(config.storage.sidebarKey);
                
                if (savedState === 'collapsed') {
                    // Appliquer l'état collapsed
                    this.elements.sidebar.classList.add('collapsed');
                    document.body.classList.add('sidebar-collapsed');
                    
                    if (this.elements.mainContent) {
                        this.elements.mainContent.classList.add('expanded');
                    }
                    
                    // Mettre à jour l'icône
                    this.updateIcon();
                    
                    log('État réduit restauré');
                }
            } catch (error) {
                log('Erreur lors de la restauration de l\'état: ' + error.message, 'error');
            }
        }
    };
    
    /**
     * ======================================
     * COMPOSANT MENU UTILISATEUR - SIMPLIFIÉ
     * ======================================
     */
    const UserMenu = {
        /**
         * Éléments DOM
         */
        elements: {
            button: null,
            menu: null
        },
        
        /**
         * Initialise le menu utilisateur
         */
        init: function() {
            log('Initialisation du menu utilisateur');
            
            // Récupérer les éléments
            this.elements.button = $(config.selectors.userDropdownBtn);
            this.elements.menu = $(config.selectors.userDropdownMenu);
            
            // Vérifier que les éléments existent
            if (!this.elements.button || !this.elements.menu) {
                log('Éléments menu utilisateur non trouvés, tentative avec des sélecteurs alternatifs', 'error');
                this.elements.button = $('.user-icon-btn') || $('#userDropdown');
                this.elements.menu = $('.custom-dropdown-menu') || $('#userDropdownMenu');
                
                if (!this.elements.button || !this.elements.menu) {
                    log('Impossible de trouver les éléments menu utilisateur', 'error');
                    return false;
                }
            }
            
            // Configurer le clic
            this.setupClickHandlers();
            
            // Cacher le menu au départ
            this.hide();
            
            log('Menu utilisateur initialisé avec succès', 'success');
            return true;
        },
        
        /**
         * Configure les gestionnaires de clic
         */
        setupClickHandlers: function() {
            const self = this;
            
            // Supprimer les gestionnaires existants pour éviter les doublons
            const newBtn = this.elements.button.cloneNode(true);
            this.elements.button.parentNode.replaceChild(newBtn, this.elements.button);
            this.elements.button = newBtn;
            
            // Gérer le clic sur le bouton
            this.elements.button.addEventListener('click', function(e) {
                e.preventDefault();
                self.toggle();
            });
            
            // Fermer le menu en cliquant ailleurs
            document.addEventListener('click', function(e) {
                if (self.isVisible() && 
                    !self.elements.button.contains(e.target) && 
                    !self.elements.menu.contains(e.target)) {
                    self.hide();
                }
            });
            
            // Fermer le menu en cliquant sur un élément du menu
            const menuItems = this.elements.menu.querySelectorAll('.custom-dropdown-item, .dropdown-item');
            menuItems.forEach(function(item) {
                item.addEventListener('click', function() {
                    self.hide();
                });
            });
            
            log('Gestionnaires de clic du menu utilisateur configurés');
        },
        
        /**
         * Vérifie si le menu est visible
         */
        isVisible: function() {
            return this.elements.menu.classList.contains('show');
        },
        
        /**
         * Affiche le menu
         */
        show: function() {
            this.elements.menu.classList.add('show');
            this.elements.menu.style.display = 'block';
            log('Menu utilisateur affiché');
        },
        
        /**
         * Cache le menu
         */
        hide: function() {
            this.elements.menu.classList.remove('show');
            this.elements.menu.style.display = 'none';
            log('Menu utilisateur caché');
        },
        
        /**
         * Bascule l'état du menu
         */
        toggle: function() {
            if (this.isVisible()) {
                this.hide();
            } else {
                this.show();
            }
        }
    };
    
    /**
     * ======================================
     * INITIALISATION GLOBALE
     * ======================================
     */
    function initializeApp() {
        log('Initialisation de l\'application SENATOR');
        
        // Initialiser le toggle sidebar
        SidebarToggle.init();
        
        // Initialiser le menu utilisateur
        UserMenu.init();
        
        // Gérer les erreurs globales
        window.addEventListener('error', function(event) {
            log('Erreur JavaScript: ' + event.message, 'error');
            
            // Si l'erreur concerne le toggle ou le menu, réinitialiser
            if (event.message.includes('sidebar') || 
                event.message.includes('toggle') || 
                event.message.includes('dropdown')) {
                setTimeout(function() {
                    SidebarToggle.init();
                    UserMenu.init();
                }, 500);
            }
            
            return false; // Laisser l'erreur se propager normalement
        });
        
        log('Initialisation terminée avec succès', 'success');
    }
    
    // Lancer l'initialisation quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        // Le DOM est déjà chargé
        initializeApp();
    }
    
    // API publique pour le débogage
    window.senatorUI = {
        version: '4.1',
        debug: function(enable) {
            config.debug = enable;
            log('Mode debug ' + (enable ? 'activé' : 'désactivé'));
        },
        reset: initializeApp,
        sidebar: SidebarToggle,
        userMenu: UserMenu
    };
})(); 