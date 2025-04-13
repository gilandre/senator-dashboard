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
    
    <!-- CSS Essentiels pour l'interface utilisateur (prioritaire) -->
    <link href="/assets/css/ui-essentials.css" rel="stylesheet">
    
    <!-- Inclusion des styles communs -->
    <?php include __DIR__ . '/partials/styles.php'; ?>
    
    <!-- Scripts supplémentaires spécifiques à la page -->
    <?php if (isset($pageScripts)): ?>
        <?php foreach ($pageScripts as $script): ?>
            <script src="<?php echo $script; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
</head>
<body class="d-flex flex-column h-100">
    <!-- Inclusion du gestionnaire de doublons -->
    <?php include __DIR__ . '/partials/prevent_duplicates.php'; ?>
    
    <!-- Topbar (Déplacé hors du wrapper) -->
    <?php if (!isset($hideGlobalTopbar) || !$hideGlobalTopbar): ?>
        <?php include __DIR__ . '/partials/navbar.php'; ?>
    <?php endif; ?>
    
    <div class="wrapper">
        <!-- Sidebar - Utiliser le composant partiel -->
        <?php include __DIR__ . '/partials/sidebar.php'; ?>

        <!-- Page Content -->
        <div class="main-content">
            <!-- Main Content -->
            <div class="container-fluid py-3">
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
    <?php
    if (!isComponentIncluded('footer')) {
        include __DIR__ . '/partials/footer.php';
        markComponentAsIncluded('footer');
    }
    ?>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    
    <!-- Inclusion des scripts communs -->
    <?php include __DIR__ . '/partials/scripts.php'; ?>
    
    <!-- Nouvelle solution pour l'interface utilisateur -->
    <script src="/assets/js/simple-interface.js"></script>
    
    <!-- Scripts spécifiques à la page -->
    <?php if (isset($pageFooterScripts)): ?>
        <?php foreach ($pageFooterScripts as $script): ?>
            <script src="<?php echo $script; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
</body>
</html> 