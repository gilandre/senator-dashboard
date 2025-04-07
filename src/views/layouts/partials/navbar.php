<!-- Topbar -->
<nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
    <div class="container-fluid">
        <!-- Sidebar Toggle -->
        <button type="button" id="sidebarCollapse" class="btn btn-link">
            <i class="fas fa-chevron-left"></i>
        </button>

        <!-- Page Title -->
        <div class="page-title-display">
            <span class="page-title-text">
                <?php echo isset($pageTitle) ? htmlspecialchars($pageTitle) : 'SENATOR'; ?>
            </span>
        </div>

        <!-- Right Navigation -->
        <div class="ms-auto">
            <!-- User Menu -->
            <div class="dropdown-container">
                <button class="user-icon-btn" id="userDropdown">
                    <i class="fas fa-user-circle"></i>
                </button>
                <div class="custom-dropdown-menu" id="userDropdownMenu">
                    <!-- En-tête du profil utilisateur -->
                    <div class="dropdown-profile-header">
                        <div class="dropdown-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="dropdown-user-info">
                            <span class="dropdown-username">
                                <?php echo isset($_SESSION['user']['username']) ? htmlspecialchars($_SESSION['user']['username']) : 'Utilisateur'; ?>
                            </span>
                            <span class="dropdown-role">
                                <?php echo isset($_SESSION['user']['role']) ? htmlspecialchars($_SESSION['user']['role']) : 'Invité'; ?>
                            </span>
                        </div>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a href="/profile" class="custom-dropdown-item">
                        <i class="fas fa-user"></i> Profil
                    </a>
                    <a href="/settings" class="custom-dropdown-item">
                        <i class="fas fa-cog"></i> Paramètres
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="/logout" class="custom-dropdown-item">
                        <i class="fas fa-sign-out-alt"></i> Déconnexion
                    </a>
                </div>
            </div>
        </div>
    </div>
</nav>

<!-- Script pour le menu utilisateur -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const userDropdown = document.getElementById('userDropdown');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (userDropdown && userDropdownMenu) {
        userDropdown.addEventListener('click', function(e) {
            e.preventDefault();
            userDropdownMenu.classList.toggle('show');
        });
        
        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!userDropdown.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                userDropdownMenu.classList.remove('show');
            }
        });
    }
});
</script> 