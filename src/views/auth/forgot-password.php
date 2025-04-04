<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de mot de passe - <?= $_ENV['APP_NAME'] ?></title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h1 class="h3 mb-0">Réinitialisation de mot de passe</h1>
                    </div>
                    <div class="card-body">
                        <?php if (Session::hasFlash('error')): ?>
                            <div class="alert alert-danger">
                                <?= Session::getFlash('error') ?>
                            </div>
                        <?php endif; ?>

                        <?php if (Session::hasFlash('success')): ?>
                            <div class="alert alert-success">
                                <?= Session::getFlash('success') ?>
                            </div>
                        <?php endif; ?>

                        <form action="/forgot-password" method="POST">
                            <div class="form-group">
                                <label for="email">Adresse email</label>
                                <input type="email" class="form-control" id="email" name="email" required>
                            </div>
                            <div class="form-group mt-3">
                                <button type="submit" class="btn btn-primary">Envoyer le lien de réinitialisation</button>
                            </div>
                        </form>
                    </div>
                    <div class="card-footer">
                        <a href="/login">Retour à la connexion</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html> 