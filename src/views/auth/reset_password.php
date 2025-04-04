<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation du mot de passe - SENATOR Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f8f9fa;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .reset-password-container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        .logo {
            text-align: center;
            margin-bottom: 2rem;
        }
        .logo img {
            max-width: 150px;
        }
        .form-floating {
            margin-bottom: 1rem;
        }
        .btn-primary {
            width: 100%;
            padding: 0.8rem;
            font-size: 1.1rem;
        }
        .back-link {
            text-align: center;
            margin-top: 1.5rem;
        }
        .back-link a {
            color: #6c757d;
            text-decoration: none;
        }
        .back-link a:hover {
            color: #0d6efd;
        }
        .alert {
            margin-bottom: 1rem;
        }
        .password-requirements {
            font-size: 0.875rem;
            color: #6c757d;
            margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="reset-password-container">
        <div class="logo">
            <img src="/assets/images/logo.png" alt="SENATOR Dashboard">
        </div>

        <h2 class="text-center mb-4">Réinitialisation du mot de passe</h2>

        <?php if (isset($error)): ?>
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if (isset($success)): ?>
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
            </div>
            <div class="text-center">
                <a href="/login" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Se connecter
                </a>
            </div>
        <?php else: ?>
            <form method="POST" action="/reset-password?token=<?php echo htmlspecialchars($token); ?>">
                <div class="form-floating">
                    <input type="password" 
                           class="form-control" 
                           id="password" 
                           name="password" 
                           placeholder="Nouveau mot de passe"
                           required
                           minlength="8">
                    <label for="password">Nouveau mot de passe</label>
                </div>

                <div class="form-floating">
                    <input type="password" 
                           class="form-control" 
                           id="confirm_password" 
                           name="confirm_password" 
                           placeholder="Confirmer le mot de passe"
                           required
                           minlength="8">
                    <label for="confirm_password">Confirmer le mot de passe</label>
                </div>

                <div class="password-requirements">
                    <p class="mb-0">Le mot de passe doit contenir :</p>
                    <ul class="mb-0">
                        <li>Au moins 8 caractères</li>
                        <li>Au moins une lettre majuscule</li>
                        <li>Au moins une lettre minuscule</li>
                        <li>Au moins un chiffre</li>
                        <li>Au moins un caractère spécial</li>
                    </ul>
                </div>

                <button type="submit" class="btn btn-primary mt-3">
                    <i class="fas fa-key"></i> Réinitialiser le mot de passe
                </button>
            </form>
        <?php endif; ?>

        <div class="back-link">
            <a href="/login">
                <i class="fas fa-arrow-left"></i> Retour à la connexion
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Validation du mot de passe en temps réel
        document.getElementById('password').addEventListener('input', function() {
            const password = this.value;
            const requirements = {
                length: password.length >= 8,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                number: /[0-9]/.test(password),
                special: /[^A-Za-z0-9]/.test(password)
            };

            const list = this.nextElementSibling.nextElementSibling.querySelector('ul');
            list.children[0].style.color = requirements.length ? '#28a745' : '#dc3545';
            list.children[1].style.color = requirements.uppercase ? '#28a745' : '#dc3545';
            list.children[2].style.color = requirements.lowercase ? '#28a745' : '#dc3545';
            list.children[3].style.color = requirements.number ? '#28a745' : '#dc3545';
            list.children[4].style.color = requirements.special ? '#28a745' : '#dc3545';
        });
    </script>
</body>
</html> 