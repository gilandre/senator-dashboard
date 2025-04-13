<?php
// Suppression de require_once header.php

// Configuration des variables pour le layout
$pageTitle = isset($user) ? 'Modifier un utilisateur' : 'Ajouter un utilisateur';
$currentPage = 'users';

// Le contenu principal de la page
?>

<div class="container-fluid px-4">
    <h1 class="mt-4"><?= $pageTitle ?></h1>
    
    <?php if (isset($_SESSION['error'])): ?>
        <div class="alert alert-danger">
            <?php echo $_SESSION['error']; unset($_SESSION['error']); ?>
        </div>
    <?php endif; ?>
    
    <div class="card mb-4">
        <div class="card-header">
            <i class="fas fa-user"></i> <?= $pageTitle ?>
        </div>
        <div class="card-body">
            <form action="<?= isset($user) ? '/users/edit/' . $user->getId() : '/users/create' ?>" method="post">
                <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input type="email" class="form-control" id="email" name="email" value="<?= isset($user) ? htmlspecialchars($user->getEmail()) : '' ?>" required>
                </div>
                
                <div class="mb-3">
                    <label for="first_name" class="form-label">Prénom</label>
                    <input type="text" class="form-control" id="first_name" name="first_name" value="<?= isset($user) ? htmlspecialchars($user->getFirstName() ?? '') : '' ?>">
                </div>
                
                <div class="mb-3">
                    <label for="last_name" class="form-label">Nom</label>
                    <input type="text" class="form-control" id="last_name" name="last_name" value="<?= isset($user) ? htmlspecialchars($user->getLastName() ?? '') : '' ?>">
                </div>
                
                <div class="mb-3">
                    <label for="password" class="form-label">
                        <?= isset($user) ? 'Mot de passe (laissez vide pour ne pas modifier)' : 'Mot de passe' ?>
                    </label>
                    <input type="password" class="form-control" id="password" name="password" <?= isset($user) ? '' : 'required' ?>>
                </div>
                
                <?php if (!empty($profiles)): ?>
                <div class="mb-3">
                    <label for="profile_id" class="form-label">Profil</label>
                    <select class="form-select" id="profile_id" name="profile_id">
                        <option value="">-- Sélectionner un profil --</option>
                        <?php foreach ($profiles as $profile): ?>
                        <option value="<?= $profile['id'] ?>" 
                            <?= isset($userProfiles) && in_array($profile['id'], array_column($userProfiles, 'profile_id')) ? 'selected' : '' ?>>
                            <?= htmlspecialchars($profile['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php endif; ?>
                
                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="is_active" name="is_active" 
                        <?= isset($user) && $user->getIsActive() ? 'checked' : '' ?>>
                    <label class="form-check-label" for="is_active">Actif</label>
                </div>
                
                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="is_admin" name="is_admin" 
                        <?= isset($user) && $user->getRole() === 'admin' ? 'checked' : '' ?>>
                    <label class="form-check-label" for="is_admin">Administrateur</label>
                </div>
                
                <button type="submit" class="btn btn-primary">Enregistrer</button>
                <a href="/users" class="btn btn-secondary">Annuler</a>
            </form>
        </div>
    </div>
</div>
<!-- Suppression de require_once footer.php --> 