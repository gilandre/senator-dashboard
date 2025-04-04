<?php
$pageTitle = 'Tableau de bord RH - Assiduité';
$currentPage = 'dashboard';
$hideGlobalTopbar = false; // Activer la topbar globale standard

// Vérification des données pour éviter les erreurs
$dailyStats = $dailyStats ?? [];
$attendanceStats = $attendanceStats ?? [
    'present_employees' => 0,
    'total_expected' => 10,
    'attendance_rate' => 0
];
$workingHoursStats = $workingHoursStats ?? [
    'avg_arrival_time' => '00:00',
    'avg_departure_time' => '00:00',
    'avg_work_duration' => '00:00',
    'punctuality_rate' => 0,
    'early_departures_rate' => 0
];
$employeeData = $employeeData ?? [];

$chartData = $chartData ?? [
    'weekly' => ['labels' => [], 'people' => [], 'entries' => []],
    'arrivalDistribution' => ['labels' => [], 'data' => []],
    'departureDistribution' => ['labels' => [], 'data' => []]
];

// Scripts pour la page
$pageFooterScripts = [
    'https://cdn.jsdelivr.net/npm/luxon@3.3.0/build/global/luxon.min.js',
    '/assets/js/dashboard.js'
];

// Début du contenu de la page
ob_start();
?>

<div class="dashboard-container">
    <!-- En-tête avec filtres -->
    <div class="dashboard-header">
        <div class="filter-section">
            <div class="date-filter-container">
                <div class="d-flex align-items-center">
                    <div class="date-icon me-2">
                        <i class="fas fa-calendar-alt text-primary"></i>
                    </div>
                    <div class="date-input-group">
                        <label for="dashboardDate" class="date-label mb-1">Période d'analyse</label>
                        <div class="d-flex align-items-center">
                            <input type="date" id="dashboardDate" class="form-control form-control-sm date-input me-2">
                            <button id="refreshDashboard" class="btn btn-primary btn-sm refresh-btn">
                                <i class="fas fa-sync-alt"></i>
                                <span class="ms-1 d-none d-sm-inline">Actualiser</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="dashboard-last-update">
                <span class="text-muted small">Dernière mise à jour: <span id="lastUpdateTime">-</span></span>
            </div>
        </div>
    </div>

    <!-- KPI Cards Row -->
    <div class="kpi-section row g-1 mx-0">
        <!-- Total Personnel Card -->
        <div class="col-xl-3 col-lg-3 col-md-3 mb-2">
            <div class="dashboard-card border-accent-primary kpi-card">
                <div class="card-body">
                    <div class="card-content">
                        <div class="card-info">
                            <h6 class="card-title">Personnel présent</h6>
                            <div class="card-value">
                                <span id="totalCount">-</span>
                                <div class="spinner-border spinner-border-sm loading-spinner text-primary" role="status">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-icon">
                            <div class="icon-circle bg-primary-soft">
                                <i class="fas fa-users text-primary"></i>
                            </div>
                        </div>
                    </div>
                    <div class="card-trend mt-2">
                        <span class="text-nowrap small" id="totalTrend"></span>
                        <a href="/reports?type=attendance&metric=total&date=" class="btn btn-link btn-sm text-primary detail-link px-0" id="totalDetailLink">
                            <i class="fas fa-external-link-alt me-1"></i>Voir détails
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- On Time Card -->
        <div class="col-xl-3 col-lg-3 col-md-3 mb-2">
            <div class="dashboard-card border-accent-success kpi-card">
                <div class="card-body">
                    <div class="card-content">
                        <div class="card-info">
                            <h6 class="card-title">Arrivés à l'heure (<9h)</h6>
                            <div class="card-value">
                                <span id="onTimeCount">-</span>
                                <div class="spinner-border spinner-border-sm loading-spinner text-success" role="status">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-icon">
                            <div class="icon-circle bg-success-soft">
                                <i class="fas fa-check-circle text-success"></i>
                            </div>
                        </div>
                    </div>
                    <div class="card-trend mt-2">
                        <span class="text-nowrap small" id="onTimeTrend"></span>
                        <a href="/reports?type=attendance&metric=ontime&date=" class="btn btn-link btn-sm text-success detail-link px-0" id="onTimeDetailLink">
                            <i class="fas fa-external-link-alt me-1"></i>Voir détails
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Late Card -->
        <div class="col-xl-3 col-lg-3 col-md-3 mb-2">
            <div class="dashboard-card border-accent-warning kpi-card">
                <div class="card-body">
                    <div class="card-content">
                        <div class="card-info">
                            <h6 class="card-title">Arrivés en retard (≥9h)</h6>
                            <div class="card-value">
                                <span id="lateCount">-</span>
                                <div class="spinner-border spinner-border-sm loading-spinner text-warning" role="status">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-icon">
                            <div class="icon-circle bg-warning-soft">
                                <i class="fas fa-clock text-warning"></i>
                            </div>
                        </div>
                    </div>
                    <div class="card-trend mt-2">
                        <span class="text-nowrap small" id="lateTrend"></span>
                        <a href="/reports?type=attendance&metric=late&date=" class="btn btn-link btn-sm text-warning detail-link px-0" id="lateDetailLink">
                            <i class="fas fa-external-link-alt me-1"></i>Voir détails
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Average Working Hours Card -->
        <div class="col-xl-3 col-lg-3 col-md-3 mb-2">
            <div class="dashboard-card border-accent-info kpi-card">
                <div class="card-body">
                    <div class="card-content">
                        <div class="card-info">
                            <h6 class="card-title">Temps moyen de présence</h6>
                            <div class="card-value">
                                <span id="avgHoursValue">-</span>h
                                <div class="spinner-border spinner-border-sm loading-spinner text-info" role="status">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-icon">
                            <div class="icon-circle bg-info-soft">
                                <i class="fas fa-business-time text-info"></i>
                            </div>
                        </div>
                    </div>
                    <div class="card-trend mt-2">
                        <span class="text-nowrap small" id="avgHoursTrend"></span>
                        <a href="/reports?type=attendance&metric=hours&date=" class="btn btn-link btn-sm text-info detail-link px-0" id="hoursDetailLink">
                            <i class="fas fa-external-link-alt me-1"></i>Voir détails
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-section row">
        <!-- Arrival Distribution Chart -->
        <div class="col-xl-6 col-lg-6 mb-4">
            <div class="dashboard-card chart-card" id="arrivalChartCard">
                <div class="card-header">
                    <h6 class="mb-0 fw-bold">Distribution des arrivées</h6>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-icon download-btn" data-chart-id="arrival" data-bs-toggle="tooltip" title="Télécharger les données">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-icon info-btn" data-chart-id="arrival" data-bs-toggle="tooltip" title="Plus d'informations">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="chart-area position-relative">
                        <div class="d-flex justify-content-center align-items-center h-100 loading-spinner chart-spinner">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                        <canvas id="arrivalChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Departure Distribution Chart -->
        <div class="col-xl-6 col-lg-6 mb-4">
            <div class="dashboard-card chart-card" id="departureChartCard">
                <div class="card-header">
                    <h6 class="mb-0 fw-bold">Distribution des départs</h6>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-icon download-btn" data-chart-id="departure" data-bs-toggle="tooltip" title="Télécharger les données">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-icon info-btn" data-chart-id="departure" data-bs-toggle="tooltip" title="Plus d'informations">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="chart-area position-relative">
                        <div class="d-flex justify-content-center align-items-center h-100 loading-spinner chart-spinner">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                        <canvas id="departureChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Additional Charts Row -->
    <div class="charts-section row">
        <!-- Working Hours Distribution Chart -->
        <div class="col-xl-6 col-lg-6 mb-4">
            <div class="dashboard-card chart-card" id="workingHoursChartCard">
                <div class="card-header">
                    <h6 class="mb-0 fw-bold">Répartition des heures de travail</h6>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-icon download-btn" data-chart-id="workingHours" data-bs-toggle="tooltip" title="Télécharger les données">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-icon info-btn" data-chart-id="workingHours" data-bs-toggle="tooltip" title="Plus d'informations">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="chart-area position-relative">
                        <div class="d-flex justify-content-center align-items-center h-100 loading-spinner chart-spinner">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                        <canvas id="workingHoursChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Help Card -->
        <div class="col-xl-6 col-lg-6 mb-4">
            <div class="dashboard-card">
                <div class="card-header">
                    <h6 class="mb-0 fw-bold">Conseils d'utilisation</h6>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-icon" data-bs-toggle="tooltip" title="Plus d'informations">
                            <i class="fas fa-question-circle"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="p-2">
                        <h5 class="fw-bold fs-6 mb-3">Tableau de bord d'assiduité RH</h5>
                        <p class="text-muted">Ce tableau de bord vous permet de visualiser les données d'assiduité du personnel :</p>
                        <ul class="feature-list">
                            <li><i class="fas fa-users text-primary me-2"></i> <strong>Personnel présent</strong> : Nombre total de personnes ayant badgé dans la journée.</li>
                            <li><i class="fas fa-check-circle text-success me-2"></i> <strong>Arrivés à l'heure</strong> : Nombre de personnes arrivées avant 9h.</li>
                            <li><i class="fas fa-clock text-warning me-2"></i> <strong>Arrivés en retard</strong> : Nombre de personnes arrivées à 9h ou après.</li>
                            <li><i class="fas fa-business-time text-info me-2"></i> <strong>Temps moyen de présence</strong> : Durée moyenne entre la première et la dernière badgeuse de chaque employé.</li>
                        </ul>
                        <div class="tip-box mt-3">
                            <i class="fas fa-lightbulb text-warning me-2"></i>
                            <span>Utilisez le sélecteur de date en haut pour visualiser les données d'un jour spécifique.</span>
                        </div>
                        <div class="tip-box mt-3 bg-light">
                            <i class="fas fa-download text-primary me-2"></i>
                            <span>Vous pouvez télécharger les données des graphiques au format CSV ou consulter plus d'informations en cliquant sur les icônes correspondantes.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Dashboard Layout */
    .dashboard-container {
        padding: 1.5rem 0.5rem;
    }
    
    /* Header and Filters */
    .dashboard-header {
        margin-bottom: 1.5rem;
    }
    
    .filter-section {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }
    
    .dashboard-last-update {
        margin-left: auto;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        background-color: rgba(240, 240, 250, 0.5);
    }
    
    /* Cards Design */
    .dashboard-card {
        background-color: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        height: 100%;
        transition: all 0.25s ease;
        border: 1px solid rgba(240, 240, 250, 0.8);
    }
    
    .dashboard-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }
    
    /* Card Header */
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #fff;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        padding: 1rem 1.25rem;
    }
    
    .card-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .btn-icon {
        color: #6c757d;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background-color: #f8f9fa;
        border: none;
        transition: all 0.2s;
    }
    
    .btn-icon:hover {
        background-color: #e9ecef;
        color: #495057;
    }
    
    /* KPI Cards Design */
    .border-accent-primary {
        border-top: 4px solid #4e73df;
    }
    
    .border-accent-success {
        border-top: 4px solid #1cc88a;
    }
    
    .border-accent-warning {
        border-top: 4px solid #f6c23e;
    }
    
    .border-accent-info {
        border-top: 4px solid #36b9cc;
    }
    
    .card-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    
    .card-info {
        flex-grow: 1;
    }
    
    .card-title {
        color: #5a5c69;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
        letter-spacing: 0.1em;
    }
    
    .card-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #5a5c69;
        position: relative;
    }
    
    .card-icon {
        margin-left: 0.75rem;
    }
    
    .icon-circle {
        height: 3rem;
        width: 3rem;
        border-radius: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .icon-circle i {
        font-size: 1.2rem;
    }
    
    .bg-primary-soft {
        background-color: rgba(78, 115, 223, 0.1);
    }
    
    .bg-success-soft {
        background-color: rgba(28, 200, 138, 0.1);
    }
    
    .bg-warning-soft {
        background-color: rgba(246, 194, 62, 0.1);
    }
    
    .bg-info-soft {
        background-color: rgba(54, 185, 204, 0.1);
    }
    
    .card-trend {
        font-size: 0.825rem;
        color: #858796;
    }
    
    /* Date Filter Container */
    .date-filter-container {
        background-color: white;
        padding: 14px 18px;
        border-radius: 12px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
        border: 1px solid #f0f0f0;
        transition: all 0.2s ease;
    }
    
    .date-filter-container:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    }
    
    .date-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #6c757d;
        margin-bottom: 0;
        letter-spacing: 0.5px;
        display: block;
    }
    
    .date-input {
        width: 170px;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        padding: 0.45rem 0.75rem;
        font-size: 0.85rem;
        transition: all 0.2s;
    }
    
    .date-input:focus {
        border-color: #4e73df;
        box-shadow: 0 0 0 0.2rem rgba(78, 115, 223, 0.25);
    }
    
    .refresh-btn {
        border-radius: 8px;
        padding: 0.45rem 0.85rem;
        transition: all 0.2s;
        font-weight: 500;
    }
    
    .date-icon {
        font-size: 1.2rem;
        color: #4e73df;
    }
    
    /* Charts */
    .chart-card .card-body {
        padding: 1rem;
    }
    
    .chart-area {
        height: 300px;
        position: relative;
        width: 100%;
    }
    
    /* Loading Spinners */
    .loading-spinner {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.7);
        z-index: 1;
    }
    
    /* Forcer le masquage des spinners quand ils ont display:none */
    .loading-spinner[style*="display: none"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
    }
    
    /* Feature List */
    .feature-list {
        list-style: none;
        padding-left: 0;
        margin-bottom: 0;
    }
    
    .feature-list li {
        margin-bottom: 0.75rem;
        padding-left: 1.25rem;
        position: relative;
    }
    
    .feature-list li i {
        position: absolute;
        left: 0;
        top: 0.25rem;
    }
    
    /* Tip Box */
    .tip-box {
        background-color: rgba(255, 243, 205, 0.3);
        border-left: 3px solid #ffc107;
        padding: 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
    }
    
    /* Responsive adjustments */
    @media (max-width: 767.98px) {
        .filter-section {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .dashboard-last-update {
            margin-left: 0;
            width: 100%;
        }
        
        .card-value {
            font-size: 1.5rem;
        }
        
        .icon-circle {
            height: 2.5rem;
            width: 2.5rem;
        }
    }
    
    /* Style des KPI cards spécifiquement pour qu'elles tiennent sur une ligne */
    .kpi-card .card-body {
        padding: 0.4rem 0.3rem;
    }
    
    .kpi-card .card-title {
        font-size: 0.55rem;
        margin-bottom: 0.1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 95%;
    }
    
    .kpi-card .card-value {
        font-size: 1.3rem;
    }
    
    .kpi-card .icon-circle {
        height: 2rem;
        width: 2rem;
        min-width: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .kpi-card .icon-circle i {
        font-size: 0.8rem;
    }
    
    .kpi-card .card-trend {
        margin-top: 0.2rem !important;
        font-size: 0.7rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .kpi-card .card-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.2rem;
    }
    
    .kpi-card .card-info {
        flex-grow: 1;
        min-width: 0;
    }
    
    /* Supprimer la marge gauche de l'icône pour un affichage plus compact */
    .kpi-card .card-icon {
        margin-left: 0;
    }
    
    /* Style des liens de détail dans les cartes KPI */
    .detail-link {
        font-size: 0.65rem;
        padding: 0;
        text-decoration: none;
        white-space: nowrap;
        transition: all 0.2s;
    }
    
    .detail-link:hover {
        transform: translateX(2px);
    }
    
    /* Ajustements spécifiques pour les écrans entre petits et moyens */
    @media (min-width: 768px) and (max-width: 1199.98px) {
        .kpi-card .card-title {
            font-size: 0.5rem;
            letter-spacing: 0;
        }
        
        .kpi-card .card-value {
            font-size: 1.1rem;
        }
        
        .kpi-card .icon-circle {
            height: 1.6rem;
            width: 1.6rem;
            min-width: 1.6rem;
        }
        
        .kpi-card .icon-circle i {
            font-size: 0.7rem;
        }
    }
    
    /* Gestion des écrans plus grands pour s'assurer que toutes les cartes sont affichées en ligne */
    @media (min-width: 1200px) {
        .kpi-section .col-xl-3 {
            padding-left: 0.2rem;
            padding-right: 0.2rem;
            width: 24.5%; /* Légèrement plus petit que 25% */
        }
    }
</style>

<script>
    // Activer les tooltips Bootstrap
    document.addEventListener('DOMContentLoaded', function() {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltips].map(tooltip => new bootstrap.Tooltip(tooltip));
        
        // Mettre à jour l'heure de dernière mise à jour
        document.getElementById('lastUpdateTime').textContent = new Date().toLocaleTimeString();
    });
</script>

<!-- Modal pour plus d'informations -->
<div class="modal fade" id="chartInfoModal" tabindex="-1" aria-labelledby="chartInfoModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="chartInfoModalLabel">Informations sur le graphique</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div class="modal-body">
                <div id="chart-info-content">
                    <!-- Le contenu sera chargé dynamiquement -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
        </div>
    </div>
</div>

<?php
// Fin du contenu de la page
$content = ob_get_clean();

// Inclure le layout
require_once __DIR__ . '/../layouts/app.php';
?> 