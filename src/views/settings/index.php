<?php
$title = 'Paramètres - SENATOR';
?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">Paramètres du système</h5>
                </div>
                <div class="card-body">
                    <form action="/settings/update" method="post">
                        <!-- Paramètres généraux -->
                        <h6 class="mb-3">Paramètres généraux</h6>
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="site_name" class="form-label">Nom du site</label>
                                    <input type="text" class="form-control" id="site_name" name="site_name" value="<?= htmlspecialchars($settings['site_name']) ?>">
                                </div>
                                <div class="mb-3">
                                    <label for="site_description" class="form-label">Description</label>
                                    <textarea class="form-control" id="site_description" name="site_description" rows="3"><?= htmlspecialchars($settings['site_description']) ?></textarea>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="maintenance_mode" name="maintenance_mode" <?= $settings['maintenance_mode'] ? 'checked' : '' ?>>
                                        <label class="form-check-label" for="maintenance_mode">Mode maintenance</label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="debug_mode" name="debug_mode" <?= $settings['debug_mode'] ? 'checked' : '' ?>>
                                        <label class="form-check-label" for="debug_mode">Mode debug</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Paramètres de localisation -->
                        <h6 class="mb-3">Localisation</h6>
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="default_language" class="form-label">Langue par défaut</label>
                                    <select class="form-select" id="default_language" name="default_language">
                                        <option value="fr" <?= $settings['default_language'] === 'fr' ? 'selected' : '' ?>>Français</option>
                                        <option value="en" <?= $settings['default_language'] === 'en' ? 'selected' : '' ?>>English</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="timezone" class="form-label">Fuseau horaire</label>
                                    <select class="form-select" id="timezone" name="timezone">
                                        <option value="Europe/Paris" <?= $settings['timezone'] === 'Europe/Paris' ? 'selected' : '' ?>>Europe/Paris</option>
                                        <option value="UTC" <?= $settings['timezone'] === 'UTC' ? 'selected' : '' ?>>UTC</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Paramètres de sécurité -->
                        <h6 class="mb-3">Sécurité</h6>
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="session_lifetime" class="form-label">Durée de session (secondes)</label>
                                    <input type="number" class="form-control" id="session_lifetime" name="session_lifetime" value="<?= $settings['session_lifetime'] ?>">
                                </div>
                                <div class="mb-3">
                                    <label for="max_login_attempts" class="form-label">Tentatives de connexion max</label>
                                    <input type="number" class="form-control" id="max_login_attempts" name="max_login_attempts" value="<?= $settings['max_login_attempts'] ?>">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="password_reset_timeout" class="form-label">Délai de réinitialisation du mot de passe (secondes)</label>
                                    <input type="number" class="form-control" id="password_reset_timeout" name="password_reset_timeout" value="<?= $settings['password_reset_timeout'] ?>">
                                </div>
                            </div>
                        </div>

                        <!-- Paramètres de fichiers -->
                        <h6 class="mb-3">Fichiers</h6>
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="file_upload_max_size" class="form-label">Taille max des fichiers (octets)</label>
                                    <input type="number" class="form-control" id="file_upload_max_size" name="file_upload_max_size" value="<?= $settings['file_upload_max_size'] ?>">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="allowed_file_types" class="form-label">Types de fichiers autorisés</label>
                                    <input type="text" class="form-control" id="allowed_file_types" name="allowed_file_types" value="<?= implode(',', $settings['allowed_file_types']) ?>">
                                    <div class="form-text">Séparez les extensions par des virgules (ex: csv,txt,xlsx)</div>
                                </div>
                            </div>
                        </div>

                        <!-- Paramètres de sauvegarde -->
                        <h6 class="mb-3">Sauvegardes</h6>
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="backup_enabled" name="backup_enabled" <?= $settings['backup_enabled'] ? 'checked' : '' ?>>
                                        <label class="form-check-label" for="backup_enabled">Activer les sauvegardes</label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="backup_frequency" class="form-label">Fréquence des sauvegardes</label>
                                    <select class="form-select" id="backup_frequency" name="backup_frequency">
                                        <option value="hourly" <?= $settings['backup_frequency'] === 'hourly' ? 'selected' : '' ?>>Toutes les heures</option>
                                        <option value="daily" <?= $settings['backup_frequency'] === 'daily' ? 'selected' : '' ?>>Quotidienne</option>
                                        <option value="weekly" <?= $settings['backup_frequency'] === 'weekly' ? 'selected' : '' ?>>Hebdomadaire</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="backup_retention_days" class="form-label">Conservation des sauvegardes (jours)</label>
                                    <input type="number" class="form-control" id="backup_retention_days" name="backup_retention_days" value="<?= $settings['backup_retention_days'] ?>">
                                </div>
                            </div>
                        </div>

                        <!-- Paramètres email -->
                        <h6 class="mb-3">Email</h6>
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="smtp_host" class="form-label">Serveur SMTP</label>
                                    <input type="text" class="form-control" id="smtp_host" name="smtp_host" value="<?= htmlspecialchars($settings['smtp_host']) ?>">
                                </div>
                                <div class="mb-3">
                                    <label for="smtp_port" class="form-label">Port SMTP</label>
                                    <input type="number" class="form-control" id="smtp_port" name="smtp_port" value="<?= $settings['smtp_port'] ?>">
                                </div>
                                <div class="mb-3">
                                    <label for="smtp_encryption" class="form-label">Chiffrement SMTP</label>
                                    <select class="form-select" id="smtp_encryption" name="smtp_encryption">
                                        <option value="tls" <?= $settings['smtp_encryption'] === 'tls' ? 'selected' : '' ?>>TLS</option>
                                        <option value="ssl" <?= $settings['smtp_encryption'] === 'ssl' ? 'selected' : '' ?>>SSL</option>
                                        <option value="none" <?= $settings['smtp_encryption'] === 'none' ? 'selected' : '' ?>>Aucun</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="smtp_username" class="form-label">Utilisateur SMTP</label>
                                    <input type="text" class="form-control" id="smtp_username" name="smtp_username" value="<?= htmlspecialchars($settings['smtp_username']) ?>">
                                </div>
                                <div class="mb-3">
                                    <label for="notification_email" class="form-label">Email de notification</label>
                                    <input type="email" class="form-control" id="notification_email" name="notification_email" value="<?= htmlspecialchars($settings['notification_email']) ?>">
                                </div>
                            </div>
                        </div>

                        <div class="text-end">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Enregistrer les modifications
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div> 