<?php
/**
 * Composant Card
 * Utilisation: Affiche une carte Bootstrap avec contenu personnalisable
 * 
 * Paramètres:
 * - title: Titre de la carte (facultatif)
 * - content: Contenu principal de la carte
 * - footer: Contenu du pied de carte (facultatif)
 * - header_class: Classes CSS pour l'en-tête (facultatif)
 * - body_class: Classes CSS pour le corps (facultatif)
 * - footer_class: Classes CSS pour le pied (facultatif)
 * - card_class: Classes CSS pour la carte entière (facultatif)
 * - header_actions: Actions à afficher dans l'en-tête (HTML, facultatif)
 */

$title = $title ?? null;
$footer = $footer ?? null;
$header_class = $header_class ?? '';
$body_class = $body_class ?? '';
$footer_class = $footer_class ?? '';
$card_class = $card_class ?? '';
$header_actions = $header_actions ?? null;
?>

<div class="card <?= htmlspecialchars($card_class) ?>">
    <?php if ($title !== null || $header_actions !== null): ?>
    <div class="card-header <?= htmlspecialchars($header_class) ?>">
        <div class="d-flex justify-content-between align-items-center">
            <?php if ($title !== null): ?>
            <h5 class="card-title mb-0"><?= htmlspecialchars($title) ?></h5>
            <?php endif; ?>
            
            <?php if ($header_actions !== null): ?>
            <div class="card-actions">
                <?= $header_actions ?>
            </div>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>
    
    <div class="card-body <?= htmlspecialchars($body_class) ?>">
        <?= $content ?>
    </div>
    
    <?php if ($footer !== null): ?>
    <div class="card-footer <?= htmlspecialchars($footer_class) ?>">
        <?= $footer ?>
    </div>
    <?php endif; ?>
</div> 