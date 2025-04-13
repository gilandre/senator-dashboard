<?php
/**
 * Ce fichier aide à prévenir les doublons d'inclusions de parties de layout
 * en définissant des variables globales pour suivre les inclusions.
 */

// Empêcher les doublons de footer
if (!isset($GLOBALS['footer_included'])) {
    $GLOBALS['footer_included'] = false;
}

/**
 * Vérifie si un composant a déjà été inclus
 * @param string $component Le nom du composant à vérifier
 * @return bool true si le composant a déjà été inclus, false sinon
 */
if (!function_exists('isComponentIncluded')) {
    function isComponentIncluded(string $component): bool {
        $varName = "{$component}_included";
        return isset($GLOBALS[$varName]) && $GLOBALS[$varName] === true;
    }
}

/**
 * Marque un composant comme inclus
 * @param string $component Le nom du composant à marquer
 */
if (!function_exists('markComponentAsIncluded')) {
    function markComponentAsIncluded(string $component): void {
        $varName = "{$component}_included";
        $GLOBALS[$varName] = true;
    }
}
?> 