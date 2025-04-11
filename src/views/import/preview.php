<?php $this->layout('layouts/main', ['title' => $title]) ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Aperçu des données à importer</h3>
                </div>
                <div class="card-body">
                    <?php if (!empty($validation['errors'])): ?>
                        <div class="alert alert-danger">
                            <h5>Erreurs détectées</h5>
                            <ul>
                                <?php foreach ($validation['errors'] as $error): ?>
                                    <li><?= htmlspecialchars($error) ?></li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php endif; ?>

                    <?php if (!empty($validation['warnings'])): ?>
                        <div class="alert alert-warning">
                            <h5>Avertissements</h5>
                            <ul>
                                <?php foreach ($validation['warnings'] as $warning): ?>
                                    <li><?= htmlspecialchars($warning) ?></li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php endif; ?>

                    <div class="table-responsive">
                        <table class="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>Numéro de badge</th>
                                    <th>Date</th>
                                    <th>Heure</th>
                                    <th>Type d'événement</th>
                                    <th>Central</th>
                                    <th>Groupe</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($data as $row): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($row['badge_number'] ?? '') ?></td>
                                        <td><?= htmlspecialchars($row['event_date'] ?? '') ?></td>
                                        <td><?= htmlspecialchars($row['event_time'] ?? '') ?></td>
                                        <td><?= htmlspecialchars($row['event_type'] ?? '') ?></td>
                                        <td><?= htmlspecialchars($row['central'] ?? '') ?></td>
                                        <td><?= htmlspecialchars($row['group_name'] ?? '') ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-3">
                        <form action="/import/process" method="post">
                            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
                            <input type="hidden" name="file_id" value="<?= $file_id ?>">
                            
                            <button type="submit" class="btn btn-primary" <?= !empty($validation['has_blocking_errors']) ? 'disabled' : '' ?>>
                                Confirmer l'importation
                            </button>
                            <a href="/import" class="btn btn-secondary">Annuler</a>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div> 