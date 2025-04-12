/**
 * Script dédié à la gestion du menu déroulant utilisateur
 * Ce script est autonome et prioritaire sur les autres comportements
 */
(function() {
    // S'exécute immédiatement quand le DOM est prêt
    function initUserMenu() {
        console.log("Initialisation du menu utilisateur (script dédié)");
        
        const userBtn = document.getElementById('userDropdown');
        const userMenu = document.getElementById('userDropdownMenu');
        
        if (!userBtn || !userMenu) {
            console.error("Menu utilisateur: éléments non trouvés", {
                userBtn: userBtn ? "trouvé" : "non trouvé",
                userMenu: userMenu ? "trouvé" : "non trouvé"
            });
            return;
        }

        // Force le style du menu pour s'assurer qu'il fonctionne
        Object.assign(userBtn.style, {
            cursor: 'pointer',
            position: 'relative',
            zIndex: '9999'
        });
        
        // Styles essentiels pour le menu déroulant
        Object.assign(userMenu.style, {
            position: 'absolute',
            right: '0',
            top: '45px',
            backgroundColor: 'white',
            minWidth: '220px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            borderRadius: '8px',
            zIndex: '10000',
            display: 'none',
            padding: '10px 0',
            border: '1px solid #ddd'
        });
        
        // Force le style des éléments du menu
        const menuItems = userMenu.querySelectorAll('.custom-dropdown-item');
        menuItems.forEach(item => {
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                padding: '10px 15px',
                textDecoration: 'none',
                color: '#333',
                transition: 'background-color 0.2s'
            });
            
            // Ajouter un hover effect
            item.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f5f5f5';
            });
            
            item.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            // Fermer le menu lors du clic sur un élément
            item.addEventListener('click', function() {
                userMenu.style.display = 'none';
            });
        });
        
        // Fonction pour afficher/masquer le menu
        function toggleMenu(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isVisible = userMenu.style.display === 'block';
            
            // Fermer tous les autres menus potentiellement ouverts
            document.querySelectorAll('.dropdown-menu, .custom-dropdown-menu').forEach(menu => {
                if (menu !== userMenu) menu.style.display = 'none';
            });
            
            userMenu.style.display = isVisible ? 'none' : 'block';
            console.log("Menu utilisateur: " + (isVisible ? "fermé" : "ouvert"));
        }
        
        // Fonction pour fermer le menu si on clique ailleurs
        function closeMenuOnOutsideClick(e) {
            if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
                userMenu.style.display = 'none';
            }
        }
        
        // Attachement des événements
        userBtn.addEventListener('click', toggleMenu);
        document.addEventListener('click', closeMenuOnOutsideClick);
        
        console.log("Menu utilisateur initialisé avec succès (script dédié)");
    }
    
    // Exécuter l'initialisation quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserMenu);
    } else {
        initUserMenu();
    }
    
    // Pour plus de sécurité, réinitialiser après 1 seconde (au cas où le DOM n'est pas encore complètement chargé)
    setTimeout(initUserMenu, 1000);
})(); 