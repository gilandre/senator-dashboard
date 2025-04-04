<?php

// Static file extensions that should be served directly
$staticExtensions = ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'eot'];

$uri = parse_url($_SERVER['REQUEST_URI'])['path'];
$ext = pathinfo($uri, PATHINFO_EXTENSION);

// If the file exists and has a static extension, serve it directly
if (file_exists(__DIR__ . $uri) && in_array($ext, $staticExtensions)) {
    $mimeTypes = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'svg' => 'image/svg+xml',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'eot' => 'application/vnd.ms-fontobject'
    ];

    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
        
        // Cache static files
        $maxAge = 31536000; // 1 year
        header('Cache-Control: public, max-age=' . $maxAge);
        header('Expires: ' . gmdate('D, d M Y H:i:s \G\M\T', time() + $maxAge));
    }

    readfile(__DIR__ . $uri);
    exit;
}

// For all other requests, route through index.php
require __DIR__ . '/index.php'; 