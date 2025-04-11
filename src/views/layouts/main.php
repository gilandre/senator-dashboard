<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SENATOR - <?= htmlspecialchars($pageTitle ?? 'SENATOR') ?></title>
    
    <!-- Inclusion des meta tags -->
    <?php include __DIR__ . '/partials/meta.php'; ?>
    
    <!-- Inclusion des styles -->
    <?php include __DIR__ . '/partials/styles.php'; ?>
</head>
<body class="<?= isset($currentPage) ? 'page-' . $currentPage : '' ?>">
    <!-- Wrapper -->
    <div class="wrapper">
        <!-- Sidebar -->
        <?php include __DIR__ . '/partials/sidebar.php'; ?>
        
        <!-- Main Content -->
        <div class="main-content">
            <!-- Topbar -->
            <?php if (!isset($hideGlobalTopbar) || !$hideGlobalTopbar): ?>
                <?php include __DIR__ . '/partials/navbar.php'; ?>
            <?php endif; ?>
            
            <!-- Page Content -->
            <div class="container-fluid py-4">
                <?php echo $content ?? '' ?>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <?php include __DIR__ . '/partials/footer.php'; ?>
    
    <!-- Scripts (chargés à la fin du body) -->
    <?php include __DIR__ . '/partials/scripts.php'; ?>
</body>
</html> 