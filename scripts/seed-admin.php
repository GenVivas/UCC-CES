<?php
declare(strict_types=1);

require dirname(__DIR__) . '/app/Database.php';

use Ces\Database;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This command can only be run from the command line.\n");
    exit(1);
}

$email = 'admin@gmail.com';
$firstName = 'Genises';
$lastName = 'Vivas';
$contact = '09105175248';
$temporaryPassword = bin2hex(random_bytes(16));
$db = Database::connection();

try {
    $statement = $db->prepare(
        "INSERT INTO users (
            email, password_hash, password_change_required, role, account_status,
            first_name, last_name, contact_number
         ) VALUES (?, ?, 1, 'admin', 'approved', ?, ?, ?)"
    );
    $statement->execute([
        $email,
        password_hash($temporaryPassword, PASSWORD_DEFAULT),
        $firstName,
        $lastName,
        $contact,
    ]);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') {
        fwrite(STDERR, "An account with {$email} already exists. No account was changed.\n");
        exit(1);
    }
    throw $exception;
}

fwrite(STDOUT, "CES Admin account created.\n");
fwrite(STDOUT, "Email: {$email}\n");
fwrite(STDOUT, "Temporary password: {$temporaryPassword}\n");
fwrite(STDOUT, "Change this password immediately after your first sign-in.\n");
