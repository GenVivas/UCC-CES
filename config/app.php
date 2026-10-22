<?php
declare(strict_types=1);

$config = [
    'name' => 'UCC-CES',
    'timezone' => 'Asia/Manila',
    'base_path' => '',
    'app_key' => getenv('CES_APP_KEY') ?: '',
    'database' => [
        'host' => getenv('CES_DB_HOST') ?: '127.0.0.1',
        'port' => getenv('CES_DB_PORT') ?: '3306',
        'name' => getenv('CES_DB_NAME') ?: 'ucc_ces_portal',
        'user' => getenv('CES_DB_USER') ?: 'root',
        'password' => getenv('CES_DB_PASSWORD') ?: '',
    ],
    'uploads_path' => dirname(__DIR__) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads',
    'max_upload_bytes' => 10 * 1024 * 1024,
    'allowed_upload_mimes' => [
        'application/pdf',
        'image/jpeg',
        'image/png',
    ],
    'mail' => [
        'host' => getenv('CES_SMTP_HOST') ?: '',
        'port' => (int) (getenv('CES_SMTP_PORT') ?: 587),
        'username' => getenv('CES_SMTP_USERNAME') ?: '',
        'password' => getenv('CES_SMTP_PASSWORD') ?: '',
        'encryption' => strtolower(getenv('CES_SMTP_ENCRYPTION') ?: 'tls'),
        'from' => getenv('CES_SMTP_FROM') ?: '',
        'from_name' => getenv('CES_SMTP_FROM_NAME') ?: 'UCC-CES',
    ],
];

$localConfigPath = __DIR__ . DIRECTORY_SEPARATOR . 'local.php';
if (is_file($localConfigPath)) {
    $localConfig = require $localConfigPath;
    if (!is_array($localConfig)) {
        throw new RuntimeException('config/local.php must return a configuration array.');
    }
    $config = array_replace_recursive($config, $localConfig);
}

return $config;
