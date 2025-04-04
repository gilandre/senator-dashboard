<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? $pageTitle . ' - ' : ''; ?>SENATOR Dashboard</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
    
    <!-- CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    <link href="/assets/css/style.css" rel="stylesheet">
    
    <!-- Scripts supplémentaires spécifiques à la page -->
    <?php if (isset($pageScripts)): ?>
        <?php foreach ($pageScripts as $script): ?>
            <script src="<?php echo $script; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
    
    <style>
        /* Styles spécifiques pour assurer qu'il n'y a pas de conflits entre les topbars */
        .global-topbar {
            display: <?php echo isset($hideGlobalTopbar) && $hideGlobalTopbar === true ? 'none' : 'block'; ?>;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <!-- Sidebar -->
        <nav id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <img src="/assets/images/logo.svg" alt="SENATOR" class="logo">
            </div>

            <ul class="nav flex-column">
                <li class="nav-item">
                    <a class="nav-link <?php echo $currentPage === 'dashboard' ? 'active' : ''; ?>" href="/dashboard">
                        <i class="fas fa-tachometer-alt"></i> Tableau de bord
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo $currentPage === 'import' ? 'active' : ''; ?>" href="/import">
                        <i class="fas fa-file-import"></i> Import
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo $currentPage === 'reports' ? 'active' : ''; ?>" href="/reports">
                        <i class="fas fa-chart-bar"></i> Rapports
                    </a>
                </li>
                <?php if (isset($auth) && $auth->isLoggedIn() && $auth->hasPermission('manage_users')): ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo $currentPage === 'users' ? 'active' : ''; ?>" href="/users">
                        <i class="fas fa-users"></i> Utilisateurs
                    </a>
                </li>
                <?php endif; ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo $currentPage === 'settings' ? 'active' : ''; ?>" href="/settings">
                        <i class="fas fa-cog"></i> Paramètres
                    </a>
                </li>
            </ul>
        </nav>

        <!-- Page Content -->
        <div id="content">
            <!-- Topbar Global -->
            <nav class="navbar navbar-expand-lg navbar-light bg-light global-topbar" <?php if (isset($hideGlobalTopbar) && $hideGlobalTopbar === true) echo 'style="display: none;"'; ?>>
                <div class="container-fluid">
                    <button type="button" id="sidebarCollapse" class="btn btn-link">
                        <i class="fas fa-bars"></i>
                    </button>
                    
                    <!-- Titre de la page dans le top menu -->
                    <div class="page-title-display">
                        <?php if (isset($pageTitle)): ?>
                            <span class="page-title-text"><?php echo htmlspecialchars($pageTitle); ?></span>
                        <?php endif; ?>
                    </div>
                    
                    <div class="ms-auto">
                        <!-- NOUVELLE IMPLÉMENTATION DU MENU UTILISATEUR -->
                        <div class="dropdown-container">
                            <button type="button" id="userDropdown" class="user-icon-btn">
                                <i class="fas fa-user-circle"></i>
                            </button>
                            <div id="userDropdownMenu" class="custom-dropdown-menu">
                                <!-- En-tête du profil utilisateur -->
                                <div class="dropdown-profile-header">
                                    <div class="dropdown-avatar">
                                        <i class="fas fa-user-circle"></i>
                                    </div>
                                    <div class="dropdown-user-info">
                                        <span class="dropdown-username"><?php echo isset($auth) && $auth->getUser() ? htmlspecialchars($auth->getUser()->getUsername()) : 'Utilisateur'; ?></span>
                                        <span class="dropdown-role"><?php echo isset($auth) && $auth->getUser() ? htmlspecialchars($auth->getUser()->getRole()) : 'Invité'; ?></span>
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

            <!-- Main Content -->
            <div class="container-fluid">
                <?php if (isset($_SESSION['success'])): ?>
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <?php echo htmlspecialchars($_SESSION['success']); ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                    <?php unset($_SESSION['success']); ?>
                <?php endif; ?>

                <?php if (isset($_SESSION['error'])): ?>
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <?php echo htmlspecialchars($_SESSION['error']); ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                    <?php unset($_SESSION['error']); ?>
                <?php endif; ?>

                <?php echo $content ?? ''; ?>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="footer mt-auto py-3 bg-light">
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-6">
                    <span class="text-muted">© <?php echo date('Y'); ?> SENATOR. Tous droits réservés.</span>
                </div>
                <div class="col-md-6 text-end">
                    <span class="text-muted">Version 1.0.0</span>
                </div>
            </div>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <?php if (file_exists($_SERVER['DOCUMENT_ROOT'] . '/assets/js/app.js')): ?>
    <script src="/assets/js/app.js"></script>
    <?php endif; ?>
    
    <!-- Scripts spécifiques à la page -->
    <?php if (isset($pageFooterScripts)): ?>
        <?php foreach ($pageFooterScripts as $script): ?>
            <script src="<?php echo $script; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
</body>
</html> 