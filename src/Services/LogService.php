<?php

namespace App\Services;

class LogService
{
    private string $logPath;
    private string $logFile;
    private array $logLevels = [
        'emergency' => 0,
        'alert'     => 1,
        'critical'  => 2,
        'error'     => 3,
        'warning'   => 4,
        'notice'    => 5,
        'info'      => 6,
        'debug'     => 7
    ];

    public function __construct()
    {
        $this->logPath = __DIR__ . '/../../logs';
        $this->logFile = $this->logPath . '/app.log';

        // Créer le dossier logs s'il n'existe pas
        if (!is_dir($this->logPath)) {
            mkdir($this->logPath, 0755, true);
        }
    }

    public function log(string $level, string $message, array $context = []): void
    {
        if (!isset($this->logLevels[$level])) {
            throw new \InvalidArgumentException('Niveau de log invalide');
        }

        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => strtoupper($level),
            'message' => $this->interpolate($message, $context),
            'context' => $context,
            'user_id' => $_SESSION['user_id'] ?? null,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'request_uri' => $_SERVER['REQUEST_URI'] ?? null,
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? null
        ];

        $logMessage = json_encode($logEntry, JSON_UNESCAPED_UNICODE) . PHP_EOL;
        file_put_contents($this->logFile, $logMessage, FILE_APPEND);
    }

    private function interpolate(string $message, array $context = []): string
    {
        $replace = [];
        foreach ($context as $key => $val) {
            if (!is_array($val) && (!is_object($val) || method_exists($val, '__toString'))) {
                $replace['{' . $key . '}'] = $val;
            }
        }
        return strtr($message, $replace);
    }

    public function emergency(string $message, array $context = []): void
    {
        $this->log('emergency', $message, $context);
    }

    public function alert(string $message, array $context = []): void
    {
        $this->log('alert', $message, $context);
    }

    public function critical(string $message, array $context = []): void
    {
        $this->log('critical', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->log('error', $message, $context);
    }

    public function warning(string $message, array $context = []): void
    {
        $this->log('warning', $message, $context);
    }

    public function notice(string $message, array $context = []): void
    {
        $this->log('notice', $message, $context);
    }

    public function info(string $message, array $context = []): void
    {
        $this->log('info', $message, $context);
    }

    public function debug(string $message, array $context = []): void
    {
        $this->log('debug', $message, $context);
    }

    public function getLogs(string $level = null, int $limit = 100): array
    {
        if (!file_exists($this->logFile)) {
            return [];
        }

        $logs = [];
        $handle = fopen($this->logFile, 'r');
        
        while (($line = fgets($handle)) !== false) {
            $log = json_decode($line, true);
            
            if ($level === null || $log['level'] === strtoupper($level)) {
                $logs[] = $log;
                
                if (count($logs) >= $limit) {
                    break;
                }
            }
        }
        
        fclose($handle);
        
        return array_reverse($logs);
    }

    public function clearLogs(): void
    {
        if (file_exists($this->logFile)) {
            unlink($this->logFile);
        }
    }
} 