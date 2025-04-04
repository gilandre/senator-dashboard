<?php
$currentPage = 'reports';
require_once __DIR__ . '/../layouts/app.php';
?>

<div class="container-fluid">
    <div class="row mb-4">
        <div class="col">
            <h1 class="h3 mb-0">Nouveau rapport</h1>
        </div>
        <div class="col text-end">
            <a href="/reports" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Retour à la liste
            </a>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h5 class="card-title mb-0">Créer un rapport</h5>
        </div>
        <div class="card-body">
            <form action="/reports/create" method="post" id="reportForm" class="needs-validation" novalidate>
                <div class="mb-3">
                    <label for="title" class="form-label">Titre</label>
                    <input type="text" class="form-control" id="title" name="title" required>
                    <div class="invalid-feedback">
                        Le titre est requis
                    </div>
                </div>

                <div class="mb-3">
                    <label for="type" class="form-label">Type de rapport</label>
                    <select class="form-select" id="type" name="type" required>
                        <option value="">Sélectionnez un type</option>
                        <option value="daily">Journalier</option>
                        <option value="weekly">Hebdomadaire</option>
                        <option value="monthly">Mensuel</option>
                        <option value="custom">Personnalisé</option>
                    </select>
                    <div class="invalid-feedback">
                        Le type de rapport est requis
                    </div>
                </div>

                <div class="mb-3">
                    <label for="description" class="form-label">Description</label>
                    <textarea class="form-control" id="description" name="description" rows="3"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">Paramètres</label>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="start_date" class="form-label">Date de début</label>
                                <input type="date" class="form-control" id="start_date" name="start_date" required>
                                <div class="invalid-feedback">
                                    La date de début est requise
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="end_date" class="form-label">Date de fin</label>
                                <input type="date" class="form-control" id="end_date" name="end_date" required>
                                <div class="invalid-feedback">
                                    La date de fin est requise
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="include_charts" name="include_charts" checked>
                        <label class="form-check-label" for="include_charts">
                            Inclure des graphiques
                        </label>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="include_tables" name="include_tables" checked>
                        <label class="form-check-label" for="include_tables">
                            Inclure des tableaux
                        </label>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Créer le rapport
                </button>
            </form>
        </div>
    </div>
</div>

<script>
// Validation du formulaire
(function () {
    'use strict'
    var forms = document.querySelectorAll('.needs-validation')
    Array.prototype.slice.call(forms).forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault()
                event.stopPropagation()
            }
            form.classList.add('was-validated')
        }, false)
    })
})()

// Validation de la date de fin
document.getElementById('end_date').addEventListener('change', function() {
    const startDate = new Date(document.getElementById('start_date').value);
    const endDate = new Date(this.value);
    
    if (endDate < startDate) {
        this.setCustomValidity('La date de fin doit être postérieure à la date de début');
    } else {
        this.setCustomValidity('');
    }
});
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 