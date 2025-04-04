<?php require_once __DIR__ . '/../layouts/auth.php'; ?>

<div class="auth-container">
    <div class="auth-card">
        <div class="auth-logo">
            <img src="/assets/images/logo.svg" alt="SENATOR Logo">
        </div>
        
        <h1 class="auth-title">Nouveau mot de passe</h1>
        <p class="auth-subtitle">Choisissez un nouveau mot de passe sécurisé</p>
        
        <?php if (isset($_SESSION['error'])): ?>
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                <?php echo $_SESSION['error']; unset($_SESSION['error']); ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="/reset-password" class="needs-validation" novalidate>
            <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
            
            <div class="mb-4">
                <label for="password" class="form-label fw-medium">Nouveau mot de passe</label>
                <div class="input-group">
                    <span class="input-group-text">
                        <i class="fas fa-lock"></i>
                    </span>
                    <input type="password" class="form-control" id="password" name="password" 
                           placeholder="Entrez votre nouveau mot de passe" 
                           pattern=".{8,}" required>
                </div>
                <div class="form-text text-muted">
                    <i class="fas fa-info-circle me-1"></i>Le mot de passe doit contenir au moins 8 caractères
                </div>
                <div class="invalid-feedback">
                    Le mot de passe doit contenir au moins 8 caractères
                </div>
            </div>

            <div class="mb-4">
                <label for="password_confirm" class="form-label fw-medium">Confirmation du mot de passe</label>
                <div class="input-group">
                    <span class="input-group-text">
                        <i class="fas fa-lock"></i>
                    </span>
                    <input type="password" class="form-control" id="password_confirm" name="password_confirm" 
                           placeholder="Confirmez votre nouveau mot de passe" required>
                </div>
                <div class="invalid-feedback">
                    Les mots de passe ne correspondent pas
                </div>
            </div>

            <button type="submit" class="btn btn-primary mb-4">
                <i class="fas fa-save me-2"></i>Enregistrer le nouveau mot de passe
            </button>
        </form>

        <script>
            (function () {
                'use strict'
                var forms = document.querySelectorAll('.needs-validation')
                Array.prototype.slice.call(forms).forEach(function (form) {
                    form.addEventListener('submit', function (event) {
                        var password = document.getElementById('password')
                        var confirm = document.getElementById('password_confirm')
                        
                        if (!form.checkValidity() || password.value !== confirm.value) {
                            event.preventDefault()
                            event.stopPropagation()
                            
                            if (password.value !== confirm.value) {
                                confirm.setCustomValidity('Les mots de passe ne correspondent pas')
                            } else {
                                confirm.setCustomValidity('')
                            }
                        }
                        
                        form.classList.add('was-validated')
                    }, false)
                    
                    // Réinitialiser la validation personnalisée lors de la saisie
                    document.getElementById('password_confirm').addEventListener('input', function() {
                        this.setCustomValidity('')
                    })
                })
            })()
        </script>
    </div>
</div> 