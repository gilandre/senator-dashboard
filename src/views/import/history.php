<?php
// Définir les variables de page
$pageTitle = 'Historique des importations';
$currentPage = 'import/history';
$hideGlobalTopbar = false; // Activer la topbar globale standard

// Commencer la capture du contenu
ob_start();
?>

<div class="container-fluid">
    <div id="alertsContainer"></div>
    <div class="row mb-4">
        <div class="col-md-6">
            <h1 class="h3 mb-0 text-gray-800">Historique des importations</h1>
        </div>
        <div class="col-md-6 text-md-end">
            <a href="/import" class="btn btn-primary">
                <i class="fas fa-arrow-left me-2"></i>Retour à l'importation
            </a>
        </div>
    </div>

    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">Filtrer par date</h6>
        </div>
        <div class="card-body">
            <form id="historyFilterForm" class="row g-3">
                <div class="col-md-4">
                    <label for="start_date" class="form-label">Date de début</label>
                    <input type="date" id="start_date" name="start_date" class="form-control">
                </div>
                <div class="col-md-4">
                    <label for="end_date" class="form-label">Date de fin</label>
                    <input type="date" id="end_date" name="end_date" class="form-control">
                </div>
                <div class="col-md-4 d-flex align-items-end">
                    <button type="submit" id="apply-filter" class="btn btn-primary me-2">
                        <i class="fas fa-filter me-1"></i> Appliquer
                    </button>
                    <button type="button" id="reset-filter" class="btn btn-secondary">
                        <i class="fas fa-undo me-1"></i> Réinitialiser
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div class="card shadow">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">Liste des importations</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered" id="importHistoryTable">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Fichier</th>
                            <th>Utilisateur</th>
                            <th>Total</th>
                            <th>Importés</th>
                            <th>Doublons</th>
                            <th>Erreurs</th>
                            <th>Taux de succès</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Les données seront chargées via AJAX -->
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <div class="row mt-4">
                <div class="col-md-6">
                    <p id="pagination-info" class="text-muted"></p>
                </div>
                <div class="col-md-6 text-md-end">
                    <div id="pagination" class="d-inline-block"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Configuration
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let startDate = null;
    let endDate = null;
    
    // Au chargement de la page
    document.addEventListener('DOMContentLoaded', function() {
        // Initialiser les dates par défaut sur le mois en cours
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('start_date').valueAsDate = firstDayOfMonth;
        document.getElementById('end_date').valueAsDate = today;
        
        startDate = formatDateForAPI(firstDayOfMonth);
        endDate = formatDateForAPI(today);
        
        // Initialiser les composants
        loadImportHistory();
        
        // Gestionnaires d'événements pour les filtres
        document.getElementById('historyFilterForm').addEventListener('submit', function(e) {
            e.preventDefault();
            applyFilters();
        });
        
        document.getElementById('reset-filter').addEventListener('click', resetFilters);
    });
    
    // Formater la date pour l'API (YYYY-MM-DD)
    function formatDateForAPI(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Chargement de l'historique d'importation
    function loadImportHistory() {
        // Afficher l'état de chargement
        const tableBody = document.querySelector('#importHistoryTable tbody');
        if (!tableBody) {
            console.error('Élément #importHistoryTable tbody non trouvé');
            showAlert('danger', 'Erreur: Le tableau d\'historique n\'a pas pu être trouvé.');
            return;
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                    <p class="mt-3">Chargement des données...</p>
                </td>
            </tr>
        `;
        
        // Construire l'URL avec les paramètres
        let url = `/import/get-history?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
        
        if (startDate) {
            url += `&start_date=${startDate}`;
        }
        
        if (endDate) {
            url += `&end_date=${endDate}`;
        }
        
        // Effectuer la requête AJAX
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur réseau lors de la récupération des données');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Afficher les données dans le tableau
                    updateTableData(data.data);
                    
                    // Mettre à jour la pagination
                    updatePagination(data.pagination);
                } else {
                    showAlert('danger', data.error || 'Erreur lors du chargement des données');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                showAlert('danger', 'Erreur lors du chargement des données: ' + error.message);
                
                // Afficher un message d'erreur dans le tableau
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center py-5">
                            <i class="fas fa-exclamation-triangle text-danger fs-3 mb-3"></i>
                            <p>Une erreur est survenue lors du chargement des données.<br>
                            ${error.message}</p>
                        </td>
                    </tr>
                `;
            });
    }
    
    // Mise à jour du tableau de données
    function updateTableData(data) {
        const tableBody = document.querySelector('#importHistoryTable tbody');
        if (!tableBody) {
            console.error('Élément #importHistoryTable tbody non trouvé');
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <i class="fas fa-info-circle text-info fs-3 mb-3"></i>
                        <p>Aucune importation trouvée pour la période sélectionnée.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Ajouter chaque ligne d'importation au tableau
        data.forEach(importItem => {
            tableBody.innerHTML += createTableRow(importItem);
        });
    }
    
    // Création d'une ligne de tableau
    function createTableRow(importItem) {
        const successRate = parseFloat(importItem.success_rate).toFixed(2) + '%';
        const successClass = getSuccessRateClass(importItem.success_rate);
        
        // Formatter la date
        const importDate = new Date(importItem.import_date);
        const formattedDate = importDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Créer la cellule d'action avec les boutons
        let actionButtons = `
            <div class="btn-group" role="group">
                <a href="/import/download-report?id=${importItem.id}" class="btn btn-sm btn-info" title="Télécharger le rapport">
                    <i class="fas fa-file-download"></i>
                </a>`;
        
        // Ajouter le bouton de téléchargement des doublons seulement s'il y en a
        if (importItem.duplicate_records > 0) {
            actionButtons += `
                <a href="/import/download-duplicates?id=${importItem.id}" class="btn btn-sm btn-warning" title="Télécharger les doublons">
                    <i class="fas fa-copy"></i>
                </a>`;
        }
        
        actionButtons += `</div>`;
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${importItem.filename}</td>
                <td>${importItem.username || 'Système'}</td>
                <td>${importItem.total_records}</td>
                <td>${importItem.imported_records}</td>
                <td>
                    ${importItem.duplicate_records}
                    ${importItem.duplicate_records > 0 ? 
                    '<span class="badge bg-warning text-dark ms-1" title="Des doublons ont été détectés"><i class="fas fa-exclamation-triangle"></i></span>' : ''}
                </td>
                <td>${importItem.error_records}</td>
                <td>
                    <span class="text-${successClass}">${successRate}</span>
                </td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }
    
    // Déterminer la classe CSS pour le taux de succès
    function getSuccessRateClass(rate) {
        rate = parseFloat(rate);
        if (rate >= 90) return 'success';
        if (rate >= 75) return 'warning';
        return 'danger';
    }
    
    // Mettre à jour la pagination
    function updatePagination(pagination) {
        const paginationElement = document.getElementById('pagination');
        const paginationInfo = document.getElementById('pagination-info');
        
        if (!paginationElement || !paginationInfo) {
            console.error('Éléments de pagination non trouvés');
            return;
        }
        
        paginationElement.innerHTML = '';
        
        if (!pagination || pagination.total === 0) {
            paginationInfo.textContent = 'Aucun résultat trouvé';
            return;
        }
        
        // Mettre à jour l'info de pagination
        paginationInfo.textContent = `Page ${pagination.current_page} sur ${pagination.last_page} (${pagination.total} enregistrements)`;
        
        // Créer la pagination
        const totalPages = pagination.last_page;
        
        // Groupe de boutons
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';
        paginationElement.appendChild(btnGroup);
        
        // Bouton précédent
        const prevButton = document.createElement('button');
        prevButton.className = 'btn btn-sm btn-outline-secondary';
        prevButton.disabled = pagination.current_page <= 1;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.addEventListener('click', () => {
            if (pagination.current_page > 1) {
                currentPage--;
                loadImportHistory();
            }
        });
        btnGroup.appendChild(prevButton);
        
        // Pages numériques
        const maxVisiblePages = 5;
        let startPage = Math.max(1, pagination.current_page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = 'btn btn-sm ' + (i === pagination.current_page ? 'btn-primary' : 'btn-outline-secondary');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                currentPage = i;
                loadImportHistory();
            });
            btnGroup.appendChild(pageButton);
        }
        
        // Bouton suivant
        const nextButton = document.createElement('button');
        nextButton.className = 'btn btn-sm btn-outline-secondary';
        nextButton.disabled = pagination.current_page >= totalPages;
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => {
            if (pagination.current_page < totalPages) {
                currentPage++;
                loadImportHistory();
            }
        });
        btnGroup.appendChild(nextButton);
    }
    
    // Appliquer les filtres de date
    function applyFilters() {
        const startDateInput = document.getElementById('start_date');
        const endDateInput = document.getElementById('end_date');
        
        if (startDateInput.value && endDateInput.value) {
            const start = new Date(startDateInput.value);
            const end = new Date(endDateInput.value);
            
            // Vérifier que la date de début est avant la date de fin
            if (start > end) {
                showAlert('danger', 'La date de début doit être antérieure à la date de fin');
                return;
            }
        }
        
        startDate = startDateInput.value || null;
        endDate = endDateInput.value || null;
        
        // Réinitialiser la pagination
        currentPage = 1;
        
        // Recharger les données
        loadImportHistory();
    }
    
    // Réinitialiser les filtres
    function resetFilters() {
        const startDateInput = document.getElementById('start_date');
        const endDateInput = document.getElementById('end_date');
        
        // Réinitialiser sur le mois en cours
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        startDateInput.valueAsDate = firstDayOfMonth;
        endDateInput.valueAsDate = today;
        
        startDate = formatDateForAPI(firstDayOfMonth);
        endDate = formatDateForAPI(today);
        
        currentPage = 1;
        
        loadImportHistory();
    }
    
    // Afficher une alerte
    function showAlert(type, message) {
        // Créer l'alerte
        const alertPlaceholder = document.getElementById('alertsContainer') || document.querySelector('.container-fluid');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
            </div>
        `;
        
        // Insérer l'alerte au début du conteneur
        alertPlaceholder.insertBefore(wrapper.firstChild, alertPlaceholder.firstChild);
        
        // Supprimer automatiquement après 10 secondes
        setTimeout(() => {
            const alert = wrapper.firstChild;
            if (document.body.contains(alert)) {
                alert.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(alert)) {
                        alert.remove();
                    }
                }, 150);
            }
        }, 10000);
    }
</script>

<?php
// Fin de la capture du contenu
$content = ob_get_clean();

// Inclure le layout principal
include __DIR__ . '/../layouts/main.php';
?> 