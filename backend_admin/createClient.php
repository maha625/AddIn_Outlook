<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "db.php";

// Lire JSON
$data = json_decode(file_get_contents("php://input"), true);

// Vérification
if (!$data) {
    echo json_encode(["error" => "Aucune donnée reçue"]);
    exit;
}

// Domain auto si vide
if (empty($data["domain"]) && !empty($data["email"])) {
    $data["domain"] = substr(strrchr($data["email"], "@"), 1);
}

// Champs requis
$requiredFields = [
    "site_number",
    "email",
    "dolibarr_url",
    "token_url",
    "username",
    "password",
    "dolibarr_api_key",
    "domain",
    "logo"
];

foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || $data[$field] === "") {
        echo json_encode(["error" => "Champ vide: $field"]);
        exit;
    }
}

// Hash password
$hashedPassword = password_hash($data["password"], PASSWORD_DEFAULT);

// Insert
$stmt = $conn->prepare("
INSERT INTO clients 
(site_number, email, dolibarr_url, token_url, username, password, dolibarr_api_key, domain, logo)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
");

try {
    $stmt->execute([
        $data["site_number"],
        $data["email"],
        $data["dolibarr_url"],
        $data["token_url"],
        $data["username"],
        $hashedPassword,
        $data["dolibarr_api_key"],
        $data["domain"],
        $data["logo"]
    ]);

    echo json_encode(["success" => true]);

} catch (PDOException $e) {
    echo json_encode([
        "error" => "Erreur SQL",
        "details" => $e->getMessage()
    ]);
}