<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Auth;

class SettingsController extends Controller
{
    private Auth $auth;

    public function __construct()
    {
        parent::__construct();
        $this->auth = new Auth();
    }

    public function index(): void
    {
        if (!$this->auth->hasPermission('settings.view')) {
            $this->redirect('/dashboard');
        }

        $settings = [
            'site_name' => 'SENATOR',
            'site_description' => 'Système de gestion des accès',
            'maintenance_mode' => false,
            'debug_mode' => false,
            'default_language' => 'fr',
            'timezone' => 'Europe/Paris',
            'session_lifetime' => 3600,
            'max_login_attempts' => 3,
            'password_reset_timeout' => 3600,
            'file_upload_max_size' => 10485760, // 10MB
            'allowed_file_types' => ['csv'],
            'backup_enabled' => true,
            'backup_frequency' => 'daily',
            'backup_retention_days' => 30,
            'smtp_host' => 'smtp.example.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
            'smtp_username' => 'noreply@example.com',
            'notification_email' => 'admin@example.com'
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
                'allowed_file_types' => explode(',', $_POST['allowed_file_types'] ?? 'csv'),
                'backup_enabled' => isset($_POST['backup_enabled']),
                'backup_frequency' => $_POST['backup_frequency'] ?? 'daily',
                'backup_retention_days' => (int)($_POST['backup_retention_days'] ?? 30),
                'smtp_host' => $_POST['smtp_host'] ?? '',
                'smtp_port' => (int)($_POST['smtp_port'] ?? 587),
                'smtp_encryption' => $_POST['smtp_encryption'] ?? 'tls',
                'smtp_username' => $_POST['smtp_username'] ?? '',
                'notification_email' => $_POST['notification_email'] ?? ''
            ];

            // TODO: Sauvegarder les paramètres dans un fichier de configuration ou en base de données

            $this->setSuccess('Paramètres mis à jour avec succès');
            $this->redirect('/settings');
        }
    }
} 