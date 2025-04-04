<?php
$pageTitle = isset($user) ? 'Modifier l\'Utilisateur' : 'Nouvel Utilisateur';
$currentPage = 'users';

// Début du contenu de la page
ob_start();

require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container-fluid px-4">
    <h1 class="mt-4"><?php echo isset($user) ? 'Edit User' : 'Create User'; ?></h1>
    
    <?php if (isset($_SESSION['error'])): ?>
        <div class="alert alert-danger">
            <?php echo $_SESSION['error']; unset($_SESSION['error']); ?>
        </div>
    <?php endif; ?>

    <div class="card mb-4">
        <div class="card-header">
            <i class="fas fa-user-edit me-1"></i>
            <?php echo isset($user) ? 'Edit User' : 'Create User'; ?>
        </div>
        <div class="card-body">
            <form method="POST" class="needs-validation" novalidate>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="email" class="form-label">Email *</label>
                        <input type="email" 
                               class="form-control" 
                               id="email" 
                               name="email" 
                               value="<?php echo isset($user) ? htmlspecialchars($user['email']) : ''; ?>"
                               required>
                        <div class="invalid-feedback">
                            Please provide a valid email address.
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <label for="password" class="form-label">
                            <?php echo isset($user) ? 'New Password (leave blank to keep current)' : 'Password *'; ?>
                        </label>
                        <input type="password" 
                               class="form-control" 
                               id="password" 
                               name="password"
                               <?php echo isset($user) ? '' : 'required'; ?>>
                        <div class="invalid-feedback">
                            <?php echo isset($user) ? 'Please provide a valid password.' : 'Password is required.'; ?>
                        </div>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="first_name" class="form-label">First Name</label>
                        <input type="text" 
                               class="form-control" 
                               id="first_name" 
                               name="first_name"
                               value="<?php echo isset($user) ? htmlspecialchars($user['first_name']) : ''; ?>">
                    </div>
                    
                    <div class="col-md-6">
                        <label for="last_name" class="form-label">Last Name</label>
                        <input type="text" 
                               class="form-control" 
                               id="last_name" 
                               name="last_name"
                               value="<?php echo isset($user) ? htmlspecialchars($user['last_name']) : ''; ?>">
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="profile_id" class="form-label">Profile</label>
                        <select class="form-select" id="profile_id" name="profile_id">
                            <option value="">Select Profile</option>
                            <?php foreach ($profiles as $profile): ?>
                                <option value="<?php echo $profile['id']; ?>"
                                        <?php echo (isset($userProfiles) && in_array($profile['id'], array_column($userProfiles, 'id'))) ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($profile['name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="form-check">
                            <input type="checkbox" 
                                   class="form-check-input" 
                                   id="is_active" 
                                   name="is_active"
                                   <?php echo (!isset($user) || $user['is_active']) ? 'checked' : ''; ?>>
                            <label class="form-check-label" for="is_active">Active</label>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="form-check">
                            <input type="checkbox" 
                                   class="form-check-input" 
                                   id="is_admin" 
                                   name="is_admin"
                                   <?php echo (isset($user) && $user['is_admin']) ? 'checked' : ''; ?>>
                            <label class="form-check-label" for="is_admin">Administrator</label>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-1"></i>
                            <?php echo isset($user) ? 'Update User' : 'Create User'; ?>
                        </button>
                        <a href="/users" class="btn btn-secondary">
                            <i class="fas fa-times me-1"></i>
                            Cancel
                        </a>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
    // Form validation
    (function () {
        'use strict'
        var forms = document.querySelectorAll('.needs-validation')
        Array.prototype.slice.call(forms)
            .forEach(function (form) {
                form.addEventListener('submit', function (event) {
                    if (!form.checkValidity()) {
                        event.preventDefault()
                        event.stopPropagation()
                    }
                    form.classList.add('was-validated')
                }, false)
            })
    })()
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 