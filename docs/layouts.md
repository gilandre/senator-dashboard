# Documentation du système de layout

## Introduction

Le système de layout de SENATOR Dashboard permet de maintenir une cohérence visuelle dans toute l'application tout en permettant des variations selon les besoins. Cette documentation explique comment les layouts sont organisés et comment les utiliser correctement.

## Structure des layouts

### Layouts disponibles

Le système propose plusieurs layouts :

- **app** : Layout principal utilisé pour les pages d'application après authentification
- **auth** : Layout spécifique pour les pages d'authentification (login, inscription, récupération de mot de passe)
- **blank** : Layout minimaliste sans éléments de navigation (pour les pages d'erreur ou d'impression)
- **default** : Redirige automatiquement vers 'app' pour maintenir la cohérence

### Composants inclus

Chaque layout peut inclure différents composants :
- **navbar** : Barre de navigation supérieure
- **sidebar** : Menu latéral de navigation
- **footer** : Pied de page
- **alerts** : Système d'affichage des messages flash

## Utilisation dans les contrôleurs

Pour définir le layout à utiliser dans un contrôleur :

```php
class MonController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        // Définir explicitement le layout à utiliser
        $this->layout = 'app';
        
        // Initialisation des services, etc.
    }
    
    // Méthodes du contrôleur...
}
```

### Bonnes pratiques

1. **Toujours définir explicitement le layout** dans le constructeur du contrôleur pour éviter de dépendre du layout par défaut.
2. **Utiliser les noms courts** définis dans le LayoutManager ('app', 'auth', etc.) plutôt que les chemins complets.
3. **Pour les pages qui nécessitent un layout différent**, vous pouvez modifier dynamiquement le layout dans une méthode spécifique :

```php
public function rapportImpression()
{
    // Changer temporairement de layout pour cette vue
    $this->layout = 'blank';
    
    // Générer la vue...
    $this->view('rapports/impression', $data);
}
```

## Messages flash

Pour afficher des messages temporaires à l'utilisateur, utilisez la méthode `setFlash()` :

```php
// Pour afficher un message de succès
$this->setFlash('success', 'Opération réussie');

// Pour afficher un message d'erreur
$this->setFlash('error', 'Une erreur est survenue');

// Pour afficher un message d'information
$this->setFlash('info', 'Information importante');
```

## Transmission de données au layout

Pour passer des données spécifiques au layout (titre de page, scripts supplémentaires, etc.), incluez-les dans le tableau de données lors de l'appel à la méthode `view()` :

```php
$this->view('maVue', [
    'title' => 'Titre de la page',
    'pageScripts' => ['/assets/js/monScript.js'],
    'hideGlobalTopbar' => true,  // Pour masquer la barre de navigation
    // Autres données...
]);
``` 