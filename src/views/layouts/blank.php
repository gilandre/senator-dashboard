<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title ?? $app_name) ?></title>
    
    <?php if (isset($meta_description)): ?>
    <meta name="description" content="<?= htmlspecialchars($meta_description) ?>">
    <?php endif; ?>
    
    <!-- CSS de base -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- CSS personnalisé -->
    <link href="/assets/css/style.css" rel="stylesheet">
    
    <?php if (isset($css_files) && is_array($css_files)): ?>
        <?php foreach ($css_files as $css_file): ?>
            <link href="<?= htmlspecialchars($css_file) ?>" rel="stylesheet">
        <?php endforeach; ?>
    <?php endif; ?>
</head>
<body class="blank-layout">
    <!-- Inclusion du gestionnaire de doublons -->
    <?php include __DIR__ . '/partials/prevent_duplicates.php'; ?>
    
    <!-- Contenu principal -->
    <div class="container-fluid">
        <?= $content ?? '' ?>
    </div>
    
    <!-- Scripts de base -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <?php if (isset($js_files) && is_array($js_files)): ?>
        <?php foreach ($js_files as $js_file): ?>
            <script src="<?= htmlspecialchars($js_file) ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
    
    <?php if (isset($inline_js)): ?>
    <script>
        <?= $inline_js ?>
    </script>
    <?php endif; ?>
</body>
</html> 