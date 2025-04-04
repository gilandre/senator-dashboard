<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réactivation du compte - SENATOR Dashboard</title>
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
        .reactivate-container {
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
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #0d6efd;
            padding: 1rem;
            margin-bottom: 1.5rem;
            border-radius: 0 4px 4px 0;
        }
    </style>
</head>
<body>
    <div class="reactivate-container">
        <div class="logo">
            <img src="/assets/images/logo.png" alt="SENATOR Dashboard">
        </div>

        <h2 class="text-center mb-4">Réactivation du compte</h2>

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
            <div class="info-box">
                <p class="mb-0">
                    <i class="fas fa-info-circle"></i>
                    Votre compte a été désactivé à la suite de plusieurs tentatives de connexion échouées.
                    Pour le réactiver, veuillez saisir votre adresse email.
                </p>
            </div>

            <form method="POST" action="/reactivate-account">
                <div class="form-floating">
                    <input type="email" 
                           class="form-control" 
                           id="email" 
                           name="email" 
                           placeholder="Adresse email"
                           required>
                    <label for="email">Adresse email</label>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-user-check"></i> Réactiver mon compte
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
</body>
</html> 