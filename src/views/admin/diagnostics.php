<?php
/**
 * Vue de diagnostic de performance pour l'importation
 */
?>

<div class="container mt-4">
    <h1 class="mb-4">Diagnostic de Performance d'Importation</h1>
    
    <div class="alert alert-info">
        <strong>Information!</strong> Cette page est destinée aux administrateurs pour diagnostiquer et résoudre les problèmes de performance lors de l'importation de fichiers CSV.
    </div>
    
    <div class="row">
        <div class="col-md-6">
            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="card-title mb-0">Configuration PHP</h5>
                </div>
                <div class="card-body">
                    <table class="table table-striped">
                        <tr>
                            <th>Paramètre</th>
                            <th>Valeur actuelle</th>
                            <th>Recommandation</th>
                        </tr>
                        <tr>
                            <td>memory_limit</td>
                            <td><?= $diagnostics['memory_limit'] ?></td>
                            <td><?= $diagnostics['file_upload_recommendations']['memory_limit'] ?></td>
                        </tr>
                        <tr>
                            <td>max_execution_time</td>
                            <td><?= $diagnostics['max_execution_time'] ?> secondes</td>
                            <td><?= $diagnostics['file_upload_recommendations']['max_execution_time'] ?></td>
                        </tr>
                        <tr>
                            <td>post_max_size</td>
                            <td><?= $diagnostics['post_max_size'] ?></td>
                            <td><?= $diagnostics['file_upload_recommendations']['post_max_size'] ?></td>
                        </tr>
                        <tr>
                            <td>upload_max_filesize</td>
                            <td><?= $diagnostics['upload_max_filesize'] ?></td>
                            <td><?= $diagnostics['file_upload_recommendations']['upload_max_filesize'] ?></td>
                        </tr>
                        <tr>
                            <td>max_input_time</td>
                            <td><?= $diagnostics['max_input_time'] ?> secondes</td>
                            <td>300 secondes (recommandé)</td>
                        </tr>
                        <tr>
                            <td>Utilisation mémoire actuelle</td>
                            <td><?= $diagnostics['memory_usage'] ?></td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td>Dossier temporaire</td>
                            <td><?= $diagnostics['temp_directory'] ?></td>
                            <td>Vérifier l'espace disque disponible</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="col-md-6">
            <div class="card mb-4">
                <div class="card-header bg-warning text-dark">
                    <h5 class="card-title mb-0">Recommandations d'optimisation</h5>
                </div>
                <div class="card-body">
                    <ul class="list-group">
                        <?php foreach ($diagnostics['optimisation_suggestions'] as $suggestion): ?>
                            <li class="list-group-item"><?= $suggestion ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header bg-info text-white">
                    <h5 class="card-title mb-0">Configuration Base de Données</h5>
                </div>
                <div class="card-body">
                    <table class="table table-striped">
                        <tr>
                            <th>Attribut</th>
                            <th>Valeur</th>
                        </tr>
                        <?php foreach ($diagnostics['database_config']['pdo_attributes'] as $attr => $value): ?>
                            <tr>
                                <td><?= $attr ?></td>
                                <td><?= $value ? 'Activé' : 'Désactivé' ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <div class="card mt-4">
        <div class="card-header bg-success text-white">
            <h5 class="card-title mb-0">Actions recommandées</h5>
        </div>
        <div class="card-body">
            <p>Suivez ces étapes pour améliorer les performances d'importation :</p>
            <ol>
                <li>Modifiez le fichier <code>php.ini</code> pour augmenter les limites de ressources.</li>
                <li>Redémarrez votre serveur web après les modifications.</li>
                <li>Pour les imports très volumineux, divisez vos fichiers en plusieurs parties de moins de 10 000 lignes.</li>
                <li>Assurez-vous que vos fichiers CSV sont correctement formatés avec toutes les données requises.</li>
                <li>Évitez d'importer des fichiers pendant les heures de forte utilisation du serveur.</li>
            </ol>
            
            <div class="alert alert-secondary mt-3">
                <strong>Note:</strong> Les optimisations implémentées dans cette version incluent:
                <ul>
                    <li>Utilisation de <code>move_uploaded_file()</code> au lieu de <code>copy()</code></li>
                    <li>Requêtes SQL optimisées pour la vérification des doublons</li>
                    <li>Insertions SQL en lot pour réduire le nombre de requêtes</li>
                    <li>Traitement du CSV plus rapide avec <code>SplFileObject</code></li>
                    <li>Validation et formatage de date/heure optimisés</li>
                    <li>Réduction des journaux excessifs</li>
                </ul>
            </div>
        </div>
    </div>
    
    <div class="mt-4 mb-5">
        <a href="/import" class="btn btn-primary">Retour à l'importation</a>
    </div>
</div> 