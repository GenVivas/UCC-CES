<?php
declare(strict_types=1);

/**
 * CES Landing Page — contact_handler.php
 * Handles contact form submission.
 */

// Redirect if accessed directly without POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

$readInput = static fn (string $key): string => is_string($_POST[$key] ?? null)
    ? trim($_POST[$key])
    : '';

$firstName = $readInput('first_name');
$lastName = $readInput('last_name');
$email = $readInput('email');
$subject = $readInput('subject');
$message = $readInput('message');

$errors = [];

if ($firstName === '' || mb_strlen($firstName, 'UTF-8') > 100) {
    $errors[] = 'Enter a first name of no more than 100 characters.';
}
if ($lastName === '' || mb_strlen($lastName, 'UTF-8') > 100) {
    $errors[] = 'Enter a last name of no more than 100 characters.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    $errors[] = 'Enter a valid email address.';
}
if ($subject !== '' && !in_array($subject, [
    'Volunteer Inquiry',
    'Partnership Proposal',
    'Program Information',
    'General Inquiry',
], true)) {
    $errors[] = 'Select a valid subject.';
}
if ($message === '' || mb_strlen($message, 'UTF-8') > 5000) {
    $errors[] = 'Enter a message of no more than 5,000 characters.';
}

if ($errors !== []) {
    $errorMessage = rawurlencode(implode(' ', $errors));
    header("Location: index.php?status=error&msg={$errorMessage}#contact");
    exit;
}

$config = require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'app.php';
require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';

$subject = $subject !== '' ? $subject : 'General Inquiry';
$subjectLine = sprintf('[CES Website] %s — from %s %s', $subject, $firstName, $lastName);
$body = sprintf(
    "Name: %s %s\nEmail: %s\nSubject: %s\n\nMessage:\n%s",
    $firstName,
    $lastName,
    $email,
    $subject,
    $message
);

try {
    \Ces\NotificationService::sendRequired(
        $config['mail'],
        $config['contact_email'],
        'UCC CES',
        $subjectLine,
        $body
    );
} catch (RuntimeException $exception) {
    error_log('CES contact form delivery failed: ' . $exception->getMessage());
    header('Location: index.php?status=error&msg=' . rawurlencode('Your message could not be sent right now. Please try again later.') . '#contact');
    exit;
}

header('Location: index.php?status=success#contact');
exit;
