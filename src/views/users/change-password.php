<?php
// Suppression de require_once header.php

// Configuration des variables pour le layout
$pageTitle = 'Changer le mot de passe';
$currentPage = 'profile';

// Le contenu principal de la page
?>

<div class="container-fluid px-4">
    <h1 class="mt-4">Changer le mot de passe</h1>
    
    <?php if (isset($_SESSION['success'])): ?>
        <div class="alert alert-success">
            <?php echo $_SESSION['success']; unset($_SESSION['success']); ?>
        </div>
    <?php endif; ?>

    <?php if (isset($_SESSION['error'])): ?>
        <div class="alert alert-danger">
            <?php echo $_SESSION['error']; unset($_SESSION['error']); ?>
        </div>
    <?php endif; ?>

    <div class="card mb-4">
        <div class="card-header">
            <i class="fas fa-key"></i> Modifier votre mot de passe
        </div>
        <div class="card-body">
            <form method="POST">
                <div class="mb-3">
                    <label for="current_password" class="form-label">Mot de passe actuel</label>
                    <input type="password" class="form-control" id="current_password" name="current_password" required>
                </div>
                
                <div class="mb-3">
                    <label for="new_password" class="form-label">Nouveau mot de passe</label>
                    <input type="password" class="form-control" id="new_password" name="new_password" required>
                </div>
                
                <div class="mb-3">
                    <label for="confirm_password" class="form-label">Confirmer le nouveau mot de passe</label>
                    <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                </div>
                
                <button type="submit" class="btn btn-primary">Changer le mot de passe</button>
                <a href="/profile" class="btn btn-secondary">Annuler</a>
            </form>
        </div>
    </div>
</div>
<!-- Suppression de require_once footer.php --> 