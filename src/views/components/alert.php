<?php
/**
 * Composant Alert
 * Utilisation: Affiche une alerte avec différents types de styles
 * 
 * Paramètres:
 * - type: Type d'alerte (success, danger, warning, info)
 * - message: Message à afficher
 * - dismissible: Si l'alerte peut être fermée (boolean)
 * - icon: Icône à afficher (facultatif)
 */

$type = $type ?? 'info';
$dismissible = $dismissible ?? false;
$icon = $icon ?? null;

// Déterminer l'icône par défaut en fonction du type si non spécifiée
if ($icon === null) {
    switch ($type) {
        case 'success':
            $icon = 'fa-check-circle';
            break;
        case 'danger':
            $icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            $icon = 'fa-exclamation-triangle';
            break;
        case 'info':
        default:
            $icon = 'fa-info-circle';
            break;
    }
}
?>

<div class="alert alert-<?= htmlspecialchars($type) ?> <?= $dismissible ? 'alert-dismissible fade show' : '' ?>" role="alert">
    <?php if ($icon): ?>
    <i class="fas <?= htmlspecialchars($icon) ?> me-2"></i>
    <?php endif; ?>
    
    <?= $message ?>
    
    <?php if ($dismissible): ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
    <?php endif; ?>
</div> 