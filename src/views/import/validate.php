<?php
// Récupérer le titre de la page et la page courante pour le menu
$pageTitle = "Validation des données";
$currentPage = "import";

// Inclure l'en-tête
include __DIR__ . '/../../views/layouts/header.php';
?>

<div class="container-fluid">
    <div class="row">
        <!-- Inclure la sidebar -->
        <?php include __DIR__ . '/../../views/layouts/partials/sidebar.php'; ?>
        
        <!-- Contenu principal -->
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 class="h2">Validation des données</h1>
            </div>
            
            <div class="alert alert-primary">
                <h4>Vérification avant importation</h4>
                <p>Veuillez vérifier les données ci-dessous avant de procéder à l'importation complète.</p>
            </div>
            
            <!-- Informations sur le fichier -->
            <div class="card mb-4">
                <div class="card-header">
                    <h5 class="mb-0">Informations sur le fichier</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Nombre total de lignes :</strong> <?= number_format($totalRows) ?></p>
                            <p><strong>Séparateur :</strong> <?= htmlspecialchars($separator ?: ';') ?></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>En-tête présent :</strong> <?= $hasHeader ? 'Oui' : 'Non' ?></p>
                            <p><strong>Aperçu :</strong> 10 premières lignes</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Aperçu des données -->
            <div class="card mb-4">
                <div class="card-header">
                    <h5 class="mb-0">Aperçu des données</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <?php foreach ($headers as $header): ?>
                                        <th><?= htmlspecialchars($header) ?></th>
                                    <?php endforeach; ?>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($rows as $row): ?>
                                    <tr>
                                        <?php foreach ($row as $cell): ?>
                                            <td><?= htmlspecialchars($cell ?? '') ?></td>
                                        <?php endforeach; ?>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    
                    <?php if (count($rows) < $totalRows): ?>
                        <div class="alert alert-info mt-3">
                            <p class="mb-0">Affichage de <?= count($rows) ?> lignes sur un total de <?= number_format($totalRows) ?>.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Validation des colonnes requises -->
            <div class="card mb-4">
                <div class="card-header">
                    <h5 class="mb-0">Validation des colonnes</h5>
                </div>
                <div class="card-body">
                    <?php
                    // Liste des colonnes requises
                    $requiredColumns = [
                        'Numéro de badge',
                        'Date évènements', 
                        'Heure évènements',
                        'Centrale',
                        'Nature Evenement'
                    ];
                    
                    // Vérifier si toutes les colonnes requises sont présentes
                    $missingColumns = array_diff($requiredColumns, $headers);
                    ?>
                    
                    <?php if (empty($missingColumns)): ?>
                        <div class="alert alert-success">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            Toutes les colonnes requises sont présentes dans le fichier.
                        </div>
                    <?php else: ?>
                        <div class="alert alert-danger">
                            <h5><i class="bi bi-exclamation-triangle-fill me-2"></i>Colonnes manquantes</h5>
                            <p>Les colonnes suivantes sont requises mais n'ont pas été trouvées dans le fichier :</p>
                            <ul>
                                <?php foreach ($missingColumns as $column): ?>
                                    <li><?= htmlspecialchars($column) ?></li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php endif; ?>
                    
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Colonne</th>
                                    <th>Statut</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($requiredColumns as $column): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($column) ?></td>
                                        <td>
                                            <?php if (in_array($column, $headers)): ?>
                                                <span class="badge bg-success">Présente</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger">Manquante</span>
                                            <?php endif; ?>
                                        </td>
                                        <td>Colonne requise pour l'importation</td>
                                    </tr>
                                <?php endforeach; ?>
                                
                                <?php
                                // Colonnes optionnelles
                                $optionalColumns = [
                                    'Nom' => 'Nom de la personne',
                                    'Prénom' => 'Prénom de la personne',
                                    'Statut' => 'Statut de la personne',
                                    'Groupe' => 'Groupe auquel appartient la personne'
                                ];
                                
                                foreach ($optionalColumns as $column => $description):
                                ?>
                                    <tr>
                                        <td><?= htmlspecialchars($column) ?></td>
                                        <td>
                                            <?php if (in_array($column, $headers)): ?>
                                                <span class="badge bg-success">Présente</span>
                                            <?php else: ?>
                                                <span class="badge bg-warning">Optionnelle</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?= htmlspecialchars($description) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Actions -->
            <div class="d-flex justify-content-between mb-5">
                <a href="/import" class="btn btn-secondary">
                    <i class="bi bi-arrow-left"></i> Retour
                </a>
                
                <?php if (empty($missingColumns)): ?>
                    <form action="/import/process" method="post">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-circle"></i> Procéder à l'importation
                        </button>
                    </form>
                <?php else: ?>
                    <button type="button" class="btn btn-primary" disabled>
                        <i class="bi bi-check-circle"></i> Procéder à l'importation
                    </button>
                <?php endif; ?>
            </div>
        </main>
    </div>
</div>

<?php
// Inclure le pied de page
include __DIR__ . '/../../views/layouts/footer.php';
?> 