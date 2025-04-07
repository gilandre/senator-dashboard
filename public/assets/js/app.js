// JavaScript pour les fonctionnalités globales de l'application
document.addEventListener('DOMContentLoaded', function() {
    // Handle sidebar toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    
    // Vérifier s'il existe une préférence utilisateur sauvegardée
    const sidebarState = localStorage.getItem('sidebarState');
    
    // Appliquer l'état sauvegardé au chargement de la page
    if (sidebarState === 'collapsed' && sidebar && content) {
        sidebar.classList.add('collapsed');
        content.classList.add('expanded');
        if (sidebarCollapse) {
            sidebarCollapse.querySelector('i').classList.remove('fa-chevron-left');
            sidebarCollapse.querySelector('i').classList.add('fa-chevron-right');
        }
    }
    
    if (sidebarCollapse && sidebar && content) {
        sidebarCollapse.addEventListener('click', function() {
            // Pour les appareils mobiles
            sidebar.classList.toggle('active');
            content.classList.toggle('active');
            
            // Pour le mode collapsed
            sidebar.classList.toggle('collapsed');
            content.classList.toggle('expanded');
            
            // Changer l'icône du bouton
            if (sidebar.classList.contains('collapsed')) {
                sidebarCollapse.querySelector('i').classList.remove('fa-chevron-left');
                sidebarCollapse.querySelector('i').classList.add('fa-chevron-right');
                localStorage.setItem('sidebarState', 'collapsed');
            } else {
                sidebarCollapse.querySelector('i').classList.remove('fa-chevron-right');
                sidebarCollapse.querySelector('i').classList.add('fa-chevron-left');
                localStorage.setItem('sidebarState', 'expanded');
            }
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
        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('show');
        });
        
        // Fermer le dropdown quand on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
                userMenu.classList.remove('show');
            }
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
});
