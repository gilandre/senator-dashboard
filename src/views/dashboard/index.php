<?php
$pageTitle = 'Tableau de bord';
$currentPage = 'dashboard';
$hideGlobalTopbar = false; // Activer la topbar globale standard

// Vérification des données pour éviter les erreurs
$dailyStats = $dailyStats ?? [];
$dailyStats['total_people'] = $dailyStats['total_people'] ?? 0;
$dailyStats['total_entries'] = $dailyStats['total_entries'] ?? 0;
$dailyStats['validated_entries'] = $dailyStats['validated_entries'] ?? 0;
$dailyStats['unique_entries'] = $dailyStats['unique_entries'] ?? 0;
$dailyStats['failed_entries'] = $dailyStats['failed_entries'] ?? 0;
$dailyStats['failed_attempts'] = $dailyStats['failed_attempts'] ?? 0;

$chartData = $chartData ?? [
    'weekly' => ['labels' => [], 'people' => [], 'entries' => []],
    'peakHours' => ['labels' => [], 'entries' => []],
    'locations' => ['labels' => [], 'entries' => []],
    'groups' => ['labels' => [], 'users' => [], 'actions' => []]
];

// Scripts pour la page
$pageFooterScripts = [
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Début du contenu de la page
ob_start();
?>

<div class="container-fluid">
    <!-- Header avec sélecteur de date uniquement -->
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

    <!-- KPIs -->
    <div class="row mb-4">
        <div class="col-md-3">
            <div class="card shadow-sm bg-primary text-white">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase mb-1 opacity-75">Total Personnes</h6>
                            <h2 class="mb-0 fw-bold"><?php echo isset($dailyStats['total_people']) ? number_format($dailyStats['total_people']) : '0'; ?></h2>
                        </div>
                        <div class="icon-circle bg-white bg-opacity-25 rounded-circle p-3">
                            <i class="fas fa-users fa-2x text-white"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm bg-success text-white">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase mb-1 opacity-75">Entrées Validées</h6>
                            <h2 class="mb-0 fw-bold"><?php echo isset($dailyStats['validated_entries']) ? number_format($dailyStats['validated_entries']) : '0'; ?></h2>
                        </div>
                        <div class="icon-circle bg-white bg-opacity-25 rounded-circle p-3">
                            <i class="fas fa-check-circle fa-2x text-white"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm bg-info text-white">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase mb-1 opacity-75">Entrées Uniques</h6>
                            <h2 class="mb-0 fw-bold"><?php echo isset($dailyStats['unique_entries']) ? number_format($dailyStats['unique_entries']) : '0'; ?></h2>
                        </div>
                        <div class="icon-circle bg-white bg-opacity-25 rounded-circle p-3">
                            <i class="fas fa-fingerprint fa-2x text-white"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm bg-warning text-white">
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase mb-1 opacity-75">Tentatives Échouées</h6>
                            <h2 class="mb-0 fw-bold"><?php echo isset($dailyStats['failed_attempts']) ? number_format($dailyStats['failed_attempts']) : '0'; ?></h2>
                        </div>
                        <div class="icon-circle bg-white bg-opacity-25 rounded-circle p-3">
                            <i class="fas fa-exclamation-triangle fa-2x text-white"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts -->
    <div class="row">
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3">
                    <h5 class="card-title mb-0 fw-bold">Tendances Hebdomadaires</h5>
                </div>
                <div class="card-body">
                    <canvas id="weeklyTrendsChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3">
                    <h5 class="card-title mb-0 fw-bold">Heures de Pointe</h5>
                </div>
                <div class="card-body">
                    <canvas id="peakHoursChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3">
                    <h5 class="card-title mb-0 fw-bold">Top Localisations</h5>
                </div>
                <div class="card-body">
                    <canvas id="topLocationsChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-header bg-white py-3">
                    <h5 class="card-title mb-0 fw-bold">Statistiques par Action</h5>
                </div>
                <div class="card-body">
                    <canvas id="actionStatsChart"></canvas>
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
</style>

<script>
    // Configuration des graphiques
    document.addEventListener('DOMContentLoaded', function() {
        const weeklyTrends = document.getElementById('weeklyTrendsChart');
        if (weeklyTrends) {
            new Chart(weeklyTrends, {
                type: 'line',
                data: {
                    labels: <?php echo json_encode($chartData['weekly']['labels'] ?? []); ?>,
                    datasets: [{
                        label: 'Personnes',
                        data: <?php echo json_encode($chartData['weekly']['people'] ?? []); ?>,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2
                    }, {
                        label: 'Entrées',
                        data: <?php echo json_encode($chartData['weekly']['entries'] ?? []); ?>,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
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

        const peakHours = document.getElementById('peakHoursChart');
        if (peakHours) {
            new Chart(peakHours, {
                type: 'bar',
                data: {
                    labels: <?php echo json_encode($chartData['peakHours']['labels'] ?? []); ?>,
                    datasets: [{
                        label: 'Nombre d\'entrées',
                        data: <?php echo json_encode($chartData['peakHours']['entries'] ?? []); ?>,
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

        const topLocations = document.getElementById('topLocationsChart');
        if (topLocations) {
            new Chart(topLocations, {
                type: 'bar',
                data: {
                    labels: <?php echo json_encode($chartData['locations']['labels'] ?? []); ?>,
                    datasets: [{
                        label: 'Nombre d\'entrées',
                        data: <?php echo json_encode($chartData['locations']['entries'] ?? []); ?>,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    indexAxis: 'y',
                    scales: {
                        y: {
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        }
                    }
                }
            });
        }

        const actionStats = document.getElementById('actionStatsChart');
        if (actionStats) {
            new Chart(actionStats, {
                type: 'bar',
                data: {
                    labels: <?php echo json_encode($chartData['groups']['labels'] ?? []); ?>,
                    datasets: [{
                        label: 'Utilisateurs',
                        data: <?php echo json_encode($chartData['groups']['users'] ?? []); ?>,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }, {
                        label: 'Actions',
                        data: <?php echo json_encode($chartData['groups']['actions'] ?? []); ?>,
                        backgroundColor: 'rgba(255, 159, 64, 0.7)',
                        borderColor: 'rgba(255, 159, 64, 1)',
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
    });

    // Fonction de mise à jour du tableau de bord
    function updateDashboard() {
        const date = document.getElementById('dateSelector').value;
        window.location.href = `/dashboard?date=${date}`;
    }

    // Utiliser la dernière date disponible par défaut
    window.addEventListener('load', function() {
        // Si l'URL n'a pas déjà un paramètre de date, on utilise la dernière date disponible
        if (!window.location.search.includes('date=')) {
            // La date la plus récente est déjà définie dans le contrôleur
            // et passée à la vue comme valeur par défaut du sélecteur
        }
    });
</script>

<?php
$content = ob_get_clean();
require_once __DIR__ . '/../layouts/app.php';
?> 