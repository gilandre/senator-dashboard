<!DOCTYPE html>
<html lang="fr">
<head>
    <?php include __DIR__ . '/partials/meta.php'; ?>
    <?php include __DIR__ . '/partials/styles.php'; ?>
</head>
<body>
    <?php
    // Définir la page courante si elle n'est pas définie
    $currentPage = $currentPage ?? basename($_SERVER['PHP_SELF'], '.php');
    ?>

    <!-- Wrapper -->
    <div class="wrapper">
        <!-- Sidebar -->
        <?php include __DIR__ . '/partials/sidebar.php'; ?>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Topbar -->
            <?php include __DIR__ . '/partials/navbar.php'; ?>

            <!-- Page Content -->
            <div class="container-fluid">
                <?php if (isset($title)): ?>
                    <h1 class="mb-4"><?php echo $title; ?></h1>
                <?php endif; ?>
                
                <?php if (isset($content)): ?>
                    <?php echo $content; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <?php include __DIR__ . '/partials/footer.php'; ?>
    
    <!-- Scripts -->
    <?php include __DIR__ . '/partials/scripts.php'; ?>
</body>
</html> 