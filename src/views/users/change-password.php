<?php 
require_once __DIR__ . '/../layouts/header.php';
use App\Core\Auth;

$auth = new Auth();
?>

<div class="container-fluid px-4">
    <h1 class="mt-4">Change Password</h1>
    
    <?php if (isset($_SESSION['error'])): ?>
        <div class="alert alert-danger">
            <?php echo $_SESSION['error']; unset($_SESSION['error']); ?>
        </div>
    <?php endif; ?>

    <div class="card mb-4">
        <div class="card-header">
            <i class="fas fa-key me-1"></i>
            Change Password
        </div>
        <div class="card-body">
            <form method="POST" class="needs-validation" novalidate>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="current_password" class="form-label">Current Password *</label>
                        <input type="password" 
                               class="form-control" 
                               id="current_password" 
                               name="current_password"
                               required>
                        <div class="invalid-feedback">
                            Please enter your current password.
                        </div>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="new_password" class="form-label">New Password *</label>
                        <input type="password" 
                               class="form-control" 
                               id="new_password" 
                               name="new_password"
                               required
                               minlength="8">
                        <div class="invalid-feedback">
                            Password must be at least 8 characters long.
                        </div>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="confirm_password" class="form-label">Confirm New Password *</label>
                        <input type="password" 
                               class="form-control" 
                               id="confirm_password" 
                               name="confirm_password"
                               required>
                        <div class="invalid-feedback">
                            Passwords do not match.
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save me-1"></i>
                            Change Password
                        </button>
                        <a href="/profile" class="btn btn-secondary">
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

                    // Check if passwords match
                    var password = document.getElementById('new_password')
                    var confirm = document.getElementById('confirm_password')
                    if (password.value !== confirm.value) {
                        confirm.setCustomValidity('Passwords do not match')
                        event.preventDefault()
                        event.stopPropagation()
                    } else {
                        confirm.setCustomValidity('')
                    }

                    form.classList.add('was-validated')
                }, false)
            })
    })()
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 