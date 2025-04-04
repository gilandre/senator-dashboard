<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon Profil - SENATOR Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f8f9fa;
            padding-top: 2rem;
        }
        .profile-container {
            max-width: 800px;
            margin: 0 auto;
        }
        .card {
            border: none;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .card-header {
            background-color: #fff;
            border-bottom: 2px solid #f8f9fa;
            padding: 1.5rem;
        }
        .form-floating {
            margin-bottom: 1rem;
        }
        .password-requirements {
            font-size: 0.875rem;
            color: #6c757d;
            margin-top: 0.5rem;
        }
        .alert {
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="profile-container">
        <h1 class="text-center mb-4">Mon Profil</h1>

        <?php if (isset($error)): ?>
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if (isset($success)): ?>
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
            </div>
        <?php endif; ?>

        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">
                    <i class="fas fa-user"></i> Informations personnelles
                </h5>
            </div>
            <div class="card-body">
                <form method="POST" action="/profile/update">
                    <div class="form-floating">
                        <input type="text" 
                               class="form-control" 
                               id="username" 
                               value="<?php echo htmlspecialchars($user['username']); ?>" 
                               disabled>
                        <label for="username">Nom d'utilisateur</label>
                    </div>

                    <div class="form-floating">
                        <input type="email" 
                               class="form-control" 
                               id="email" 
                               name="email" 
                               value="<?php echo htmlspecialchars($user['email']); ?>" 
                               required>
                        <label for="email">Adresse email</label>
                    </div>

                    <div class="form-floating">
                        <input type="password" 
                               class="form-control" 
                               id="current_password" 
                               name="current_password" 
                               placeholder="Mot de passe actuel"
                               required>
                        <label for="current_password">Mot de passe actuel</label>
                    </div>

                    <div class="form-floating">
                        <input type="password" 
                               class="form-control" 
                               id="new_password" 
                               name="new_password" 
                               placeholder="Nouveau mot de passe">
                        <label for="new_password">Nouveau mot de passe</label>
                    </div>

                    <div class="form-floating">
                        <input type="password" 
                               class="form-control" 
                               id="confirm_password" 
                               name="confirm_password" 
                               placeholder="Confirmer le mot de passe">
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

                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Enregistrer les modifications
                    </button>
                </form>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">
                    <i class="fas fa-shield-alt"></i> Sécurité
                </h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <strong>Dernière connexion :</strong>
                    <?php echo $user['last_login'] ? date('d/m/Y H:i', strtotime($user['last_login'])) : 'Jamais'; ?>
                </div>
                <div class="mb-3">
                    <strong>Statut du compte :</strong>
                    <?php if ($user['is_active']): ?>
                        <span class="badge bg-success">Actif</span>
                    <?php else: ?>
                        <span class="badge bg-danger">Désactivé</span>
                    <?php endif; ?>
                </div>
                <div class="mb-3">
                    <strong>Rôle :</strong>
                    <span class="badge bg-primary"><?php echo ucfirst($user['role']); ?></span>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Validation du mot de passe en temps réel
        document.getElementById('new_password').addEventListener('input', function() {
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