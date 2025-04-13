<?php
/**
 * Routes pour la démonstration de l'interface modulaire
 */

return [
    ['GET', '/module-demo', [App\Controllers\ModuleDemoController::class, 'index']]
]; 