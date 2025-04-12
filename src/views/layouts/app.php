<!DOCTYPE html>
<html lang="fr" class="h-100">
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
    <!-- CSS dédié pour corriger le menu déroulant utilisateur -->
    <link href="/assets/css/dropdown-fix.css" rel="stylesheet">
    
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
        
        /* Styles pour le sticky footer */
        body {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            margin: 0;
        }
        
        .wrapper {
            display: flex;
            flex: 1 0 auto;
        }
        
        #content {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 100%;
            padding-bottom: 20px;
        }
        
        .footer {
            flex-shrink: 0;
            position: relative;
            width: 100%;
            background-color: #f8f9fa;
            z-index: 10;
        }
        
        @media (max-height: 768px) {
            #content {
                padding-bottom: 70px; /* Plus d'espace pour les petits écrans */
            }
        }
        
        .bg-light-primary {
            background-color: rgba(13, 110, 253, 0.1);
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bg-light-success {
            background-color: rgba(25, 135, 84, 0.1);
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bg-light-warning {
            background-color: rgba(255, 193, 7, 0.1);
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bg-light-danger {
            background-color: rgba(220, 53, 69, 0.1);
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bg-gradient-success-to-primary {
            background: linear-gradient(45deg, #198754, #0d6efd);
        }
        .stat-icon i {
            font-size: 1.5rem;
        }
    </style>
</head>
<body class="d-flex flex-column h-100">
    <div class="wrapper">
        <!-- Sidebar -->
        <nav id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <img src="/assets/images/logo.svg" alt="SENATOR" class="logo">
            </div>

            <ul class="nav flex-column">
                <li class="nav-item">
                    <a class="nav-link <?php echo ($currentPage === 'dashboard' || $current_page === 'dashboard') ? 'active' : ''; ?>" href="/dashboard">
                        <i class="fas fa-tachometer-alt"></i> <span>Tableau de bord</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo ($currentPage === 'import' || $current_page === 'import') ? 'active' : ''; ?>" href="/import">
                        <i class="fas fa-file-import"></i> <span>Import</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo ($currentPage === 'reports' || $current_page === 'reports') ? 'active' : ''; ?>" href="/reports">
                        <i class="fas fa-chart-bar"></i> <span>Rapports</span>
                    </a>
                </li>
                <?php if (isset($auth) && $auth->isLoggedIn() && $auth->hasPermission('manage_users')): ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo ($currentPage === 'users' || $current_page === 'users') ? 'active' : ''; ?>" href="/users">
                        <i class="fas fa-users"></i> <span>Utilisateurs</span>
                    </a>
                </li>
                <?php endif; ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo ($currentPage === 'settings' || $current_page === 'settings') ? 'active' : ''; ?>" href="/settings">
                        <i class="fas fa-cog"></i> <span>Paramètres</span>
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
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <!-- Titre de la page dans le top menu -->
                    <div class="page-title-display">
                        <?php if (isset($pageTitle) || isset($title)): ?>
                            <span class="page-title-text"><?php echo htmlspecialchars(isset($pageTitle) ? $pageTitle : $title); ?></span>
                        <?php endif; ?>
                    </div>
                    
                    <div class="ms-auto">
                        <!-- MENU UTILISATEUR AMÉLIORÉ -->
                        <div class="dropdown-container" id="userMenuContainer">
                            <button type="button" id="userDropdown" class="user-icon-btn" aria-haspopup="true" aria-expanded="false" title="Menu utilisateur">
                                <i class="fas fa-user-circle"></i>
                            </button>
                            <div id="userDropdownMenu" class="custom-dropdown-menu" aria-labelledby="userDropdown" data-bs-popper="none">
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
                                <a href="/profile" class="custom-dropdown-item" data-action="profile">
                                    <i class="fas fa-user"></i> Profil
                                </a>
                                <a href="/settings" class="custom-dropdown-item" data-action="settings">
                                    <i class="fas fa-cog"></i> Paramètres
                                </a>
                                <div class="dropdown-divider"></div>
                                <a href="/logout" class="custom-dropdown-item" data-action="logout">
                                    <i class="fas fa-sign-out-alt"></i> Déconnexion
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Main Content -->
            <div class="container-fluid flex-grow-1">
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
    <footer class="footer mt-auto py-3 bg-white border-top">
        <div class="container-fluid px-4">
            <div class="row align-items-center">
                <div class="col-md-4 text-center text-md-start">
                    <span class="text-muted small">&copy; <?php echo date('Y'); ?> SENATOR</span>
                </div>
                <div class="col-md-4 text-center">
                    <img src="/assets/images/logo-small.svg" alt="SENATOR" height="24" class="d-inline-block me-2">
                    <span class="text-muted small">Tous droits réservés</span>
                </div>
                <div class="col-md-4 text-center text-md-end">
                    <span class="badge bg-secondary">Version 1.0.0</span>
                </div>
            </div>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    <!-- Chargement inconditionnel de app.js pour garantir le fonctionnement du menu utilisateur -->
    <script src="/assets/js/app.js"></script>
    <!-- Script dédié au menu utilisateur pour assurer son fonctionnement sur toutes les pages -->
    <script src="/assets/js/user-menu.js"></script>
    
    <!-- Scripts spécifiques à la page -->
    <?php if (isset($pageFooterScripts)): ?>
        <?php foreach ($pageFooterScripts as $script): ?>
            <script src="<?php echo $script; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
    
    <!-- Script de secours pour le menu utilisateur (en cas d'échec du chargement des fichiers JS) -->
    <script>
    (function() {
        // Fonction qui s'exécute immédiatement
        function setupUserMenu() {
            console.log("Initialisation du menu utilisateur (secours inline)");
            
            var userBtn = document.getElementById('userDropdown');
            var userMenu = document.getElementById('userDropdownMenu');
            
            if (!userBtn || !userMenu) {
                console.error("Menu utilisateur: éléments non trouvés (secours inline)");
                return;
            }
            
            userBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle le menu
                if (userMenu.style.display === 'block') {
                    userMenu.style.display = 'none';
                    userBtn.setAttribute('aria-expanded', 'false');
                } else {
                    userMenu.style.display = 'block';
                    userBtn.setAttribute('aria-expanded', 'true');
                }
            };
            
            // Fermer le menu si on clique ailleurs
            document.addEventListener('click', function(e) {
                if (userMenu.style.display === 'block' && !userBtn.contains(e.target) && !userMenu.contains(e.target)) {
                    userMenu.style.display = 'none';
                    userBtn.setAttribute('aria-expanded', 'false');
                }
            });
            
            console.log("Menu utilisateur initialisé avec succès (secours inline)");
        }
        
        // Exécuter après le chargement de la page
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupUserMenu);
        } else {
            // Léger délai pour s'assurer que tous les autres scripts ont une chance de s'exécuter
            setTimeout(setupUserMenu, 100);
        }
        
        // Dernière tentative après 2 secondes
        setTimeout(setupUserMenu, 2000);
    })();
    </script>
</body>
</html> 