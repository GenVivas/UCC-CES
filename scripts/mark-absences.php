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
$insert = $db->prepare(
    "INSERT IGNORE INTO attendance (application_id, event_date_id, status)
     SELECT ea.id, ed.id, 'absent'
     FROM event_applications ea
     JOIN event_dates ed ON ed.event_id = ea.event_id
     WHERE ed.event_date < ? AND ea.status = 'approved'"
);
$insert->execute([date('Y-m-d')]);
$processed = $insert->rowCount();
fwrite(STDOUT, sprintf("Recorded %d absent attendance record(s).\n", $processed));
