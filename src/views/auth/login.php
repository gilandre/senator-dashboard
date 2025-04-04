<form method="POST" action="/login" class="needs-validation" novalidate>
    <div class="mb-4">
        <label for="username" class="form-label fw-medium">Nom d'utilisateur</label>
        <div class="input-group">
            <span class="input-group-text">
                <i class="fas fa-user"></i>
            </span>
            <input type="text" class="form-control" id="username" name="username" placeholder="Entrez votre nom d'utilisateur" required>
        </div>
        <div class="invalid-feedback">
            Veuillez entrer votre nom d'utilisateur
        </div>
    </div>
    
    <div class="mb-4">
        <label for="password" class="form-label fw-medium">Mot de passe</label>
        <div class="input-group">
            <span class="input-group-text">
                <i class="fas fa-lock"></i>
            </span>
            <input type="password" class="form-control" id="password" name="password" placeholder="Entrez votre mot de passe" required>
        </div>
        <div class="invalid-feedback">
            Veuillez entrer votre mot de passe
        </div>
    </div>
    
    <div class="mb-4 d-flex justify-content-between align-items-center">
        <div class="form-check">
            <input type="checkbox" class="form-check-input" id="remember" name="remember">
            <label class="form-check-label" for="remember">Se souvenir de moi</label>
        </div>
        <a href="/forgot-password" class="forgot-password">
            <i class="fas fa-key me-1"></i>Mot de passe oublié ?
        </a>
    </div>
    
    <button type="submit" class="btn btn-primary mb-4">
        <i class="fas fa-sign-in-alt me-2"></i>Se connecter
    </button>
</form>

<script>
// Validation du formulaire
(function () {
    'use strict'
    var forms = document.querySelectorAll('.needs-validation')
    Array.prototype.slice.call(forms).forEach(function (form) {
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