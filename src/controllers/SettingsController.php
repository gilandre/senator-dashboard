<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Auth;
use App\Services\ConfigService;

class SettingsController extends Controller
{
    private Auth $auth;
    private ConfigService $configService;

    public function __construct()
    {
        parent::__construct();
        $this->auth = new Auth();
        $this->configService = ConfigService::getInstance();
    }

    public function index(): void
    {
        if (!$this->auth->hasPermission('settings.view')) {
            $this->redirect('/dashboard');
        }

        // Récupérer tous les paramètres publics depuis la base de données
        $dbSettings = $this->configService->getAll(true);

        // Paramètres par défaut si non définis en base
        $settings = [
            'site_name' => $dbSettings['site_name'] ?? 'SENATOR',
            'site_description' => $dbSettings['site_description'] ?? 'Système de gestion des accès',
            'maintenance_mode' => false,
            'debug_mode' => false,
            'default_language' => $dbSettings['default_language'] ?? 'fr',
            'timezone' => $dbSettings['timezone'] ?? 'Europe/Paris',
            'session_lifetime' => (int)($dbSettings['session_lifetime'] ?? 3600),
            'max_login_attempts' => (int)($dbSettings['max_login_attempts'] ?? 3),
            'password_reset_timeout' => (int)($dbSettings['password_reset_timeout'] ?? 3600),
            'file_upload_max_size' => (int)($dbSettings['file_upload_max_size'] ?? 10485760), // 10MB
            'allowed_file_types' => explode(',', $dbSettings['allowed_file_types'] ?? 'csv'),
            'backup_enabled' => (bool)($dbSettings['backup_enabled'] ?? true),
            'backup_frequency' => $dbSettings['backup_frequency'] ?? 'daily',
            'backup_retention_days' => (int)($dbSettings['backup_retention_days'] ?? 30),
            'smtp_host' => $dbSettings['smtp_host'] ?? 'smtp.example.com',
            'smtp_port' => (int)($dbSettings['smtp_port'] ?? 587),
            'smtp_encryption' => $dbSettings['smtp_encryption'] ?? 'tls',
            'smtp_username' => $dbSettings['smtp_username'] ?? 'noreply@example.com',
            'notification_email' => $dbSettings['notification_email'] ?? 'admin@example.com',
            'work_day_start_time' => $dbSettings['work_day_start_time'] ?? '09:00:00',
            'work_day_end_time' => $dbSettings['work_day_end_time'] ?? '18:00:00'
        ];

        $this->view('settings/index', [
            'settings' => $settings,
            'currentPage' => 'settings'
        ]);
    }

    public function update(): void
    {
        if (!$this->auth->hasPermission('settings.edit')) {
            $this->redirect('/dashboard');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Validation des données
            $settings = [
                'site_name' => $_POST['site_name'] ?? '',
                'site_description' => $_POST['site_description'] ?? '',
                'maintenance_mode' => isset($_POST['maintenance_mode']),
                'debug_mode' => isset($_POST['debug_mode']),
                'default_language' => $_POST['default_language'] ?? 'fr',
                'timezone' => $_POST['timezone'] ?? 'Europe/Paris',
                'session_lifetime' => (int)($_POST['session_lifetime'] ?? 3600),
                'max_login_attempts' => (int)($_POST['max_login_attempts'] ?? 3),
                'password_reset_timeout' => (int)($_POST['password_reset_timeout'] ?? 3600),
                'file_upload_max_size' => (int)($_POST['file_upload_max_size'] ?? 10485760),
                'allowed_file_types' => $_POST['allowed_file_types'] ?? 'csv',
                'backup_enabled' => isset($_POST['backup_enabled']),
                'backup_frequency' => $_POST['backup_frequency'] ?? 'daily',
                'backup_retention_days' => (int)($_POST['backup_retention_days'] ?? 30),
                'smtp_host' => $_POST['smtp_host'] ?? '',
                'smtp_port' => (int)($_POST['smtp_port'] ?? 587),
                'smtp_encryption' => $_POST['smtp_encryption'] ?? 'tls',
                'smtp_username' => $_POST['smtp_username'] ?? '',
                'notification_email' => $_POST['notification_email'] ?? '',
                'work_day_start_time' => $_POST['work_day_start_time'] ?? '09:00:00',
                'work_day_end_time' => $_POST['work_day_end_time'] ?? '18:00:00'
            ];

            // Sauvegarder les paramètres en base de données
            $success = true;
            foreach ($settings as $key => $value) {
                if ($key === 'work_day_start_time') {
                    $success = $this->configService->setWorkDayStartTime($value) && $success;
                } elseif ($key === 'work_day_end_time') {
                    $success = $this->configService->setWorkDayEndTime($value) && $success;
                } else {
                    // Pour les booléens, convertir en '0' ou '1'
                    if (is_bool($value)) {
                        $value = $value ? '1' : '0';
                    }
                    
                    $success = $this->configService->set($key, $value) && $success;
                }
            }

            if ($success) {
                $this->setSuccess('Paramètres mis à jour avec succès');
            } else {
                $this->setError('Erreur lors de la mise à jour des paramètres');
            }
            
            $this->redirect('/settings');
        }
    }
} 