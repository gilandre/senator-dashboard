<?php
// En-tête pour supporter AJAX
header('Content-Type: application/json');

// Vérifier si un fichier a été téléchargé
if (!isset($_FILES['csv_file'])) {
    echo json_encode(['success' => false, 'error' => 'Aucun fichier téléchargé']);
    exit;
}

// Afficher les informations sur le fichier téléchargé
$file = $_FILES['csv_file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors du téléchargement: ' . $file['error']]);
    exit;
}

// Essayer de déplacer le fichier téléchargé
$tempDir = __DIR__ . '/../tmp';
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0777, true);
}
$tempFile = $tempDir . '/' . uniqid('test_', true) . '.csv';

if (move_uploaded_file($file['tmp_name'], $tempFile)) {
    echo json_encode([
        'success' => true, 
        'file' => [
            'name' => $file['name'],
            'size' => $file['size'],
            'tmp_name' => $file['tmp_name'],
            'saved_to' => $tempFile
        ]
    ]);
} else {
    echo json_encode([
        'success' => false, 
        'error' => 'Impossible de déplacer le fichier',
        'file' => [
            'name' => $file['name'],
            'size' => $file['size'],
            'tmp_name' => $file['tmp_name'],
            'error' => $file['error']
        ],
        'temp_dir' => $tempDir,
        'writable' => is_writable($tempDir)
    ]);
} 