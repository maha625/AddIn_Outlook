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


    // Calcul du domaine si vide
    $domain = !empty($data["domain"]) ? $data["domain"] : substr(strrchr($data["email"], "@"), 1);

    // 2. Insertion du Client uniquement
    $stmtClient = $conn->prepare("
    INSERT INTO clients 
    (site_number, email, dolibarr_url, username, dolibarr_api_key, domain, logo, palette_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");
    $stmtClient->execute([
        $data["site_number"],
        $data["email"],
        $data["dolibarr_url"],
        $data["username"],
        $data["dolibarr_api_key"],
        $domain,
        $data["logo"],
        $data["palette_id"] ?? "default"
    ]);

    $clientId = $conn->lastInsertId();

    echo json_encode([
        "success" => true,
        "message" => "Client créé avec succès",
        "client_id" => $clientId
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "error" => "Erreur de base de données",
        "details" => $e->getMessage()
    ]);
}