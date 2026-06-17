<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once "db.php";

try {

    // Total clients
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM clients
    ");
    $totalClients = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Total types d'événements
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM dolibarr_event_types
    ");
    $totalEventTypes = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Total boutons Outlook
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM client_buttons
    ");
    $totalButtons = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];

    echo json_encode([
        "success" => true,
        "totalClients" => $totalClients,
        "totalEventTypes" => $totalEventTypes,
        "totalButtons" => $totalButtons
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}