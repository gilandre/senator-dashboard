/**
 * Script de correction pour les problèmes d'interface
 * Ce script doit être chargé après tous les autres scripts
 */
(function() {
    console.log("Script de correction chargé - Version 2.0");
    
    /**
     * Correction du toggle de la sidebar
     */
    function fixSidebarToggle() {
        const sidebarCollapse = document.getElementById('sidebarCollapse');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        const body = document.body;
        
        if (!sidebarCollapse || !sidebar) {
            console.error("Éléments de sidebar non trouvés", {
                sidebarCollapse: sidebarCollapse ? "trouvé" : "non trouvé",
                sidebar: sidebar ? "trouvé" : "non trouvé"
            });
            return;
        }
        
        console.log("Réinitialisation des gestionnaires d'événements pour le toggle de sidebar");
        
        // Supprimer tous les écouteurs d'événements existants
        const newSidebarCollapse = sidebarCollapse.cloneNode(true);
        sidebarCollapse.parentNode.replaceChild(newSidebarCollapse, sidebarCollapse);
        
        // Ajouter un nouvel écouteur d'événements
        newSidebarCollapse.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Clic sur le bouton de toggle de sidebar");
            
            sidebar.classList.toggle('collapsed');
            body.classList.toggle('sidebar-collapsed');
            if (mainContent) mainContent.classList.toggle('expanded');
            
            // Changer l'icône
            const icon = newSidebarCollapse.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('collapsed')) {
                    icon.classList.remove('fa-chevron-left');
                    icon.classList.add('fa-chevron-right');
                } else {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-left');
                }
            }
            
            // Sauvegarder l'état dans localStorage
            localStorage.setItem('sidebarState', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
        });
        
        console.log("Event listener de toggle sidebar réinitialisé avec succès");
        
        // Restaurer l'état du sidebar au chargement
        const sidebarState = localStorage.getItem('sidebarState');
        if (sidebarState === 'collapsed' && sidebar) {
            console.log("Restauration de l'état collapsed du sidebar");
            sidebar.classList.add('collapsed');
            body.classList.add('sidebar-collapsed');
            if (mainContent) mainContent.classList.add('expanded');
            
            const icon = newSidebarCollapse.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        }
    }
    
    /**
     * Correction du menu déroulant utilisateur
     */
    function fixUserDropdown() {
        const userBtn = document.getElementById('userDropdown');
        const userMenu = document.getElementById('userDropdownMenu');
        
        if (!userBtn || !userMenu) {
            console.error("Éléments du menu utilisateur non trouvés", {
                userBtn: userBtn ? "trouvé" : "non trouvé",
                userMenu: userMenu ? "trouvé" : "non trouvé"
            });
            return;
        }
        
        console.log("Réinitialisation des gestionnaires d'événements pour le menu utilisateur");
        
        // Supprimer tous les écouteurs d'événements existants
        const newUserBtn = userBtn.cloneNode(true);
        userBtn.parentNode.replaceChild(newUserBtn, userBtn);
        
        // Nettoyer les classes potentiellement conflictuelles
        userMenu.classList.remove('hide', 'hidden', 'invisible');
        
        // Ajouter un nouvel écouteur d'événements
        newUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Clic sur le bouton utilisateur");
            
            // Toggle la classe show
            if (userMenu.classList.contains('show')) {
                userMenu.classList.remove('show');
                console.log("Menu utilisateur fermé");
            } else {
                userMenu.classList.add('show');
                console.log("Menu utilisateur ouvert");
            }
        });
        
        console.log("Event listener de menu utilisateur réinitialisé avec succès");
        
        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (userMenu.classList.contains('show') && !newUserBtn.contains(e.target) && !userMenu.contains(e.target)) {
                console.log("Fermeture du menu utilisateur (clic extérieur)");
                userMenu.classList.remove('show');
            }
        });
        
        // S'assurer que le menu se ferme quand on clique sur un élément du menu
        const menuItems = userMenu.querySelectorAll('.custom-dropdown-item');
        menuItems.forEach(function(item) {
            // Supprimer les écouteurs existants
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Ajouter un nouvel écouteur
            newItem.addEventListener('click', function() {
                console.log("Clic sur un élément du menu utilisateur");
                userMenu.classList.remove('show');
            });
        });
    }
    
    // Fonction pour exécuter les corrections après un court délai
    function applyFixes() {
        console.log("Application des corrections...");
        
        // Appliquer les corrections après un court délai
        setTimeout(function() {
            fixSidebarToggle();
            fixUserDropdown();
        }, 100);
    }
    
    // Attendre que la page soit complètement chargée
    if (document.readyState === 'complete') {
        console.log("Document déjà chargé, application immédiate des corrections");
        applyFixes();
    } else {
        window.addEventListener('load', function() {
            console.log("Document chargé, application des corrections");
            applyFixes();
        });
        
        // Fallback au cas où l'événement load ne se déclenche pas correctement
        setTimeout(function() {
            console.log("Application des corrections (fallback)");
            applyFixes();
        }, 1000);
    }
})(); 