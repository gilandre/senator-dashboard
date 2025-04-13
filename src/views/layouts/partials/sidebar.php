<!-- Sidebar -->
<div class="sidebar" id="sidebar">
    <ul class="nav flex-column">
        <!-- Dashboard -->
        <li class="nav-item">
            <a class="nav-link <?php echo (isset($currentPage) && $currentPage === 'dashboard') ? 'active' : ''; ?>" href="/dashboard">
                <i class="fas fa-tachometer-alt"></i> <span>Tableau de bord</span>
            </a>
        </li>
        
        <!-- Import -->
        <li class="nav-item">
            <a class="nav-link <?php echo (isset($currentPage) && (in_array($currentPage, ['import', 'import/history']))) ? 'active' : ''; ?>" href="/import">
                <i class="fas fa-file-import"></i> <span>Import</span>
            </a>
        </li>
        
        <!-- Reports -->
        <li class="nav-item">
            <a class="nav-link <?php echo (isset($currentPage) && $currentPage === 'reports') ? 'active' : ''; ?>" href="/reports">
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
            <a class="nav-link <?php echo (isset($currentPage) && $currentPage === 'users') ? 'active' : ''; ?>" href="/users">
                <i class="fas fa-users"></i> <span>Utilisateurs</span>
            </a>
        </li>
        
        <!-- Settings -->
        <li class="nav-item">
            <a class="nav-link <?php echo (isset($currentPage) && $currentPage === 'settings') ? 'active' : ''; ?>" href="/settings">
                <i class="fas fa-cog"></i> <span>Paramètres</span>
            </a>
        </li>
        <?php endif; ?>
    </ul>
</div>

<!-- Sidebar Toggle Script -->
