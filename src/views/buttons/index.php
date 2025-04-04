<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title"><?= $title ?></h3>
                    <a href="/buttons/create" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Nouveau Bouton
                    </a>
                </div>
                <div class="card-body">
                    <?php if ($flash = $this->getFlash('success')): ?>
                        <div class="alert alert-success"><?= $flash ?></div>
                    <?php endif; ?>

                    <div class="table-responsive">
                        <table class="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Label</th>
                                    <th>Action</th>
                                    <th>Menu</th>
                                    <th>Ordre</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($buttons as $button): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($button['name']) ?></td>
                                        <td><?= htmlspecialchars($button['label']) ?></td>
                                        <td><?= htmlspecialchars($button['action']) ?></td>
                                        <td><?= htmlspecialchars($button['menu_name']) ?></td>
                                        <td><?= $button['order_index'] ?></td>
                                        <td>
                                            <span class="badge badge-<?= $button['is_active'] ? 'success' : 'danger' ?>">
                                                <?= $button['is_active'] ? 'Actif' : 'Inactif' ?>
                                            </span>
                                        </td>
                                        <td>
                                            <div class="btn-group">
                                                <a href="/buttons/edit/<?= $button['id'] ?>" class="btn btn-sm btn-info">
                                                    <i class="fas fa-edit"></i>
                                                </a>
                                                <button type="button" class="btn btn-sm btn-danger" 
                                                        onclick="confirmDelete(<?= $button['id'] ?>)">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
function confirmDelete(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bouton ?')) {
        window.location.href = `/buttons/delete/${id}`;
    }
}
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 