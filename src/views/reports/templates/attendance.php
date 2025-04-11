<?php
// Template pour le rapport de type "attendance" (présence et accès)
?>

<nav aria-label="breadcrumb" class="mb-4">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="/reports">Catalogue de rapports</a></li>
        <li class="breadcrumb-item active">Présence et accès</li>
    </ol>
</nav>

<div class="row mb-4">
    <div class="col">
        <h2 class="h3">Rapport de présence et accès</h2>
        <p class="text-muted">
            Période du <?php echo date('d/m/Y', strtotime($startDate)); ?> au <?php echo date('d/m/Y', strtotime($endDate)); ?>
            <?php if($group): ?> | Groupe: <?php echo htmlspecialchars($group); ?><?php endif; ?>
            <?php if($status): ?> | Statut: <?php echo htmlspecialchars($status); ?><?php endif; ?>
        </p>
    </div>
    <div class="col-auto">
        <div class="btn-group">
            <a href="/reports?type=attendance&start_date=<?php echo urlencode($startDate); ?>&end_date=<?php echo urlencode($endDate); ?>&export=excel" class="btn btn-success">
                <i class="fas fa-file-excel"></i> Exporter (Excel)
            </a>
            <a href="/reports?type=attendance&start_date=<?php echo urlencode($startDate); ?>&end_date=<?php echo urlencode($endDate); ?>&export=pdf" class="btn btn-danger">
                <i class="fas fa-file-pdf"></i> Exporter (PDF)
            </a>
        </div>
    </div>
</div>

<?php if(empty($data)): ?>
    <div class="alert alert-info">
        <i class="fas fa-info-circle"></i> Aucune donnée disponible pour ce rapport avec les filtres sélectionnés.
    </div>
<?php else: ?>
    <!-- Graphiques et statistiques -->
    <div class="row mb-4">
        <div class="col-md-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title mb-0">Présence par statut</h5>
                </div>
                <div class="card-body">
                    <canvas id="statusStatsChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title mb-0">Présence par jour</h5>
                </div>
                <div class="card-body">
                    <canvas id="attendanceByDayChart"></canvas>
                </div>
            </div>
        </div>
    </div>

    <div class="row mb-4">
        <div class="col-md-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title mb-0">Répartition horaire</h5>
                </div>
                <div class="card-body">
                    <canvas id="peakHoursChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title mb-0">Statistiques globales</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-6 mb-3">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="bg-light-primary rounded-circle p-3">
                                        <i class="fas fa-users text-primary"></i>
                                    </div>
                                </div>
                                <div class="ms-3">
                                    <h6 class="mb-0">Total personnes</h6>
                                    <h4 class="mb-0"><?php echo count($data); ?></h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="bg-light-success rounded-circle p-3">
                                        <i class="fas fa-door-open text-success"></i>
                                    </div>
                                </div>
                                <div class="ms-3">
                                    <h6 class="mb-0">Total entrées</h6>
                                    <h4 class="mb-0"><?php echo array_sum(array_column($data, 'total_entries')); ?></h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="bg-light-danger rounded-circle p-3">
                                        <i class="fas fa-ban text-danger"></i>
                                    </div>
                                </div>
                                <div class="ms-3">
                                    <h6 class="mb-0">Tentatives échouées</h6>
                                    <h4 class="mb-0"><?php echo array_sum(array_column($data, 'failed_attempts')); ?></h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="bg-light-warning rounded-circle p-3">
                                        <i class="fas fa-percentage text-warning"></i>
                                    </div>
                                </div>
                                <div class="ms-3">
                                    <h6 class="mb-0">Taux d'accès</h6>
                                    <?php 
                                    $totalAttempts = array_sum(array_column($data, 'total_entries')) + array_sum(array_column($data, 'failed_attempts'));
                                    $successRate = $totalAttempts > 0 ? round((array_sum(array_column($data, 'total_entries')) / $totalAttempts) * 100) : 0;
                                    ?>
                                    <h4 class="mb-0"><?php echo $successRate; ?>%</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Tableau détaillé -->
    <div class="card">
        <div class="card-header">
            <h5 class="card-title mb-0">Liste détaillée des présences</h5>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-striped table-hover datatable">
                    <thead>
                        <tr>
                            <th>Badge</th>
                            <th>Nom</th>
                            <th>Groupe</th>
                            <th>Statut</th>
                            <th>Entrées</th>
                            <th>Échecs</th>
                            <th>Première entrée</th>
                            <th>Dernière sortie</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($data as $entry): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($entry['badge_number']); ?></td>
                            <td><?php echo htmlspecialchars($entry['first_name'] . ' ' . $entry['last_name']); ?></td>
                            <td><?php echo htmlspecialchars($entry['group_name']); ?></td>
                            <td>
                                <span class="badge bg-<?php echo $entry['status'] === 'Actif' ? 'success' : 'secondary'; ?>">
                                    <?php echo htmlspecialchars($entry['status']); ?>
                                </span>
                            </td>
                            <td><?php echo (int)$entry['total_entries']; ?></td>
                            <td><?php echo (int)$entry['failed_attempts']; ?></td>
                            <td><?php echo $entry['first_entry'] ? $entry['first_entry'] : '-'; ?></td>
                            <td><?php echo $entry['last_exit'] ? $entry['last_exit'] : '-'; ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Vérifier si Chart.js est chargé
        if (typeof Chart === 'undefined') {
            console.error('Chart.js n\'est pas chargé');
            return;
        }

        // Graphique des statistiques par statut
        var statusStatsCtx = document.getElementById('statusStatsChart').getContext('2d');
        var statusStats = <?php echo json_encode($chartData['statusStats'] ?? []); ?>;
        
        if (statusStats.length > 0) {
            var statusLabels = statusStats.map(item => item.status);
            var statusPeopleData = statusStats.map(item => item.total_people);
            var statusEntriesData = statusStats.map(item => item.total_entries);
            
            new Chart(statusStatsCtx, {
                type: 'bar',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        label: 'Personnes uniques',
                        data: statusPeopleData,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }, {
                        label: 'Entrées totales',
                        data: statusEntriesData,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            document.getElementById('statusStatsChart').parentNode.innerHTML = '<div class="text-center text-muted my-5">Aucune donnée disponible</div>';
        }

        // Graphique de présence par jour
        var attendanceByDayCtx = document.getElementById('attendanceByDayChart').getContext('2d');
        var attendanceData = <?php echo json_encode($chartData['statusAttendance'] ?? []); ?>;
        
        if (attendanceData.dates && attendanceData.dates.length > 0) {
            var datasets = [];
            var colors = ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)'];
            
            attendanceData.statuses.forEach(function(status, index) {
                var color = colors[index % colors.length];
                datasets.push({
                    label: status,
                    data: Object.values(attendanceData.data[status]),
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.2)'),
                    borderWidth: 2,
                    tension: 0.1
                });
            });
            
            new Chart(attendanceByDayCtx, {
                type: 'line',
                data: {
                    labels: attendanceData.dates,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre de personnes'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });
        } else {
            document.getElementById('attendanceByDayChart').parentNode.innerHTML = '<div class="text-center text-muted my-5">Aucune donnée disponible</div>';
        }

        // Graphique des heures de pointe
        var peakHoursCtx = document.getElementById('peakHoursChart').getContext('2d');
        var peakHoursData = <?php echo json_encode($chartData['statusPeakHours'] ?? []); ?>;
        
        if (peakHoursData.hours && peakHoursData.hours.length > 0) {
            var datasets = [];
            var colors = ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)'];
            
            peakHoursData.statuses.forEach(function(status, index) {
                var color = colors[index % colors.length];
                datasets.push({
                    label: status,
                    data: peakHoursData.hours.map(function(hour) {
                        return peakHoursData.data[status][hour] || 0;
                    }),
                    backgroundColor: color.replace('1)', '0.2)'),
                    borderColor: color,
                    borderWidth: 1
                });
            });
            
            new Chart(peakHoursCtx, {
                type: 'bar',
                data: {
                    labels: peakHoursData.hours.map(function(hour) {
                        return hour + 'h';
                    }),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre d\'entrées'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Heure'
                            }
                        }
                    }
                }
            });
        } else {
            document.getElementById('peakHoursChart').parentNode.innerHTML = '<div class="text-center text-muted my-5">Aucune donnée disponible</div>';
        }
    });
    </script>
<?php endif; ?> 