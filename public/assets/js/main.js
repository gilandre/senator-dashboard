document.addEventListener('DOMContentLoaded', function() {
    // Gestion du toggle du sidebar
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const logoFull = document.querySelector('.logo-full');
    const logoSmall = document.querySelector('.logo-small');
    
    // Vérifier si la barre latérale était précédemment réduite (stocké dans localStorage)
    const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    
    // Appliquer l'état initial basé sur localStorage
    if (sidebarCollapsed) {
        document.body.classList.add('sidebar-collapsed');
        if (logoFull && logoSmall) {
            logoFull.style.display = 'none';
            logoSmall.style.display = 'block';
        }
        sidebar.classList.add('collapsed');
    } else {
        if (logoFull && logoSmall) {
            logoFull.style.display = 'block';
            logoSmall.style.display = 'none';
        }
    }
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.body.classList.toggle('sidebar-collapsed');
            sidebar.classList.toggle('collapsed');
            
            // Basculer entre les logos
            if (logoFull && logoSmall) {
                if (document.body.classList.contains('sidebar-collapsed')) {
                    logoFull.style.display = 'none';
                    logoSmall.style.display = 'block';
                    localStorage.setItem('sidebar-collapsed', 'true');
                } else {
                    logoFull.style.display = 'block';
                    logoSmall.style.display = 'none';
                    localStorage.setItem('sidebar-collapsed', 'false');
                }
            }
            
            // Pour le mode mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
                mainContent.classList.toggle('shifted');
            }
        });
    }
    
    // Fermeture du sidebar en mode mobile en cliquant en dehors
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(event.target) && 
            !sidebarToggle.contains(event.target) && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            document.body.classList.remove('sidebar-collapsed');
        }
    });

    // Fermeture automatique des alertes après 5 secondes
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            const closeButton = alert.querySelector('.btn-close');
            if (closeButton) closeButton.click();
        }, 5000);
    });
});

// Fonction pour actualiser le dashboard avec la date sélectionnée
function updateDashboard() {
    const date = document.getElementById('dateSelector').value;
    window.location.href = `/dashboard?date=${date}`;
} 