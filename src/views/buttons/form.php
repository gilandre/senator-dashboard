<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><?= $title ?></h3>
                </div>
                <div class="card-body">
                    <?php if ($flash = $this->getFlash('error')): ?>
                        <div class="alert alert-danger"><?= $flash ?></div>
                    <?php endif; ?>

                    <form method="POST" action="<?= $action ?>">
                        <input type="hidden" name="csrf_token" value="<?= $this->generateCsrfToken() ?>">
                        
                        <div class="form-group">
                            <label for="name">Nom *</label>
                            <input type="text" class="form-control" id="name" name="name" 
                                   value="<?= htmlspecialchars($button['name'] ?? '') ?>" required>
                        </div>

                        <div class="form-group">
                            <label for="label">Label *</label>
                            <input type="text" class="form-control" id="label" name="label" 
                                   value="<?= htmlspecialchars($button['label'] ?? '') ?>" required>
                        </div>

                        <div class="form-group">
                            <label for="icon">Icône</label>
                            <input type="text" class="form-control" id="icon" name="icon" 
                                   value="<?= htmlspecialchars($button['icon'] ?? '') ?>"
                                   placeholder="Ex: fas fa-save">
                            <small class="form-text text-muted">
                                Utilisez les classes Font Awesome (ex: fas fa-save)
                            </small>
                        </div>

                        <div class="form-group">
                            <label for="action">Action *</label>
                            <input type="text" class="form-control" id="action" name="action" 
                                   value="<?= htmlspecialchars($button['action'] ?? '') ?>" required
                                   placeholder="Ex: saveData()">
                            <small class="form-text text-muted">
                                Nom de la fonction JavaScript à exécuter
                            </small>
                        </div>

                        <div class="form-group">
                            <label for="menu_id">Menu *</label>
                            <select class="form-control" id="menu_id" name="menu_id" required>
                                <option value="">Sélectionnez un menu</option>
                                <?php foreach ($menus as $menu): ?>
                                    <option value="<?= $menu['id'] ?>" 
                                            <?= (isset($button['menu_id']) && $button['menu_id'] == $menu['id']) ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($menu['name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="order_index">Ordre d'affichage</label>
                            <input type="number" class="form-control" id="order_index" name="order_index" 
                                   value="<?= $button['order_index'] ?? 0 ?>" min="0">
                        </div>

                        <div class="form-group">
                            <div class="custom-control custom-switch">
                                <input type="checkbox" class="custom-control-input" id="is_active" name="is_active" 
                                       <?= (!isset($button['is_active']) || $button['is_active']) ? 'checked' : '' ?>>
                                <label class="custom-control-label" for="is_active">Actif</label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Permissions</label>
                            <div class="row">
                                <?php foreach ($permissions as $permission): ?>
                                    <div class="col-md-4">
                                        <div class="custom-control custom-checkbox">
                                            <input type="checkbox" class="custom-control-input" 
                                                   id="permission_<?= $permission['id'] ?>" 
                                                   name="permissions[]" 
                                                   value="<?= $permission['id'] ?>"
                                                   <?= isset($buttonPermissions) && in_array($permission['id'], array_column($buttonPermissions, 'id')) ? 'checked' : '' ?>>
                                            <label class="custom-control-label" for="permission_<?= $permission['id'] ?>">
                                                <?= htmlspecialchars($permission['name']) ?>
                                            </label>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>

                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Enregistrer
                            </button>
                            <a href="/buttons" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Annuler
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 