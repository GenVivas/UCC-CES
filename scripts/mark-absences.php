<?php
declare(strict_types=1);

require dirname(__DIR__) . '/app/Database.php';
$config = require dirname(__DIR__) . '/config/app.php';
date_default_timezone_set($config['timezone']);

use Ces\Database;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This command can only be run from the command line.\n");
    exit(1);
}

$db = Database::connection();
$dates = $db->prepare('SELECT id FROM event_dates WHERE event_date < ?');
$dates->execute([date('Y-m-d')]);
$insert = $db->prepare(
    "INSERT IGNORE INTO attendance (application_id, event_date_id, status)
     SELECT ea.id, ed.id, 'absent'
     FROM event_applications ea
     JOIN event_dates ed ON ed.event_id = ea.event_id
     WHERE ea.event_id = ? AND ed.id = ? AND ea.status = 'approved'"
);
$processed = 0;
foreach ($dates->fetchAll(PDO::FETCH_COLUMN) as $dateId) {
    $eventStatement = $db->prepare('SELECT event_id FROM event_dates WHERE id = ?');
    $eventStatement->execute([(int) $dateId]);
    $eventId = (int) $eventStatement->fetchColumn();
    $insert->execute([$eventId, (int) $dateId]);
    $processed += $insert->rowCount();
}
fwrite(STDOUT, sprintf("Recorded %d absent attendance record(s).\n", $processed));
