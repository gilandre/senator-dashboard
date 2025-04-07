<!-- Sidebar -->
<div class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <img src="/assets/images/logo.svg" alt="SENATOR" class="logo">
    </div>
    
    <ul class="nav flex-column">
        <!-- Dashboard -->
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'dashboard' ? 'active' : ''; ?>" href="/dashboard">
                <i class="fas fa-tachometer-alt"></i> <span>Tableau de bord</span>
            </a>
        </li>
        
        <!-- Import -->
        <li class="nav-item">
            <a class="nav-link <?php echo in_array($currentPage, ['import', 'import/history']) ? 'active' : ''; ?>" href="/import">
                <i class="fas fa-file-import"></i> <span>Import</span>
            </a>
        </li>
        
        <!-- Reports -->
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'reports' ? 'active' : ''; ?>" href="/reports">
                <i class="fas fa-chart-bar"></i> <span>Rapports</span>
            </a>
        </li>
        
        <?php if (isset($_SESSION['user']) && $_SESSION['user']['role'] === 'admin'): ?>
        <!-- Administration section -->
        <li class="nav-section">
            <span class="nav-section-text">Administration</span>
        </li>
        
        <!-- Users -->
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'users' ? 'active' : ''; ?>" href="/users">
                <i class="fas fa-users"></i> <span>Utilisateurs</span>
            </a>
        </li>
        
        <!-- Settings -->
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'settings' ? 'active' : ''; ?>" href="/settings">
                <i class="fas fa-cog"></i> <span>Paramètres</span>
            </a>
        </li>
        <?php endif; ?>
    </ul>
</div>

<!-- Sidebar Toggle Script -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    const body = document.body;
    
    if (sidebarCollapse && sidebar) {
        sidebarCollapse.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            body.classList.toggle('sidebar-collapsed');
            
            // Changer l'icône du bouton
            const icon = sidebarCollapse.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
            
            // Sauvegarder l'état dans le localStorage
            localStorage.setItem('sidebarState', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
        });
        
        // Restaurer l'état au chargement
        const sidebarState = localStorage.getItem('sidebarState');
        if (sidebarState === 'collapsed') {
            sidebar.classList.add('collapsed');
            body.classList.add('sidebar-collapsed');
            
            // Ajuster l'icône
            const icon = sidebarCollapse.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        }
    }
});
</script> 