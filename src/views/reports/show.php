<?php
$currentPage = 'reports';
require_once __DIR__ . '/../layouts/app.php';
?>

<div class="container-fluid">
    <div class="row mb-4">
        <div class="col">
            <h1 class="h3 mb-0">Détails du rapport</h1>
        </div>
        <div class="col text-end">
            <a href="/reports" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Retour à la liste
            </a>
        </div>
    </div>

    <!-- Informations générales -->
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="card-title mb-0">Informations générales</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>ID :</strong> <?php echo htmlspecialchars($report['id']); ?></p>
                    <p><strong>Titre :</strong> <?php echo htmlspecialchars($report['title']); ?></p>
                    <p><strong>Type :</strong> <?php echo htmlspecialchars($report['type']); ?></p>
                    <p><strong>Statut :</strong> 
                        <?php if ($report['status'] === 'completed'): ?>
                            <span class="badge bg-success">Terminé</span>
                        <?php else: ?>
                            <span class="badge bg-warning">En cours</span>
                        <?php endif; ?>
                    </p>
                </div>
                <div class="col-md-6">
                    <p><strong>Date de création :</strong> <?php echo date('d/m/Y H:i', strtotime($report['created_at'])); ?></p>
                    <p><strong>Dernière modification :</strong> <?php echo date('d/m/Y H:i', strtotime($report['updated_at'])); ?></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Description -->
    <?php if (!empty($report['description'])): ?>
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="card-title mb-0">Description</h5>
        </div>
        <div class="card-body">
            <?php echo nl2br(htmlspecialchars($report['description'])); ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Paramètres -->
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="card-title mb-0">Paramètres</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Date de début :</strong> <?php echo date('d/m/Y', strtotime($report['parameters']['start_date'])); ?></p>
                    <p><strong>Date de fin :</strong> <?php echo date('d/m/Y', strtotime($report['parameters']['end_date'])); ?></p>
                </div>
                <div class="col-md-6">
                    <p><strong>Inclure des graphiques :</strong> <?php echo $report['parameters']['include_charts'] ? 'Oui' : 'Non'; ?></p>
                    <p><strong>Inclure des tableaux :</strong> <?php echo $report['parameters']['include_tables'] ? 'Oui' : 'Non'; ?></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Résultats -->
    <?php if ($report['status'] === 'completed'): ?>
    <div class="card">
        <div class="card-header">
            <h5 class="card-title mb-0">Résultats</h5>
        </div>
        <div class="card-body">
            <?php if ($report['parameters']['include_charts']): ?>
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <canvas id="chart1"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <canvas id="chart2"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($report['parameters']['include_tables']): ?>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Validées</th>
                            <th>Échouées</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($report['results']['daily_stats'] as $date => $stats): ?>
                        <tr>
                            <td><?php echo date('d/m/Y', strtotime($date)); ?></td>
                            <td><?php echo number_format($stats['total']); ?></td>
                            <td><?php echo number_format($stats['validated']); ?></td>
                            <td><?php echo number_format($stats['failed']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php endif; ?>
        </div>
    </div>
    <?php else: ?>
    <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i> Le rapport est en cours de génération. Veuillez patienter...
    </div>
    <?php endif; ?>
</div>

<?php if ($report['status'] === 'completed' && $report['parameters']['include_charts']): ?>
<script>
// Initialisation des graphiques
document.addEventListener('DOMContentLoaded', function() {
    // Graphique 1
    const ctx1 = document.getElementById('chart1').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: <?php echo json_encode(array_keys($report['results']['daily_stats'])); ?>,
            datasets: [{
                label: 'Entrées validées',
                data: <?php echo json_encode(array_column($report['results']['daily_stats'], 'validated')); ?>,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Évolution des entrées validées'
                }
            }
        }
    });

    // Graphique 2
    const ctx2 = document.getElementById('chart2').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: <?php echo json_encode(array_keys($report['results']['hourly_stats'])); ?>,
            datasets: [{
                label: 'Entrées par heure',
                data: <?php echo json_encode(array_values($report['results']['hourly_stats'])); ?>,
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribution horaire des entrées'
                }
            }
        }
    });
});
</script>
<?php endif; ?>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 