<?php
declare(strict_types=1);

namespace Ces;

use RuntimeException;

final class Http
{
    public static function json(array $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }

    public static function body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }

        try {
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new RuntimeException('Request body must contain valid JSON.', 400);
        }

        if (!is_array($data)) {
            throw new RuntimeException('Request body must be a JSON object.', 400);
        }

        return $data;
    }

    public static function requireCsrf(): void
    {
        $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $expected = $_SESSION['csrf_token'] ?? '';
        if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
            throw new RuntimeException('Your session token is invalid or expired. Refresh and try again.', 419);
        }
    }

    public static function user(): array
    {
        $user = $_SESSION['user'] ?? null;
        if (!is_array($user)) {
            throw new RuntimeException('Authentication is required.', 401);
        }

        return $user;
    }

    public static function requireRole(string ...$roles): array
    {
        $user = self::user();
        if (!in_array($user['role'], $roles, true)) {
            throw new RuntimeException('You are not allowed to perform this action.', 403);
        }

        return $user;
    }

    public static function positiveId(string $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            throw new RuntimeException('A valid record ID is required.', 400);
        }

        return $id;
    }
}
