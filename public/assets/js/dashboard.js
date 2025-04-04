/**
 * Module JavaScript pour le tableau de bord d'assiduité
 */

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si Chart.js est chargé
    if (typeof Chart === 'undefined') {
        console.error('Chart.js n\'est pas chargé!');
        // Afficher un message d'erreur visible
        document.querySelectorAll('.chart-area').forEach(area => {
            area.innerHTML = '<div class="alert alert-danger">Erreur: Bibliothèque Chart.js non disponible</div>';
        });
        return;
    }
    
    console.log('Dashboard.js chargé, Chart.js disponible:', typeof Chart);
    
    const dateInput = document.getElementById('dashboardDate');
    if (dateInput) {
        // Récupération de la date la plus récente disponible dans la base de données
        fetchLatestAvailableDate().then(latestDate => {
            // Initialiser le datepicker avec la date la plus récente
            dateInput.value = latestDate;
            
            // Chargement initial des données
            loadDashboardData(latestDate);
            
            // Mettre à jour les liens de détail avec la date actuelle
            updateDetailLinks(latestDate);
        });
        
        // Gestion du changement de date
        dateInput.addEventListener('change', function() {
            loadDashboardData(this.value);
            updateDetailLinks(this.value);
        });
    }
    
    // Gestion du bouton de rafraîchissement
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const date = document.getElementById('dashboardDate').value;
            loadDashboardData(date);
            updateDetailLinks(date);
        });
    }
});

/**
 * Met à jour les liens de détail avec la date courante
 * @param {string} date - Date au format YYYY-MM-DD
 */
function updateDetailLinks(date) {
    // Mise à jour des liens vers les rapports détaillés
    document.getElementById('totalDetailLink').href = `/reports?type=attendance&metric=total&date=${date}`;
    document.getElementById('onTimeDetailLink').href = `/reports?type=attendance&metric=ontime&date=${date}`;
    document.getElementById('lateDetailLink').href = `/reports?type=attendance&metric=late&date=${date}`;
    document.getElementById('hoursDetailLink').href = `/reports?type=attendance&metric=hours&date=${date}`;
    
    console.log('Liens de détail mis à jour pour la date:', date);
}

/**
 * Récupère la date la plus récente disponible dans les données
 * @returns {Promise<string>} Date au format YYYY-MM-DD
 */
function fetchLatestAvailableDate() {
    return fetch('/dashboard/data?type=daily')
        .then(response => response.json())
        .then(data => {
            if (data && data.date) {
                return data.date;
            }
            // Fallback à la date du jour si aucune date n'est trouvée
            return formatDate(new Date());
        })
        .catch(error => {
            console.error('Erreur lors de la récupération de la date:', error);
            // Fallback à la date du jour en cas d'erreur
            return formatDate(new Date());
        });
}

/**
 * Charge toutes les données du tableau de bord
 * @param {string} date - Date au format YYYY-MM-DD
 */
function loadDashboardData(date) {
    console.log('Chargement des données pour la date:', date);
    
    // Afficher les indicateurs de chargement
    document.querySelectorAll('.loading-spinner').forEach(spinner => {
        spinner.style.display = 'block';
        console.log('Spinner affiché:', spinner.parentNode.parentNode.id);
    });
    
    // Chargement des KPIs
    loadAttendanceStats(date);
    
    // Chargement des graphiques
    loadArrivalDistribution(date);
    loadDepartureDistribution(date);
    loadWorkingHoursData(date);
}

/**
 * Charge les statistiques d'assiduité
 * @param {string} date - Date au format YYYY-MM-DD
 */
function loadAttendanceStats(date) {
    fetch(`/dashboard/data?type=attendance&date=${date}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Erreur:', data.error);
                // S'assurer que le spinner est masqué même en cas d'erreur
                document.querySelectorAll('.dashboard-card.kpi-card .loading-spinner').forEach(spinner => {
                    spinner.style.display = 'none';
                    console.log('KPI spinner masqué en cas d\'erreur');
                });
                return;
            }
            
            // Mise à jour des compteurs
            document.getElementById('totalCount').textContent = data.total;
            document.getElementById('onTimeCount').textContent = data.onTime;
            document.getElementById('lateCount').textContent = data.late;
            document.getElementById('avgHoursValue').textContent = data.avgWorkingHours;
            
            // Masquer les indicateurs de chargement des KPI cards
            document.querySelectorAll('.dashboard-card.kpi-card .loading-spinner').forEach(spinner => {
                spinner.style.display = 'none';
                console.log('KPI spinner masqué après chargement des données');
            });
        })
        .catch(error => {
            console.error('Erreur lors du chargement des statistiques:', error);
            document.querySelectorAll('.dashboard-card.kpi-card .loading-spinner').forEach(spinner => {
                spinner.style.display = 'none';
                console.log('KPI spinner masqué après erreur');
            });
        });
}

/**
 * Charge et affiche la distribution des heures d'arrivée
 * @param {string} date - Date au format YYYY-MM-DD
 */
function loadArrivalDistribution(date) {
    fetch(`/dashboard/data?type=arrivalDistribution&date=${date}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Erreur:', data.error);
                // S'assurer que le spinner est masqué même en cas d'erreur
                document.querySelector('#arrivalChartCard .chart-spinner').style.display = 'none';
                console.log('Spinner du graphique arrivées masqué après erreur');
                return;
            }
            
            const ctx = document.getElementById('arrivalChart').getContext('2d');
            
            // Détruire le graphique existant s'il y en a un
            if (window.arrivalChart instanceof Chart) {
                window.arrivalChart.destroy();
            }
            
            // Créer le nouveau graphique
            window.arrivalChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Nombre d\'arrivées',
                        data: data.data,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribution des heures d\'arrivée'
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
            
            // Masquer l'indicateur de chargement
            document.querySelector('#arrivalChartCard .chart-spinner').style.display = 'none';
            console.log('Spinner du graphique arrivées masqué après chargement');
        })
        .catch(error => {
            console.error('Erreur lors du chargement des heures d\'arrivée:', error);
            // S'assurer que le spinner est masqué même en cas d'erreur
            document.querySelector('#arrivalChartCard .chart-spinner').style.display = 'none';
            console.log('Spinner du graphique arrivées masqué après exception');
        });
}

/**
 * Charge et affiche la distribution des heures de départ
 * @param {string} date - Date au format YYYY-MM-DD
 */
function loadDepartureDistribution(date) {
    fetch(`/dashboard/data?type=departureDistribution&date=${date}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Erreur:', data.error);
                // S'assurer que le spinner est masqué même en cas d'erreur
                document.querySelector('#departureChartCard .chart-spinner').style.display = 'none';
                console.log('Spinner du graphique départs masqué après erreur');
                return;
            }
            
            const ctx = document.getElementById('departureChart').getContext('2d');
            
            // Détruire le graphique existant s'il y en a un
            if (window.departureChart instanceof Chart) {
                window.departureChart.destroy();
            }
            
            // Créer le nouveau graphique
            window.departureChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Nombre de départs',
                        data: data.data,
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribution des heures de départ'
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
            
            // Masquer l'indicateur de chargement
            document.querySelector('#departureChartCard .chart-spinner').style.display = 'none';
            console.log('Spinner du graphique départs masqué après chargement');
        })
        .catch(error => {
            console.error('Erreur lors du chargement des heures de départ:', error);
            // S'assurer que le spinner est masqué même en cas d'erreur
            document.querySelector('#departureChartCard .chart-spinner').style.display = 'none';
            console.log('Spinner du graphique départs masqué après exception');
        });
}

/**
 * Charge et affiche la répartition des heures de travail
 * @param {string} date - Date au format YYYY-MM-DD
 */
function loadWorkingHoursData(date) {
    fetch(`/dashboard/data?type=workingHours&date=${date}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Erreur:', data.error);
                // S'assurer que le spinner est masqué même en cas d'erreur
                document.querySelector('#workingHoursChartCard .chart-spinner').style.display = 'none';
                console.log('Spinner du graphique heures de travail masqué après erreur');
                return;
            }
            
            const ctx = document.getElementById('workingHoursChart').getContext('2d');
            
            // Détruire le graphique existant s'il y en a un
            if (window.workingHoursChart instanceof Chart) {
                window.workingHoursChart.destroy();
            }
            
            try {
                // Créer le nouveau graphique
                window.workingHoursChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            data: data.data,
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.7)',
                                'rgba(255, 159, 64, 0.7)',
                                'rgba(255, 205, 86, 0.7)',
                                'rgba(75, 192, 192, 0.7)',
                                'rgba(54, 162, 235, 0.7)'
                            ],
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(255, 159, 64, 1)',
                                'rgba(255, 205, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(54, 162, 235, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Répartition des heures de travail'
                            }
                        }
                    }
                });
                
                // Masquer l'indicateur de chargement
                document.querySelector('#workingHoursChartCard .chart-spinner').style.display = 'none';
                console.log('Spinner du graphique heures de travail masqué après chargement');
            } catch (e) {
                console.error('Erreur lors de la création du graphique:', e);
                // S'assurer que le spinner est masqué même en cas d'erreur
                document.querySelector('#workingHoursChartCard .chart-spinner').style.display = 'none';
                console.log('Spinner du graphique heures de travail masqué après exception dans la création');
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des heures de travail:', error);
            // S'assurer que le spinner est masqué même en cas d'erreur
            document.querySelector('#workingHoursChartCard .chart-spinner').style.display = 'none';
            console.log('Spinner du graphique heures de travail masqué après exception dans le fetch');
        });
}

/**
 * Formate une date en YYYY-MM-DD
 * @param {Date} date - Objet Date à formater
 * @returns {string} Date formatée
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
} 