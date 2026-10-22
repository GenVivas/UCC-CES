<?php
declare(strict_types=1);

$publicRoot = realpath(dirname(__DIR__) . DIRECTORY_SEPARATOR . 'public');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($publicRoot === false) {
    http_response_code(500);
    exit('Public directory is missing.');
}

if ($path === '/api' || str_starts_with($path, '/api/')) {
    require $publicRoot . DIRECTORY_SEPARATOR . 'api.php';
    exit;
}

$requestedFile = realpath($publicRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, ltrim(rawurldecode($path), '/')));
if ($requestedFile !== false && str_starts_with($requestedFile, $publicRoot . DIRECTORY_SEPARATOR) && is_file($requestedFile)) {
    return false;
}

require $publicRoot . DIRECTORY_SEPARATOR . 'index.html';
