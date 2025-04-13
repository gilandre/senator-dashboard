<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle ?? "SENATOR Dashboard"; ?></title>
    
    <!-- Meta tags -->
    <?php include_once 'partials/meta.php'; ?>
    
    <!-- Styles -->
    <?php include_once 'partials/styles.php'; ?>
    
    <!-- Script d'interface unifié -->
    <script src="/assets/js/simple-interface.js"></script>
</head>
<body>
    <div class="wrapper">
        <!-- Sidebar -->
        <?php include_once 'partials/sidebar.php'; ?>
        
        <!-- Page Content -->
        <div class="content">
            <?php if (!isset($hideGlobalTopbar) || !$hideGlobalTopbar) { ?>
                <!-- Top Navigation Bar -->
                <?php include_once 'partials/navbar.php'; ?>
            <?php } ?>

            <!-- Main Content -->
            <div class="container-fluid main-container">
                <?php echo $content; ?>
            </div>
            
            <!-- Footer -->
            <?php include_once 'partials/footer.php'; ?>
        </div>
    </div>
    
    <!-- Scripts -->
    <?php include_once 'partials/scripts.php'; ?>
</body>
</html> 