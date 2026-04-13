<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
include "db.php";

$id = $_GET['id'];

if (!$id) {
    echo json_encode(["success" => false, "error" => "ID manquant"]);
    exit;
}

try {
    // 1. Récupérer les infos du client
    $stmt = $conn->prepare("SELECT * FROM clients WHERE id = ?");
    $stmt->execute([$id]);
    $client = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$client) {
        echo json_encode(["success" => false, "error" => "Client introuvable"]);
        exit;
    }

    // 2. Récupérer ses boutons personnalisés
    $stmtBtn = $conn->prepare("SELECT label, event_name, bg_color, text_color, icon FROM client_buttons WHERE client_id = ?");
    $stmtBtn->execute([$id]);
    $buttons = $stmtBtn->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true, 
        "client" => $client, 
        "buttons" => $buttons
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}