<!-- Main Content -->
<div class="main-content">
    <?php include __DIR__ . '/alerts.php'; ?>
    
    <div class="container-fluid">
        <?php if (isset($title)): ?>
            <h1 class="mb-4"><?php echo $title; ?></h1>
        <?php endif; ?>
        
        <?php if (isset($content)): ?>
            <?php echo $content; ?>
        <?php endif; ?>
    </div>
</div>

<!-- Footer -->
<?php include __DIR__ . '/footer.php'; ?> 