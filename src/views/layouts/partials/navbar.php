<!-- Topbar -->
<nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
    <div class="container-fluid">
        <!-- Logo SENATOR -->
        <a href="/dashboard" class="navbar-brand d-flex align-items-center">
            <img src="/assets/images/logo.svg" alt="SENATOR" class="logo-topbar me-2" height="40">
        </a>
        
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

<!-- Le script pour le menu utilisateur a été déplacé vers fix.js pour éviter les conflits --> 