// JavaScript pour les fonctionnalités globales de l'application
document.addEventListener('DOMContentLoaded', function() {
    // Handle sidebar toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const body = document.body;
    
    // Restaurer l'état du sidebar au chargement
    const sidebarState = localStorage.getItem('sidebarState');
    if (sidebarState === 'collapsed' && sidebar) {
        sidebar.classList.add('collapsed');
        body.classList.add('sidebar-collapsed');
        if (mainContent) mainContent.classList.add('expanded');
        
        if (sidebarCollapse) {
            const icon = sidebarCollapse.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        }
    }
    
    // Toggle sidebar sur click
    if (sidebarCollapse && sidebar) {
        sidebarCollapse.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            body.classList.toggle('sidebar-collapsed');
            if (mainContent) mainContent.classList.toggle('expanded');
            
            // Changer l'icône
            const icon = sidebarCollapse.querySelector('i');
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
    }
    
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const closeButton = alert.querySelector('.btn-close');
            if (closeButton) {
                closeButton.click();
            }
        }, 5000);
    });
    
    // Gestion du dropdown utilisateur
    const userBtn = document.getElementById('userDropdown');
    const userMenu = document.getElementById('userDropdownMenu');
    
    if (userBtn && userMenu) {
        console.log("Menu utilisateur trouvé et initialisé");
        
        // Nettoyer les classes potentiellement conflictuelles
        userMenu.classList.remove('hide', 'hidden', 'invisible');
        
        userBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Clic sur le bouton utilisateur");
            userMenu.classList.toggle('show');
        });
        
        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (userMenu.classList.contains('show') && !userBtn.contains(e.target) && !userMenu.contains(e.target)) {
                console.log("Fermeture du menu utilisateur (clic extérieur)");
                userMenu.classList.remove('show');
            }
        });
        
        // S'assurer que le menu se ferme quand on clique sur un élément du menu
        const menuItems = userMenu.querySelectorAll('.custom-dropdown-item');
        menuItems.forEach(function(item) {
            item.addEventListener('click', function() {
                console.log("Clic sur un élément du menu utilisateur");
                userMenu.classList.remove('show');
            });
        });
    } else {
        console.error("Menu utilisateur non trouvé", {
            userBtn: userBtn ? "trouvé" : "non trouvé",
            userMenu: userMenu ? "trouvé" : "non trouvé"
        });
    }
    
    // Initialize DataTables if present
    if (typeof $.fn.DataTable !== 'undefined') {
        $('.data-table').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/fr-FR.json'
            },
            responsive: true
        });
    }
    
    // Initialiser les tooltips Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
