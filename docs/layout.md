# Documentation du Système de Layout

## Introduction

Le système de layout de l'application SENATOR Dashboard utilise une architecture qui sépare le contenu des pages de leur présentation. Cette documentation explique comment le système fonctionne et comment l'utiliser pour maintenir une apparence cohérente sur toute l'application.

## Structure des Fichiers

```
src/
├── views/
│   ├── layouts/
│   │   ├── app.php       # Layout principal pour les pages authentifiées
│   │   ├── auth.php      # Layout pour les pages d'authentification
│   │   └── footer.php    # Scripts communs chargés en fin de page
│   ├── dashboard/
│   ├── import/
│   ├── reports/
│   └── auth/
```

## Layouts Disponibles

### 1. Layout Principal (app.php)

Ce layout est utilisé pour toutes les pages accessibles après authentification. Il inclut :

- Une barre latérale (sidebar) avec navigation
- Une barre supérieure (topbar) avec informations utilisateur
- Un conteneur principal pour le contenu spécifique à chaque page
- Un pied de page (footer) avec informations de copyright

### 2. Layout d'Authentification (auth.php)

Ce layout est utilisé pour les pages d'authentification (login, reset password). Il est plus simple et n'inclut pas la sidebar ni la topbar.

## Comment Utiliser les Layouts

### Pour les Pages Authentifiées

```php
<?php
$currentPage = 'nom_section'; // 'dashboard', 'import', 'reports', etc.
require_once __DIR__ . '/../layouts/app.php';
?>

<div class="container-fluid">
    <!-- Contenu spécifique à la page -->
</div>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
```

### Pour les Pages d'Authentification

```php
<?php
$pageTitle = 'Titre de la Page'; // Optionnel
require_once __DIR__ . '/../layouts/auth.php';
?>

<div class="auth-box">
    <!-- Contenu du formulaire de connexion -->
</div>
```

## Variables Disponibles

### Layout Principal (app.php)

- `$currentPage` (obligatoire) : Définit la section active dans la sidebar
- `$pageTitle` (optionnel) : Titre de la page, affiché dans l'onglet du navigateur

### Layout d'Authentification (auth.php)

- `$pageTitle` (optionnel) : Titre de la page, affiché dans l'onglet du navigateur

## Gestion des Permissions

Le layout principal (app.php) gère automatiquement l'affichage des éléments de menu en fonction des permissions de l'utilisateur connecté.

Exemple dans le code :

```php
<?php if ($userHasAdminPermission): ?>
    <li class="nav-item">
        <a class="nav-link <?php echo $currentPage === 'users' ? 'active' : ''; ?>" href="/users">
            <i class="fas fa-users"></i> Utilisateurs
        </a>
    </li>
<?php endif; ?>
```

## Personnalisation du Layout

### Classes CSS Disponibles

Le système utilise des variables CSS pour faciliter la personnalisation :

```css
:root {
    --primary-color: #2c3e50;
    --secondary-color: #3498db;
    --accent-color: #e74c3c;
    --text-color: #2c3e50;
    --light-bg: #f8f9fa;
    --sidebar-width: 250px;
    --header-height: 60px;
}
```

### Éléments Principaux

1. **Conteneur Principal** : `<div class="wrapper">`
2. **Sidebar** : `<nav class="sidebar">`
3. **Contenu Principal** : `<div id="content">`
4. **Topbar** : `<nav class="navbar">`
5. **Footer** : `<footer class="footer">`

## Responsive Design

Le layout est conçu pour être responsive à différentes tailles d'écran :

- Sur les grands écrans, la sidebar est toujours visible
- Sur les petits écrans, la sidebar peut être masquée/affichée avec un bouton toggle
- Les tableaux utilisent la classe `table-responsive` pour une meilleure expérience mobile

## Bonnes Pratiques

1. **Toujours définir $currentPage** avant d'inclure le layout
2. **Utiliser la classe container-fluid** pour le contenu principal
3. **Structurer le contenu** avec des cartes (card) pour une présentation cohérente
4. **Échapper les données** avec `htmlspecialchars()` pour éviter les failles XSS
5. **Utiliser les classes Bootstrap** pour la mise en page responsive
6. **Inclure le footer.php** à la fin de chaque vue 