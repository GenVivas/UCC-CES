<?php
declare(strict_types=1);

$scriptDirectory = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/')));
if (basename($scriptDirectory) === 'public') {
    $scriptDirectory = dirname($scriptDirectory);
}
$basePath = rtrim($scriptDirectory, '/.');
if ($basePath !== '' && $basePath[0] !== '/') {
    $basePath = '/' . $basePath;
}

$templatePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR . 'Views' . DIRECTORY_SEPARATOR . 'portal.html';
$template = file_get_contents($templatePath);
if ($template === false) {
    http_response_code(500);
    exit('The portal template is unavailable.');
}

header('Content-Type: text/html; charset=utf-8');
echo str_replace(
    '__CES_BASE_PATH__',
    htmlspecialchars($basePath, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
    $template
);
