<?php

namespace App\Services;

use App\Core\Database;

class ValidationService
{
    private array $errors = [];

    public function validate(array $data, array $rules): bool
    {
        $this->errors = [];

        foreach ($rules as $field => $fieldRules) {
            foreach ($fieldRules as $rule => $parameter) {
                if (!$this->validateField($data[$field] ?? null, $rule, $parameter)) {
                    $this->errors[$field][] = $this->getErrorMessage($field, $rule, $parameter);
                }
            }
        }

        return empty($this->errors);
    }

    private function validateField($value, string $rule, $parameter): bool
    {
        switch ($rule) {
            case 'required':
                return !empty($value);
            case 'email':
                return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
            case 'min':
                return strlen($value) >= $parameter;
            case 'max':
                return strlen($value) <= $parameter;
            case 'regex':
                return preg_match($parameter, $value) === 1;
            case 'password':
                return $this->validatePassword($value);
            case 'in':
                return in_array($value, $parameter);
            case 'numeric':
                return is_numeric($value);
            case 'date':
                return strtotime($value) !== false;
            case 'unique':
                return $this->validateUnique($value, $parameter);
            default:
                return true;
        }
    }

    private function validatePassword(string $password): bool
    {
        return (
            strlen($password) >= 8 &&
            preg_match('/[A-Z]/', $password) &&
            preg_match('/[a-z]/', $password) &&
            preg_match('/[0-9]/', $password) &&
            preg_match('/[^A-Za-z0-9]/', $password)
        );
    }

    private function validateUnique($value, array $parameters): bool
    {
        [$table, $column] = $parameters;
        $db = Database::getInstance();
        
        $result = $db->query(
            "SELECT COUNT(*) FROM {$table} WHERE {$column} = ?",
            [$value]
        )->fetchColumn();
        
        return $result === 0;
    }

    private function getErrorMessage(string $field, string $rule, $parameter): string
    {
        $messages = [
            'required' => 'Le champ {$field} est obligatoire.',
            'email' => 'Le champ {$field} doit être une adresse email valide.',
            'min' => 'Le champ {$field} doit contenir au moins {$parameter} caractères.',
            'max' => 'Le champ {$field} ne doit pas dépasser {$parameter} caractères.',
            'regex' => 'Le format du champ {$field} est invalide.',
            'password' => 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.',
            'in' => 'La valeur du champ {$field} est invalide.',
            'numeric' => 'Le champ {$field} doit être un nombre.',
            'date' => 'Le champ {$field} doit être une date valide.',
            'unique' => 'Cette valeur est déjà utilisée.'
        ];

        $message = $messages[$rule] ?? 'Le champ {$field} est invalide.';
        return str_replace(['{$field}', '{$parameter}'], [$field, $parameter], $message);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function getFirstError(): ?string
    {
        if (empty($this->errors)) {
            return null;
        }

        $firstField = array_key_first($this->errors);
        return $this->errors[$firstField][0];
    }

    private function checkUnique(string $field, string $value, string $table, ?int $excludeId = null): bool
    {
        $db = Database::getInstance();
        $sql = "SELECT COUNT(*) FROM {$table} WHERE {$field} = ?";
        $params = [$value];

        if ($excludeId !== null) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }

        $result = $db->query($sql, $params)->fetchColumn();
        return $result === 0;
    }

    public function validateLogin(array $data): array
    {
        $errors = [];

        if (empty($data['email'])) {
            $errors['email'] = 'L\'adresse email est requise.';
        } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'L\'adresse email n\'est pas valide.';
        }

        if (empty($data['password'])) {
            $errors['password'] = 'Le mot de passe est requis.';
        }

        return $errors;
    }

    public function validateEmail(string $email): array
    {
        $errors = [];

        if (empty($email)) {
            $errors['email'] = 'L\'adresse email est requise.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'L\'adresse email n\'est pas valide.';
        }

        return $errors;
    }

    public function validatePasswordReset(array $data): array
    {
        $errors = [];

        if (empty($data['token'])) {
            $errors['token'] = 'Le token de réinitialisation est requis.';
        }

        if (empty($data['password'])) {
            $errors['password'] = 'Le mot de passe est requis.';
        } elseif (strlen($data['password']) < 8) {
            $errors['password'] = 'Le mot de passe doit contenir au moins 8 caractères.';
        }

        if (empty($data['password_confirmation'])) {
            $errors['password_confirmation'] = 'La confirmation du mot de passe est requise.';
        } elseif ($data['password'] !== $data['password_confirmation']) {
            $errors['password_confirmation'] = 'Les mots de passe ne correspondent pas.';
        }

        return $errors;
    }

    public function validateFile(array $file): void
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('Erreur lors de l\'upload du fichier');
        }

        if ($file['type'] !== 'text/csv') {
            throw new \RuntimeException('Le fichier doit être au format CSV');
        }

        if ($file['size'] > 5 * 1024 * 1024) { // 5MB
            throw new \RuntimeException('Le fichier ne doit pas dépasser 5MB');
        }
    }
} 