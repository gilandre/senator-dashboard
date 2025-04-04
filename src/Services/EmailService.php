<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

class EmailService
{
    private $mailer;

    public function __construct()
    {
        $this->mailer = new PHPMailer(true);
        $this->configureMailer();
    }

    private function configureMailer()
    {
        try {
            // Configuration SMTP
            $this->mailer->isSMTP();
            $this->mailer->Host = $_ENV['MAIL_HOST'];
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = $_ENV['MAIL_USERNAME'];
            $this->mailer->Password = $_ENV['MAIL_PASSWORD'];
            $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mailer->Port = $_ENV['MAIL_PORT'];

            // Configuration de l'expéditeur
            $this->mailer->setFrom($_ENV['MAIL_FROM_ADDRESS'], $_ENV['MAIL_FROM_NAME']);
            $this->mailer->isHTML(true);
        } catch (Exception $e) {
            error_log("Erreur de configuration du mailer : " . $e->getMessage());
            throw $e;
        }
    }

    public function sendResetPasswordEmail($email, $token)
    {
        try {
            $resetUrl = $_ENV['APP_URL'] . '/reset-password?token=' . $token;
            
            $this->mailer->addAddress($email);
            $this->mailer->Subject = 'Réinitialisation de votre mot de passe';
            
            $htmlContent = "
                <h1>Réinitialisation de votre mot de passe</h1>
                <p>Bonjour,</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour procéder :</p>
                <p><a href='{$resetUrl}'>Réinitialiser mon mot de passe</a></p>
                <p>Ce lien expirera dans 1 heure.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
                <p>Cordialement,<br>L'équipe " . $_ENV['APP_NAME'] . "</p>
            ";
            
            $this->mailer->Body = $htmlContent;
            $this->mailer->AltBody = strip_tags($htmlContent);
            
            $this->mailer->send();
            return true;
        } catch (Exception $e) {
            error_log("Erreur lors de l'envoi de l'email de réinitialisation : " . $e->getMessage());
            throw $e;
        }
    }
} 