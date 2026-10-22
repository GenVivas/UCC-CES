<?php
declare(strict_types=1);

try {
    require dirname(__DIR__) . '/app/bootstrap.php';
    (new \Ces\Controllers\ApiController())->dispatch();
} catch (Throwable $exception) {
    error_log(sprintf('API bootstrap failed: %s in %s:%d', $exception->getMessage(), $exception->getFile(), $exception->getLine()));
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'The service is temporarily unavailable. Check the application configuration.']);
}
