<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

include "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "error" => "Aucune donnée reçue"]);
    exit;
}

try {
    $conn->beginTransaction();

    // 1. Insertion du Client
    $hashedPassword = password_hash($data["password"], PASSWORD_DEFAULT);
    
    // Calcul du domaine si vide
    $domain = !empty($data["domain"]) ? $data["domain"] : substr(strrchr($data["email"], "@"), 1);

    $stmtClient = $conn->prepare("
        INSERT INTO clients 
        (site_number, email, dolibarr_url, token_url, username, password, dolibarr_api_key, domain, logo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmtClient->execute([
        $data["site_number"],
        $data["email"],
        $data["dolibarr_url"],
        $data["token_url"],
        $data["username"],
        $hashedPassword,
        $data["dolibarr_api_key"],
        $domain,
        $data["logo"]
    ]);

    $clientId = $conn->lastInsertId();

    // 2. Insertion des Boutons
    if (isset($data['buttons']) && is_array($data['buttons'])) {
        // AJUSTEMENT : On utilise les clés envoyées par le JS (bg_color, text_color, icon)
        $stmtBtn = $conn->prepare("
            INSERT INTO client_buttons (client_id, label, event_name, bg_color, text_color, icon) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        foreach ($data['buttons'] as $btn) {
            if (!empty($btn['label'])) {
                $stmtBtn->execute([
                    $clientId,
                    $btn['label'],
                    $btn['event_name'],
                    $btn['bg_color'] ?? '#2563eb',
                    $btn['text_color'] ?? '#ffffff',
                    $btn['icon'] ?? 'fas fa-tag'
                ]);
            }
        }
    }

    $conn->commit();

    echo json_encode([
        "success" => true, 
        "message" => "Client et boutons créés avec succès",
        "client_id" => $clientId
    ]);

} catch (PDOException $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    
    echo json_encode([
        "success" => false,
        "error" => "Erreur de base de données",
        "details" => $e->getMessage()
    ]);
}