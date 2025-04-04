<?php
$pageTitle = 'Rapports';
$currentPage = 'reports';
require_once __DIR__ . '/../layouts/app.php';
?>

<div class="container-fluid">
    <div class="row mb-4">
        <div class="col">
            <h1 class="h3 mb-0">Rapports</h1>
        </div>
        <div class="col text-end">
            <a href="/reports/create" class="btn btn-primary">
                <i class="fas fa-plus"></i> Nouveau rapport
            </a>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h5 class="card-title mb-0">Liste des rapports</h5>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-striped table-hover" id="reportsTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Titre</th>
                            <th>Type</th>
                            <th>Date de création</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($reports as $report): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($report['id']); ?></td>
                            <td><?php echo htmlspecialchars($report['title']); ?></td>
                            <td><?php echo htmlspecialchars($report['type']); ?></td>
                            <td><?php echo date('d/m/Y H:i', strtotime($report['created_at'])); ?></td>
                            <td>
                                <?php if ($report['status'] === 'completed'): ?>
                                    <span class="badge bg-success">Terminé</span>
                                <?php else: ?>
                                    <span class="badge bg-warning">En cours</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <div class="btn-group">
                                    <a href="/reports/<?php echo $report['id']; ?>" class="btn btn-sm btn-info">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                    <a href="/reports/<?php echo $report['id']; ?>/edit" class="btn btn-sm btn-primary">
                                        <i class="fas fa-edit"></i>
                                    </a>
                                    <button type="button" class="btn btn-sm btn-danger" 
                                            onclick="deleteReport(<?php echo $report['id']; ?>)">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script>
$(document).ready(function() {
    $('#reportsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/fr-FR.json'
        }
    });
});

function deleteReport(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
        fetch(`/reports/${id}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Erreur lors de la suppression du rapport');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur lors de la suppression du rapport');
        });
    }
}
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 