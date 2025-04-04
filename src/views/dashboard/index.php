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
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Début du contenu de la page
ob_start();
?>

<div class="container-fluid">
    <!-- Header avec sélecteur de date -->
    <div class="page-header mb-4">
        <div class="d-flex align-items-center flex-wrap">
            <div class="date-filter shadow-sm rounded ms-0 p-2 bg-white">
                <div class="input-group">
                    <input type="date" id="dateSelector" class="form-control form-control-sm border-0" value="<?php echo htmlspecialchars($selectedDate); ?>">
                    <button class="btn btn-sm btn-outline-primary" onclick="updateDashboard()">
                        <i class="fas fa-sync-alt"></i> Actualiser
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- KPIs d'assiduité -->
    <div class="row mb-4">
        <div class="col-md-4">
            <div class="card shadow-sm bg-primary text-white">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase mb-1 opacity-75">Taux de Présence</h6>
                            <h2 class="mb-0 fw-bold"><?php echo $attendanceStats['attendance_rate']; ?>%</h2>
                            <p class="mb-0 small"><?php echo $attendanceStats['present_employees']; ?> sur <?php echo $attendanceStats['total_expected']; ?> employés</p>
                        </div>
                        <div class="icon-circle bg-white bg-opacity-25 rounded-circle p-3">
                            <i class="fas fa-users fa-2x text-white"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card shadow-sm bg-success text-white">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase mb-1 opacity-75">Taux de Ponctualité</h6>
                            <h2 class="mb-0 fw-bold"><?php echo $workingHoursStats['punctuality_rate']; ?>%</h2>
                            <p class="mb-0 small">Arrivées avant 9h00</p>
                        </div>
                        <div class="icon-circle bg-white bg-opacity-25 rounded-circle p-3">
                            <i class="fas fa-clock fa-2x text-white"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card shadow-sm bg-info text-white">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase mb-1 opacity-75">Durée moyenne de présence</h6>
                            <h2 class="mb-0 fw-bold"><?php echo $workingHoursStats['avg_work_duration']; ?></h2>
                            <p class="mb-0 small">Heures de travail</p>
                        </div>
                        <div class="icon-circle bg-white bg-opacity-25 rounded-circle p-3">
                            <i class="fas fa-hourglass-half fa-2x text-white"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Statistiques horaires -->
    <div class="row mb-4">
        <div class="col-md-6">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 fw-bold">Horaires Moyens</h5>
                </div>
                <div class="card-body">
                    <div class="row text-center">
                        <div class="col-6">
                            <div class="p-3 rounded bg-light mb-2">
                                <h2 class="display-6 fw-bold text-primary"><?php echo $workingHoursStats['avg_arrival_time']; ?></h2>
                                <p class="mb-0">Heure moyenne d'arrivée</p>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="p-3 rounded bg-light mb-2">
                                <h2 class="display-6 fw-bold text-danger"><?php echo $workingHoursStats['avg_departure_time']; ?></h2>
                                <p class="mb-0">Heure moyenne de départ</p>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-6 text-center">
                            <div class="d-inline-flex align-items-center">
                                <div class="me-2 small text-muted">Taux de ponctualité</div>
                                <div class="progress flex-grow-1" style="height: 6px;">
                                    <div class="progress-bar bg-primary" role="progressbar" style="width: <?php echo $workingHoursStats['punctuality_rate']; ?>%" aria-valuenow="<?php echo $workingHoursStats['punctuality_rate']; ?>" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                                <div class="ms-2 small"><?php echo $workingHoursStats['punctuality_rate']; ?>%</div>
                            </div>
                        </div>
                        <div class="col-6 text-center">
                            <div class="d-inline-flex align-items-center">
                                <div class="me-2 small text-muted">Départs anticipés</div>
                                <div class="progress flex-grow-1" style="height: 6px;">
                                    <div class="progress-bar bg-danger" role="progressbar" style="width: <?php echo $workingHoursStats['early_departures_rate']; ?>%" aria-valuenow="<?php echo $workingHoursStats['early_departures_rate']; ?>" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                                <div class="ms-2 small"><?php echo $workingHoursStats['early_departures_rate']; ?>%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 fw-bold">Tendance de Présence Hebdomadaire</h5>
                </div>
                <div class="card-body">
                    <canvas id="weeklyTrendsChart" height="220"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- Distribution des horaires -->
    <div class="row mb-4">
        <div class="col-md-6">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3">
                    <h5 class="card-title mb-0 fw-bold">Distribution des Heures d'Arrivée</h5>
                </div>
                <div class="card-body">
                    <canvas id="arrivalDistributionChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3">
                    <h5 class="card-title mb-0 fw-bold">Distribution des Heures de Départ</h5>
                </div>
                <div class="card-body">
                    <canvas id="departureDistributionChart"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- Tableau des employés -->
    <div class="row">
        <div class="col-12">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 fw-bold">Données Individuelles de Présence</h5>
                    <div>
                        <input type="text" id="employeeSearch" class="form-control form-control-sm" placeholder="Rechercher un employé...">
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th>Badge</th>
                                    <th>Arrivée</th>
                                    <th>Départ</th>
                                    <th>Durée</th>
                                    <th>Entrées</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($employeeData)): ?>
                                <tr>
                                    <td colspan="6" class="text-center py-3">Aucune donnée disponible pour cette date</td>
                                </tr>
                                <?php else: ?>
                                <?php foreach ($employeeData as $employee): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($employee['badge_number']); ?></td>
                                    <td>
                                        <span class="d-flex align-items-center">
                                            <?php if ($employee['is_late']): ?>
                                            <span class="badge bg-danger rounded-circle me-1" style="width:8px;height:8px;" title="En retard"></span>
                                            <?php else: ?>
                                            <span class="badge bg-success rounded-circle me-1" style="width:8px;height:8px;" title="À l'heure"></span>
                                            <?php endif; ?>
                                            <?php echo htmlspecialchars($employee['arrival_time']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="d-flex align-items-center">
                                            <?php if ($employee['is_early_departure']): ?>
                                            <span class="badge bg-warning rounded-circle me-1" style="width:8px;height:8px;" title="Départ anticipé"></span>
                                            <?php else: ?>
                                            <span class="badge bg-success rounded-circle me-1" style="width:8px;height:8px;" title="Horaire complet"></span>
                                            <?php endif; ?>
                                            <?php echo htmlspecialchars($employee['departure_time']); ?>
                                        </span>
                                    </td>
                                    <td><?php echo htmlspecialchars($employee['duration']); ?></td>
                                    <td><?php echo htmlspecialchars($employee['entry_count']); ?></td>
                                    <td>
                                        <?php if ($employee['is_late'] && $employee['is_early_departure']): ?>
                                        <span class="badge bg-danger">Irrégulier</span>
                                        <?php elseif ($employee['is_late']): ?>
                                        <span class="badge bg-warning">En retard</span>
                                        <?php elseif ($employee['is_early_departure']): ?>
                                        <span class="badge bg-warning">Départ anticipé</span>
                                        <?php else: ?>
                                        <span class="badge bg-success">Régulier</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.date-filter {
    transition: all 0.3s ease;
}
.date-filter:hover {
    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
}
.icon-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
}
.card {
    border: none;
    border-radius: 0.5rem;
    overflow: hidden;
    transition: transform 0.2s;
}
.card:hover {
    transform: translateY(-5px);
}
.text-uppercase {
    letter-spacing: 0.05em;
}
.table th {
    font-weight: 600;
    font-size: 0.825rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}
</style>

<script>
    // Configuration des graphiques
    document.addEventListener('DOMContentLoaded', function() {
        // Graphique des tendances hebdomadaires
        const weeklyTrends = document.getElementById('weeklyTrendsChart');
        if (weeklyTrends) {
            new Chart(weeklyTrends, {
                type: 'line',
                data: {
                    labels: <?php echo json_encode($chartData['weekly']['labels'] ?? []); ?>,
                    datasets: [{
                        label: 'Employés présents',
                        data: <?php echo json_encode($chartData['weekly']['people'] ?? []); ?>,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    }
                }
            });
        }

        // Graphique de distribution des arrivées
        const arrivalDistribution = document.getElementById('arrivalDistributionChart');
        if (arrivalDistribution) {
            new Chart(arrivalDistribution, {
                type: 'bar',
                data: {
                    labels: <?php echo json_encode($chartData['arrivalDistribution']['labels'] ?? []); ?>,
                    datasets: [{
                        label: 'Nombre d\'arrivées',
                        data: <?php echo json_encode($chartData['arrivalDistribution']['data'] ?? []); ?>,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Graphique de distribution des départs
        const departureDistribution = document.getElementById('departureDistributionChart');
        if (departureDistribution) {
            new Chart(departureDistribution, {
                type: 'bar',
                data: {
                    labels: <?php echo json_encode($chartData['departureDistribution']['labels'] ?? []); ?>,
                    datasets: [{
                        label: 'Nombre de départs',
                        data: <?php echo json_encode($chartData['departureDistribution']['data'] ?? []); ?>,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Fonction de recherche pour le tableau des employés
        const employeeSearch = document.getElementById('employeeSearch');
        if (employeeSearch) {
            employeeSearch.addEventListener('keyup', function() {
                const searchValue = this.value.toLowerCase();
                const rows = document.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchValue) ? '' : 'none';
                });
            });
        }
    });

    // Fonction pour mettre à jour le tableau de bord
    function updateDashboard() {
        const dateSelector = document.getElementById('dateSelector');
        if (dateSelector && dateSelector.value) {
            window.location.href = '/dashboard?date=' + dateSelector.value;
        }
    }
</script>

<?php
// Fin du contenu de la page
$content = ob_get_clean();

// Inclure le layout
require_once __DIR__ . '/../layouts/app.php';
?> 
?> 