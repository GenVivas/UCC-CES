<?php
declare(strict_types=1);

require dirname(__DIR__) . '/app/Database.php';

use Ces\Database;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This command can only be run from the command line.\n");
    exit(1);
}

$email = strtolower(trim((string) readline('Admin email: ')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Enter a valid email address.\n");
    exit(1);
}
$password = (string) readline('Admin password (minimum 12 characters): ');
if (strlen($password) < 12) {
    fwrite(STDERR, "Password must be at least 12 characters.\n");
    exit(1);
}
$firstName = trim((string) readline('First name: '));
$lastName = trim((string) readline('Last name: '));
$contact = trim((string) readline('Contact number: '));
if ($firstName === '' || $lastName === '' || $contact === '') {
    fwrite(STDERR, "Name and contact number are required.\n");
    exit(1);
}

$db = Database::connection();
$statement = $db->prepare(
    "INSERT INTO users (email, password_hash, role, account_status, first_name, last_name, contact_number)
     VALUES (?, ?, 'admin', 'approved', ?, ?, ?)"
);
$statement->execute([$email, password_hash($password, PASSWORD_DEFAULT), $firstName, $lastName, $contact]);
fwrite(STDOUT, "CES Admin account created for {$email}.\n");
