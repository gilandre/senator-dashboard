<?php
/**
 * Composant Stat Card
 * Utilisation: Affiche une carte de statistiques avec icône et valeur
 * 
 * Paramètres:
 * - icon: Classe de l'icône FontAwesome
 * - value: Valeur numérique à afficher
 * - label: Libellé de la statistique
 * - color: Couleur de la carte (primary, success, warning, danger, info)
 * - trend: Tendance (up, down ou null)
 * - trend_value: Valeur de la tendance (ex: +12%)
 * - card_class: Classes CSS supplémentaires
 */

$icon = $icon ?? 'fa-chart-line';
$color = $color ?? 'primary';
$trend = $trend ?? null;
$trend_value = $trend_value ?? null;
$card_class = $card_class ?? '';

// Classes CSS pour les tendances
$trend_class = '';
$trend_icon = '';

if ($trend === 'up') {
    $trend_class = 'text-success';
    $trend_icon = 'fa-arrow-up';
} elseif ($trend === 'down') {
    $trend_class = 'text-danger';
    $trend_icon = 'fa-arrow-down';
}
?>

<div class="card stat-card <?= htmlspecialchars($card_class) ?>">
    <div class="card-body">
        <div class="d-flex align-items-center">
            <div class="stat-icon bg-light-<?= htmlspecialchars($color) ?> me-3">
                <i class="fas <?= htmlspecialchars($icon) ?> text-<?= htmlspecialchars($color) ?>"></i>
            </div>
            <div>
                <h3 class="fs-4 fw-bold mb-0"><?= htmlspecialchars($value) ?></h3>
                <span class="text-muted small"><?= htmlspecialchars($label) ?></span>
                
                <?php if ($trend !== null && $trend_value !== null): ?>
                <div class="mt-1 <?= $trend_class ?>">
                    <i class="fas <?= $trend_icon ?> me-1"></i>
                    <small><?= htmlspecialchars($trend_value) ?></small>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div> 