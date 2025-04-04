// JavaScript pour les fonctionnalités globales de l'application
document.addEventListener('DOMContentLoaded', function() {
    // Toggle du sidebar
    const sidebarBtn = document.getElementById('sidebarCollapse');
    if (sidebarBtn) {
        sidebarBtn.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
            document.querySelector('#content').classList.toggle('active');
        });
    }
    
    // Fermeture automatique des alertes après 5 secondes
    const alertElements = document.querySelectorAll('.alert');
    alertElements.forEach(function(alert) {
        setTimeout(function() {
            const closeBtn = alert.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.click();
            }
        }, 5000);
    });
});
