<?php
declare(strict_types=1);

namespace Ces;

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;

final class NotificationService
{
    public static function send(array $config, string $address, string $name, string $subject, string $message): void
    {
        if ($config['host'] === '' || $config['from'] === '') {
            return;
        }

        try {
            self::deliver($config, $address, $name, $subject, $message);
        } catch (MailException $exception) {
            error_log(sprintf('UCC-CES email delivery failed for %s: %s', $address, $exception->getMessage()));
        }
    }

    public static function sendRequired(array $config, string $address, string $name, string $subject, string $message): void
    {
        if ($config['host'] === '' || $config['from'] === '') {
            throw new RuntimeException('Password recovery email is not configured. Contact the CES administrator.', 503);
        }

        try {
            self::deliver($config, $address, $name, $subject, $message);
        } catch (MailException $exception) {
            error_log(sprintf('UCC-CES password recovery email failed for %s: %s', $address, $exception->getMessage()));
            throw new RuntimeException('The verification email could not be sent. Try again later.', 503, $exception);
        }
    }

    private static function deliver(array $config, string $address, string $name, string $subject, string $message): void
    {
        $mailer = new PHPMailer(true);
        try {
            $mailer->isSMTP();
            $mailer->Host = $config['host'];
            $mailer->Port = (int) $config['port'];
            $mailer->SMTPAuth = $config['username'] !== '';
            $mailer->Username = $config['username'];
            $mailer->Password = $config['password'];
            $mailer->Timeout = 10;
            $mailer->CharSet = 'UTF-8';
            if ($config['encryption'] === 'ssl') {
                $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($config['encryption'] === 'tls') {
                $mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }
            $mailer->setFrom($config['from'], $config['from_name']);
            $mailer->addAddress($address, $name);
            $mailer->Subject = $subject;
            $mailer->Body = $message;
            $mailer->send();
        } catch (MailException $exception) {
            throw $exception;
        }
    }
}
