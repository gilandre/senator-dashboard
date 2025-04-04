<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SENATOR InvesTech - <?= $pageTitle ?? 'Dashboard' ?></title>
    
    <!-- CSS Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- CSS Fontawesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
    
    <!-- CSS personnalisé -->
    <link rel="stylesheet" href="/assets/css/style.css">
    
    <!-- Favicon -->
    <link rel="icon" href="/assets/img/favicon.ico" type="image/x-icon">
</head>
<body>
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="logo-container">
            <img src="/assets/img/logo.png" alt="SENATOR Logo" class="logo">
            <h1>SENATOR<br><span>InvesTech</span></h1>
        </div>
        
        <hr class="divider">
        
        <ul class="nav-links">
            <li class="<?= ($currentPage ?? '') === 'dashboard' ? 'active' : '' ?>">
                <a href="/dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>Dashboard</span>
                </a>
            </li>
            <li class="<?= ($currentPage ?? '') === 'users' ? 'active' : '' ?>">
                <a href="/users">
                    <i class="fas fa-users"></i>
                    <span>Utilisateurs</span>
                </a>
            </li>
            <li class="<?= ($currentPage ?? '') === 'reports' ? 'active' : '' ?>">
                <a href="/reports">
                    <i class="fas fa-chart-bar"></i>
                    <span>Rapports</span>
                </a>
            </li>
            <li class="<?= ($currentPage ?? '') === 'settings' ? 'active' : '' ?>">
                <a href="/settings">
                    <i class="fas fa-cog"></i>
                    <span>Paramètres</span>
                </a>
            </li>
        </ul>
        
        <div class="sidebar-footer">
            <a href="/logout" class="logout-btn">
                <i class="fas fa-sign-out-alt"></i>
                <span>Déconnexion</span>
            </a>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <!-- Top Navigation -->
        <nav class="navbar">
            <div class="container-fluid">
                <div class="navbar-left">
                    <button id="sidebarToggle" class="btn">
                        <i class="fas fa-bars"></i>
                    </button>
                    <h2 class="page-title"><?= $pageTitle ?? 'Dashboard' ?></h2>
                </div>
                
                <div class="navbar-right">
                    <div class="user-info">
                        <span class="user-name">Admin</span>
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Alert Container pour les messages flash -->
        <?php if (!empty($_SESSION['flash_messages'])): ?>
            <?php foreach ($_SESSION['flash_messages'] as $type => $message): ?>
                <div class="alert alert-<?= $type ?> alert-dismissible fade show" role="alert">
                    <?= $message ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endforeach; ?>
            <?php unset($_SESSION['flash_messages']); ?>
        <?php endif; ?>
        
        <!-- Content Area -->
        <div class="content">
            <?= $content ?>
        </div>
    </div>
    
    <!-- JS Bootstrap Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- JS personnalisé -->
    <script src="/assets/js/main.js"></script>
    
    <!-- Scripts supplémentaires spécifiques aux vues -->
    <?php if (!empty($scripts)): ?>
        <?php foreach ($scripts as $script): ?>
            <script src="<?= $script ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
</body>
</html> 