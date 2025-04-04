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
    
    // Initialisation des boutons de téléchargement
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartId = this.getAttribute('data-chart-id');
            const date = document.getElementById('dashboardDate').value;
            downloadChartData(chartId, date);
        });
    });
    
    // Initialisation des boutons d'information
    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartId = this.getAttribute('data-chart-id');
            showChartInfo(chartId);
        });
    });
    
    // Initialiser le modal Bootstrap
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        window.chartInfoModal = new bootstrap.Modal(document.getElementById('chartInfoModal'));
    } else {
        console.warn('Bootstrap Modal n\'est pas disponible, certaines fonctionnalités seront limitées.');
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
                // Vérifier le format des données (compatibilité avec l'ancien et le nouveau format)
                let chartData;
                if (data.datasets) {
                    // Nouveau format
                    chartData = {
                        labels: data.labels,
                        datasets: [{
                            data: data.datasets[0].data,
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
                    };
                } else {
                    // Ancien format
                    chartData = {
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
                    };
                }
                
                // Afficher les informations sur les heures de travail si disponibles
                if (data.meta && data.meta.workDayStart && data.meta.workDayEnd) {
                    const workTimeInfo = document.querySelector('#workingHoursChartCard .card-footer');
                    if (workTimeInfo) {
                        // Formater les heures pour l'affichage (supprimer les secondes)
                        const startTime = data.meta.workDayStart.substr(0, 5);
                        const endTime = data.meta.workDayEnd.substr(0, 5);
                        workTimeInfo.innerHTML = `<small class="text-muted">Heures de travail configurées: ${startTime} - ${endTime}</small>`;
                        workTimeInfo.style.display = 'block';
                    }
                }
                
                // Créer le nouveau graphique
                window.workingHoursChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: chartData,
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

/**
 * Télécharge les données d'un graphique au format CSV
 * @param {string} chartId - Identifiant du graphique
 * @param {string} date - Date au format YYYY-MM-DD
 */
function downloadChartData(chartId, date) {
    console.log(`Téléchargement des données pour le graphique ${chartId} à la date ${date}`);
    
    // Mapper l'ID du graphique au type de données
    const dataTypeMap = {
        'arrival': 'arrivalDistribution',
        'departure': 'departureDistribution',
        'workingHours': 'workingHours'
    };
    
    const dataType = dataTypeMap[chartId];
    if (!dataType) {
        console.error(`Type de données non reconnu pour le graphique ${chartId}`);
        return;
    }
    
    // Récupérer les données
    fetch(`/dashboard/data?type=${dataType}&date=${date}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Erreur:', data.error);
                return;
            }
            
            // Convertir les données en CSV
            let csvContent = 'data:text/csv;charset=utf-8,';
            
            // Ajouter l'en-tête
            switch (chartId) {
                case 'arrival':
                    csvContent += 'Heures d\'arrivée,Nombre d\'employés\n';
                    break;
                case 'departure':
                    csvContent += 'Heures de départ,Nombre d\'employés\n';
                    break;
                case 'workingHours':
                    csvContent += 'Catégorie d\'heures de travail,Nombre d\'employés\n';
                    break;
            }
            
            // Ajouter les données en fonction du format
            const labels = data.labels;
            let values;
            
            if (chartId === 'workingHours' && data.datasets) {
                // Nouveau format pour les heures de travail
                values = data.datasets[0].data;
                
                // Ajouter les informations sur les heures de travail configurées si disponibles
                if (data.meta && data.meta.workDayStart && data.meta.workDayEnd) {
                    csvContent = 'data:text/csv;charset=utf-8,';
                    csvContent += `Heures de travail configurées,${data.meta.workDayStart} - ${data.meta.workDayEnd}\n\n`;
                    csvContent += 'Catégorie d\'heures de travail,Nombre d\'employés\n';
                }
            } else if (data.data) {
                // Ancien format
                values = data.data;
            } else {
                console.error('Format de données non reconnu:', data);
                return;
            }
            
            // Ajouter les données
            for (let i = 0; i < labels.length; i++) {
                csvContent += `"${labels[i]}",${values[i]}\n`;
            }
            
            // Créer le lien de téléchargement
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `${chartId}_data_${date}.csv`);
            document.body.appendChild(link);
            
            // Déclencher le téléchargement
            link.click();
            
            // Nettoyer
            document.body.removeChild(link);
        })
        .catch(error => {
            console.error(`Erreur lors du téléchargement des données pour ${chartId}:`, error);
            alert('Erreur lors du téléchargement des données. Veuillez réessayer.');
        });
}

/**
 * Affiche des informations détaillées sur un graphique
 * @param {string} chartId - Identifiant du graphique
 */
function showChartInfo(chartId) {
    console.log(`Affichage des informations pour le graphique ${chartId}`);
    
    // Configurer le contenu du modal en fonction du type de graphique
    const modalTitle = document.getElementById('chartInfoModalLabel');
    const modalContent = document.getElementById('chart-info-content');
    
    let title = '';
    let content = '';
    
    switch (chartId) {
        case 'arrival':
            title = 'Distribution des heures d\'arrivée';
            content = `
                <h6 class="mb-3">À propos de ce graphique</h6>
                <p>Ce graphique montre la répartition des employés selon leur heure d'arrivée au travail, regroupée par tranches horaires.</p>
                
                <h6 class="mt-4 mb-2">Source des données</h6>
                <p>Les données sont issues des enregistrements des badges d'accès des employés, regroupées par tranches d'une heure.</p>
                
                <h6 class="mt-4 mb-2">Interprétation</h6>
                <ul>
                    <li>Un pic avant 9h00 indique un bon respect des horaires de travail</li>
                    <li>Des arrivées plus étalées peuvent suggérer des horaires flexibles</li>
                    <li>Des arrivées tardives répétées peuvent nécessiter une attention particulière</li>
                </ul>
                
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    <span>La politique d'entreprise considère comme "à l'heure" les arrivées avant 9h00.</span>
                </div>
            `;
            break;
            
        case 'departure':
            title = 'Distribution des heures de départ';
            content = `
                <h6 class="mb-3">À propos de ce graphique</h6>
                <p>Ce graphique présente la distribution des heures de départ des employés, regroupée par tranches horaires.</p>
                
                <h6 class="mt-4 mb-2">Source des données</h6>
                <p>Les données proviennent des derniers badgeages journaliers de chaque employé, regroupés par tranches d'une heure.</p>
                
                <h6 class="mt-4 mb-2">Interprétation</h6>
                <ul>
                    <li>Les départs concentrés après 17h-18h indiquent une journée de travail standard</li>
                    <li>Des départs plus tôt peuvent indiquer des horaires flexibles ou du temps partiel</li>
                    <li>Des départs très tardifs peuvent suggérer des heures supplémentaires ou des contraintes spécifiques</li>
                </ul>
                
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    <span>L'horaire officiel de fin de journée est 18h00, mais peut varier selon les départements.</span>
                </div>
            `;
            break;
            
        case 'workingHours':
            title = 'Répartition des heures de travail';
            content = `
                <h6 class="mb-3">À propos de ce graphique</h6>
                <p>Ce graphique en anneau montre la distribution des employés selon la durée totale de leur présence quotidienne.</p>
                
                <h6 class="mt-4 mb-2">Source des données</h6>
                <p>Les données sont calculées comme la différence entre le premier et le dernier badgeage de la journée pour chaque employé.</p>
                
                <h6 class="mt-4 mb-2">Catégories de durée</h6>
                <ul>
                    <li><strong>< 4h</strong> : Présence de moins de 4 heures (mi-temps, formations courtes)</li>
                    <li><strong>4-6h</strong> : Présence entre 4 et 6 heures (temps partiel)</li>
                    <li><strong>6-8h</strong> : Présence entre 6 et 8 heures (journée standard courte)</li>
                    <li><strong>8-9h</strong> : Présence entre 8 et 9 heures (journée standard complète)</li>
                    <li><strong>> 9h</strong> : Présence supérieure à 9 heures (heures supplémentaires)</li>
                </ul>
                
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <span>Note: Ces durées peuvent inclure les pauses déjeuner et ne représentent pas nécessairement le temps de travail effectif.</span>
                </div>
            `;
            break;
            
        default:
            title = 'Informations sur le graphique';
            content = '<p>Informations non disponibles pour ce graphique.</p>';
    }
    
    // Mettre à jour le contenu du modal
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    
    // Afficher le modal
    if (window.chartInfoModal) {
        window.chartInfoModal.show();
    } else {
        alert('Le système de modal n\'est pas disponible. ' + title + ': ' + content.replace(/<[^>]*>/g, ''));
    }
} 