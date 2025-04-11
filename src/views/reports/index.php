<?php
$pageTitle = 'Rapports';
$currentPage = 'reports';
ob_start();
?>

<div class="container-fluid">
    <!-- Filtres communs -->
    <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Filtres généraux</h5>
            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#filterCollapse">
                <i class="fas fa-filter"></i> Afficher/Masquer
            </button>
        </div>
        <div class="collapse show" id="filterCollapse">
            <div class="card-body">
                <form id="reportFilterForm" method="get" class="row g-3">
                    <input type="hidden" name="type" value="<?php echo htmlspecialchars($reportType ?? 'catalog'); ?>">
                    
                    <div class="col-md-3">
                        <label for="start_date" class="form-label">Date de début</label>
                        <input type="date" class="form-control" id="start_date" name="start_date" value="<?php echo htmlspecialchars($startDate ?? date('Y-m-d', strtotime('-7 days'))); ?>">
                    </div>
                    
                    <div class="col-md-3">
                        <label for="end_date" class="form-label">Date de fin</label>
                        <input type="date" class="form-control" id="end_date" name="end_date" value="<?php echo htmlspecialchars($endDate ?? date('Y-m-d')); ?>">
                    </div>
                    
                    <div class="col-md-3">
                        <label for="group" class="form-label">Groupe</label>
                        <select class="form-select" id="group" name="group">
                            <option value="">Tous les groupes</option>
                            <?php if(isset($groups) && is_array($groups)): ?>
                                <?php foreach ($groups as $groupOption): ?>
                                    <option value="<?php echo htmlspecialchars($groupOption); ?>" <?php echo isset($group) && $group === $groupOption ? 'selected' : ''; ?>>
                                        <?php echo htmlspecialchars($groupOption); ?>
                                    </option>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </select>
                    </div>
                    
                    <div class="col-md-3">
                        <label for="status" class="form-label">Statut</label>
                        <select class="form-select" id="status" name="status">
                            <option value="">Tous les statuts</option>
                            <?php if(isset($statuses) && is_array($statuses)): ?>
                                <?php foreach ($statuses as $statusOption): ?>
                                    <option value="<?php echo htmlspecialchars($statusOption); ?>" <?php echo isset($status) && $status === $statusOption ? 'selected' : ''; ?>>
                                        <?php echo htmlspecialchars($statusOption); ?>
                                    </option>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </select>
                    </div>
                    
                    <div class="col-12 text-end">
                        <button type="submit" class="btn btn-primary">Appliquer les filtres</button>
                        <a href="/reports" class="btn btn-outline-secondary">Réinitialiser</a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <?php if (isset($errorMessage)): ?>
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($errorMessage); ?>
        </div>
    <?php endif; ?>

    <!-- Catalogue de rapports ou rapport spécifique -->
    <?php if ($reportType === 'catalog'): ?>
        <div class="row mb-4">
            <div class="col">
                <h1 class="h3 mb-0">Catalogue de rapports</h1>
                <p class="text-muted">Sélectionnez un type de rapport pour visualiser les données détaillées</p>
            </div>
        </div>

        <div class="row">
            <!-- Carte Présence et accès -->
            <div class="col-md-6 col-lg-3 mb-4">
                <a href="/reports?type=attendance&start_date=<?php echo urlencode($startDate ?? date('Y-m-d', strtotime('-7 days'))); ?>&end_date=<?php echo urlencode($endDate ?? date('Y-m-d')); ?>" class="card-link text-decoration-none">
                    <div class="card h-100 border-primary hover-shadow">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="flex-shrink-0 me-3">
                                    <div class="bg-light-primary rounded p-3">
                                        <i class="fas fa-user-check fa-2x text-primary"></i>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="card-title mb-1">Présence et accès</h5>
                                    <p class="card-text small text-muted">Statistiques détaillées des entrées, sorties et présence par jour et par statut</p>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="btn btn-sm btn-outline-primary">
                                    Voir les détails <i class="fas fa-arrow-right"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
            
            <!-- Carte Temps de travail -->
            <div class="col-md-6 col-lg-3 mb-4">
                <a href="/reports?type=worktime&start_date=<?php echo urlencode($startDate ?? date('Y-m-d', strtotime('-7 days'))); ?>&end_date=<?php echo urlencode($endDate ?? date('Y-m-d')); ?>" class="card-link text-decoration-none">
                    <div class="card h-100 border-success hover-shadow">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="flex-shrink-0 me-3">
                                    <div class="bg-light-success rounded p-3">
                                        <i class="fas fa-clock fa-2x text-success"></i>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="card-title mb-1">Temps de travail</h5>
                                    <p class="card-text small text-muted">Analyse des heures travaillées, ponctualité et tendances</p>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="btn btn-sm btn-outline-success">
                                    Voir les détails <i class="fas fa-arrow-right"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
            
            <!-- Carte Sécurité et contrôle -->
            <div class="col-md-6 col-lg-3 mb-4">
                <a href="/reports?type=security&start_date=<?php echo urlencode($startDate ?? date('Y-m-d', strtotime('-7 days'))); ?>&end_date=<?php echo urlencode($endDate ?? date('Y-m-d')); ?>" class="card-link text-decoration-none">
                    <div class="card h-100 border-danger hover-shadow">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="flex-shrink-0 me-3">
                                    <div class="bg-light-danger rounded p-3">
                                        <i class="fas fa-shield-alt fa-2x text-danger"></i>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="card-title mb-1">Sécurité et contrôle</h5>
                                    <p class="card-text small text-muted">Suivi des tentatives d'accès, anomalies et contrôles</p>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="btn btn-sm btn-outline-danger">
                                    Voir les détails <i class="fas fa-arrow-right"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
            
            <!-- Carte Tableaux personnalisés -->
            <div class="col-md-6 col-lg-3 mb-4">
                <a href="/reports?type=custom&start_date=<?php echo urlencode($startDate ?? date('Y-m-d', strtotime('-7 days'))); ?>&end_date=<?php echo urlencode($endDate ?? date('Y-m-d')); ?>" class="card-link text-decoration-none">
                    <div class="card h-100 border-info hover-shadow">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="flex-shrink-0 me-3">
                                    <div class="bg-light-info rounded p-3">
                                        <i class="fas fa-chart-line fa-2x text-info"></i>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="card-title mb-1">Tableaux personnalisés</h5>
                                    <p class="card-text small text-muted">Créez vos propres KPI et tableaux de suivi personnalisés</p>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="btn btn-sm btn-outline-info">
                                    Voir les détails <i class="fas fa-arrow-right"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    <?php else: ?>
        <?php
        // Inclusion du template spécifique au type de rapport
        $templateFile = __DIR__ . '/templates/' . $reportType . '.php';
        if (file_exists($templateFile)) {
            include $templateFile;
        } else {
            echo '<div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> 
                Template de rapport non trouvé pour le type "' . htmlspecialchars($reportType) . '"
            </div>';
        }
        ?>
    <?php endif; ?>
</div>

<script>
// Toggle sidebar
$(document).ready(function() {
    // Gestion de l'affichage des dates
    $('.date-format').each(function() {
        var dateString = $(this).text();
        if (dateString) {
            var date = new Date(dateString);
            $(this).text(date.toLocaleDateString('fr-FR'));
        }
    });
    
    // Initialisation des datatables
    $('.datatable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/fr-FR.json'
        }
    });
    
    // Initialisation des tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Hover effect pour les cartes
    $('.hover-shadow').hover(
        function() {
            $(this).addClass('shadow-lg').css('cursor', 'pointer');
        }, function() {
            $(this).removeClass('shadow-lg');
        }
    );
});

// Ajout du style pour les cartes au survol
const style = document.createElement('style');
style.innerHTML = `
    .bg-light-info {
        background-color: rgba(13, 202, 240, 0.1);
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .hover-shadow {
        transition: all 0.3s;
    }
    .bg-light-primary {
        background-color: rgba(13, 110, 253, 0.1);
    }
    .bg-light-success {
        background-color: rgba(25, 135, 84, 0.1);
    }
    .bg-light-danger {
        background-color: rgba(220, 53, 69, 0.1);
    }
    .rounded-circle {
        border-radius: 50%!important;
    }
`;
document.head.appendChild(style);
</script>

<?php
$content = ob_get_clean();
include __DIR__ . '/../layouts/main.php';
?> 