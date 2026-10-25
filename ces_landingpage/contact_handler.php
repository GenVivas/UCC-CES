<?php
/**
 * CES Landing Page — contact_handler.php
 * Handles contact form submission.
 */

// Redirect if accessed directly without POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

// Sanitize & validate inputs
$first_name = trim(htmlspecialchars($_POST['first_name'] ?? ''));
$last_name  = trim(htmlspecialchars($_POST['last_name']  ?? ''));
$email      = trim(filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL));
$subject    = trim(htmlspecialchars($_POST['subject']    ?? ''));
$message    = trim(htmlspecialchars($_POST['message']    ?? ''));

$errors = [];

if (empty($first_name)) $errors[] = "First name is required.";
if (empty($last_name))  $errors[] = "Last name is required.";
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "A valid email address is required.";
if (empty($message))    $errors[] = "Message cannot be empty.";

if (!empty($errors)) {
    // Redirect back with error flag
    $error_msg = urlencode(implode(' ', $errors));
    header("Location: index.php?status=error&msg={$error_msg}#contact");
    exit;
}

// --- Send email (configure recipient below) ---
$to      = 'ces@ucc.edu.ph'; // TODO: replace with actual CES email
$subject_line = "[CES Website] {$subject} — from {$first_name} {$last_name}";
$body    = "Name:    {$first_name} {$last_name}\n"
         . "Email:   {$email}\n"
         . "Subject: {$subject}\n\n"
         . "Message:\n{$message}";
$headers = "From: {$first_name} {$last_name} <{$email}>\r\n"
         . "Reply-To: {$email}\r\n"
         . "X-Mailer: PHP/" . phpversion();

// Uncomment to actually send mail on a configured server:
// mail($to, $subject_line, $body, $headers);

// Redirect back with success flag
header("Location: index.php?status=success#contact");
exit;
