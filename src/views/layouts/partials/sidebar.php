<!-- Sidebar -->
<div class="sidebar" id="sidebar">
    <div class="logo">
        <img src="/assets/images/logo.svg" alt="SENATOR Logo">
    </div>
    
    <ul class="nav flex-column">
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'dashboard' ? 'active' : ''; ?>" href="/dashboard">
                <i class="fas fa-tachometer-alt"></i>
                Tableau de bord
            </a>
        </li>
        
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'import' ? 'active' : ''; ?>" href="/import">
                <i class="fas fa-file-import"></i>
                Import
            </a>
        </li>
        
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'reports' ? 'active' : ''; ?>" href="/reports">
                <i class="fas fa-chart-bar"></i>
                Rapports
            </a>
        </li>
        
        <?php if (isset($_SESSION['user']) && $_SESSION['user']['is_admin']): ?>
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'users' ? 'active' : ''; ?>" href="/users">
                <i class="fas fa-users"></i>
                Utilisateurs
            </a>
        </li>
        
        <li class="nav-item">
            <a class="nav-link <?php echo $currentPage === 'settings' ? 'active' : ''; ?>" href="/settings">
                <i class="fas fa-cog"></i>
                Paramètres
            </a>
        </li>
        <?php endif; ?>
    </ul>
</div>

<!-- Sidebar Toggle Script -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
});
</script> 