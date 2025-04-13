<?php
/**
 * Vue exemple démontrant l'approche modulaire
 */

// Fonction d'aide pour rendre les activités
function renderActivities($activities = []) {
    if (empty($activities)) {
        return '<tr><td colspan="4" class="text-center">Aucune activité récente</td></tr>';
    }
    
    $html = '';
    foreach ($activities as $activity) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($activity['date']) . '</td>';
        $html .= '<td>' . htmlspecialchars($activity['badge']) . '</td>';
        $html .= '<td>' . htmlspecialchars($activity['type']) . '</td>';
        $html .= '<td>' . htmlspecialchars($activity['central']) . '</td>';
        $html .= '</tr>';
    }
    
    return $html;
}
?>

<div class="row mb-4">
    <div class="col-12">
        <?= $this->component('alert', [
            'type' => 'info',
            'message' => 'Bienvenue dans l\'interface modulaire du tableau de bord SENATOR.',
            'dismissible' => true
        ]) ?>
    </div>
</div>

<div class="row mb-4">
    <div class="col-md-3">
        <?= $this->component('stat_card', [
            'icon' => 'fa-users',
            'value' => $stats['total_users'] ?? 0,
            'label' => 'Utilisateurs',
            'color' => 'primary',
            'trend' => 'up',
            'trend_value' => '+12%'
        ]) ?>
    </div>
    <div class="col-md-3">
        <?= $this->component('stat_card', [
            'icon' => 'fa-id-card',
            'value' => $stats['total_badges'] ?? 0,
            'label' => 'Badges actifs',
            'color' => 'success'
        ]) ?>
    </div>
    <div class="col-md-3">
        <?= $this->component('stat_card', [
            'icon' => 'fa-clock',
            'value' => $stats['average_time'] ?? '00:00',
            'label' => 'Temps moyen',
            'color' => 'warning'
        ]) ?>
    </div>
    <div class="col-md-3">
        <?= $this->component('stat_card', [
            'icon' => 'fa-exclamation-triangle',
            'value' => $stats['total_alerts'] ?? 0,
            'label' => 'Alertes',
            'color' => 'danger',
            'trend' => 'down',
            'trend_value' => '-5%'
        ]) ?>
    </div>
</div>

<div class="row">
    <div class="col-md-8">
        <?= $this->component('card', [
            'title' => 'Dernières activités',
            'content' => '
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Badge</th>
                                <th>Type</th>
                                <th>Central</th>
                            </tr>
                        </thead>
                        <tbody>
                            ' . renderActivities($activities) . '
                        </tbody>
                    </table>
                </div>
            ',
            'footer' => '<a href="/reports" class="btn btn-sm btn-primary">Voir tout</a>',
            'card_class' => 'h-100'
        ]) ?>
    </div>
    <div class="col-md-4">
        <?= $this->component('card', [
            'title' => 'Répartition par groupe',
            'content' => '
                <div class="chart-container" style="position: relative; height:250px;">
                    <canvas id="groupChart"></canvas>
                </div>
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        var ctx = document.getElementById("groupChart").getContext("2d");
                        var groupChart = new Chart(ctx, {
                            type: "doughnut",
                            data: {
                                labels: ["Groupe A", "Groupe B", "Groupe C", "Autres"],
                                datasets: [{
                                    data: [35, 25, 20, 20],
                                    backgroundColor: ["#0d6efd", "#198754", "#ffc107", "#6c757d"]
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false
                            }
                        });
                    });
                </script>
            ',
            'card_class' => 'h-100'
        ]) ?>
    </div>
</div> 