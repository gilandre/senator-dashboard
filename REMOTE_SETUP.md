# Configuration d'un dépôt distant

Pour publier ce dépôt Git sur un serveur distant (comme GitHub, GitLab, Bitbucket), suivez les étapes ci-dessous.

## GitHub

1. Créez un nouveau dépôt sur GitHub sans README, .gitignore ou licence
2. Copiez l'URL du dépôt (format HTTPS ou SSH)

3. Ajoutez le dépôt distant à votre dépôt local :
```bash
git remote add origin https://github.com/votre-utilisateur/senator-dashboard.git
```

4. Poussez les branches principales :
```bash
git push -u origin main
git push -u origin develop
```

## GitLab

1. Créez un nouveau projet sur GitLab sans README
2. Copiez l'URL du dépôt (format HTTPS ou SSH)

3. Ajoutez le dépôt distant à votre dépôt local :
```bash
git remote add origin https://gitlab.com/votre-utilisateur/senator-dashboard.git
```

4. Poussez les branches principales :
```bash
git push -u origin main
git push -u origin develop
```

## Bitbucket

1. Créez un nouveau dépôt sur Bitbucket sans README
2. Copiez l'URL du dépôt (format HTTPS ou SSH)

3. Ajoutez le dépôt distant à votre dépôt local :
```bash
git remote add origin https://votre-utilisateur@bitbucket.org/votre-utilisateur/senator-dashboard.git
```

4. Poussez les branches principales :
```bash
git push -u origin main
git push -u origin develop
```

## Configuration des clés SSH (recommandé)

Pour éviter d'entrer votre mot de passe à chaque push, configurez des clés SSH :

1. Générez une paire de clés SSH si vous n'en avez pas déjà :
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Copiez la clé publique :
```bash
# Sur macOS
pbcopy < ~/.ssh/id_ed25519.pub

# Sur Linux
xclip -sel clip < ~/.ssh/id_ed25519.pub

# Sur Windows (Git Bash)
cat ~/.ssh/id_ed25519.pub | clip
```

3. Ajoutez la clé à votre compte GitHub/GitLab/Bitbucket dans les paramètres

4. Testez la connexion SSH :
```bash
# Pour GitHub
ssh -T git@github.com

# Pour GitLab
ssh -T git@gitlab.com

# Pour Bitbucket
ssh -T git@bitbucket.org
```

5. Mettez à jour l'URL du dépôt distant pour utiliser SSH :
```bash
git remote set-url origin git@github.com:votre-utilisateur/senator-dashboard.git
```

## Protection des branches

Pour une meilleure gestion du dépôt, configurez la protection des branches :

1. Sur GitHub/GitLab/Bitbucket, accédez aux paramètres du dépôt
2. Configurez les règles de protection pour la branche `main` :
   - Requérir des pull requests avant de fusionner
   - Requérir des révisions de code
   - Requérir des tests réussis
   - Interdire les pushes directs

3. Configurez des règles similaires mais moins restrictives pour la branche `develop`

## Configuration d'intégration continue

Pour la vérification automatique de vos modifications :

1. Créez un fichier `.github/workflows/php.yml` (pour GitHub Actions) ou un fichier `.gitlab-ci.yml` (pour GitLab CI)
2. Configurez des workflows pour exécuter PHPUnit, PHPCS et PHPStan
3. Configurez des notifications pour les échecs de build 