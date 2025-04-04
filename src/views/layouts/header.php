<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $title ?? 'SENATOR Dashboard' ?></title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- DataTables CSS -->
    <link href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Custom CSS -->
    <link href="/assets/css/style.css" rel="stylesheet">
</head>
<body>
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="logo">
            <img src="/assets/images/logo.svg" alt="SENATOR Logo">
        </div>
        <nav class="nav flex-column">
            <a class="nav-link <?= $currentPage === 'dashboard' ? 'active' : '' ?>" href="/dashboard">
                <i class="fas fa-home"></i> Dashboard
            </a>
            <a class="nav-link <?= $currentPage === 'import' ? 'active' : '' ?>" href="/import">
                <i class="fas fa-file-import"></i> Import
            </a>
            <a class="nav-link <?= $currentPage === 'reports' ? 'active' : '' ?>" href="/reports">
                <i class="fas fa-chart-bar"></i> Rapports
            </a>
            <a class="nav-link <?= $currentPage === 'users' ? 'active' : '' ?>" href="/users">
                <i class="fas fa-users"></i> Utilisateurs
            </a>
            <a class="nav-link <?= $currentPage === 'settings' ? 'active' : '' ?>" href="/settings">
                <i class="fas fa-cog"></i> Paramètres
            </a>
        </nav>
    </div>
    
    <!-- Topbar -->
    <div class="topbar">
        <button class="toggle-sidebar">
            <i class="fas fa-bars"></i>
        </button>
        <span class="navbar-brand">SENATOR Dashboard</span>
        <div class="user-info">
            <span class="me-2"><?= $_SESSION['user']['username'] ?? 'Utilisateur' ?></span>
            <a href="/logout" class="btn btn-sm btn-outline-danger">
                <i class="fas fa-sign-out-alt"></i> Déconnexion
            </a>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <?php if (isset($_SESSION['flash'])): ?>
            <div class="alert alert-<?= $_SESSION['flash']['type'] ?> alert-dismissible fade show" role="alert">
                <?= $_SESSION['flash']['message'] ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
            <?php unset($_SESSION['flash']); ?>
        <?php endif; ?> 