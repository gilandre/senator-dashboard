# Guide de contribution

Merci de votre intérêt pour contribuer au projet SENATOR Dashboard ! Voici quelques directives pour vous aider à contribuer efficacement.

## Processus de développement

1. Fork du dépôt
2. Création d'une branche pour votre fonctionnalité (`git checkout -b feature/nom-de-la-fonctionnalite`)
3. Commit de vos changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Push vers votre branche (`git push origin feature/nom-de-la-fonctionnalite`)
5. Création d'une Pull Request

## Structure des branches

- `main` : Branche de production, stable
- `develop` : Branche de développement, utilisée pour intégrer les nouvelles fonctionnalités
- `feature/*` : Branches pour les nouvelles fonctionnalités
- `bugfix/*` : Branches pour les corrections de bugs
- `hotfix/*` : Branches pour les correctifs urgents en production

## Standards de code

- Suivre les standards PSR-12 pour le style de code PHP
- Nommer les variables et fonctions en camelCase
- Nommer les classes en PascalCase
- Nommer les tables et colonnes de base de données en snake_case
- Commenter le code complexe ou non trivial
- Écrire des tests unitaires pour les nouvelles fonctionnalités

## Pull Requests

- Les Pull Requests doivent cibler la branche `develop`
- Assurez-vous que tous les tests passent
- Ajoutez une description claire de vos modifications
- Référencez les issues pertinentes
- Assurez-vous d'avoir mis à jour la documentation si nécessaire

## Rapports de bugs

Lors de la soumission d'un rapport de bug, veuillez inclure :

- Une description claire du problème
- Les étapes pour reproduire le problème
- L'environnement dans lequel le problème se produit (navigateur, OS, version PHP, etc.)
- Des captures d'écran si possible

## Propositions de fonctionnalités

Pour proposer une nouvelle fonctionnalité :

- Décrivez clairement la fonctionnalité
- Expliquez pourquoi cette fonctionnalité serait utile
- Proposez une implémentation technique si possible
- Indiquez si vous êtes prêt à contribuer à l'implémentation

## Tests

- Assurez-vous que vos modifications passent tous les tests existants
- Ajoutez de nouveaux tests pour les nouvelles fonctionnalités
- Pour exécuter les tests localement : `./vendor/bin/phpunit`

Merci de contribuer à améliorer SENATOR Dashboard ! 