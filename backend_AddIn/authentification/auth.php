<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
include(__DIR__ . "/../../backend_admin/db.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["email"])) {
    echo json_encode(["error" => "Email requis"]);
    exit;
}

$email = $data["email"];
$domain = substr(strrchr($email, "@"), 1);

$stmt = $conn->prepare("SELECT * FROM clients WHERE domain = ?");
$stmt->execute([$domain]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);  // ← utiliser $user partout, pas $client

if (!$user) {
    echo json_encode(["success" => false, "error" => "Utilisateur non reconnu"]);
    exit;
}

// Charger la palette
$palettes = json_decode(file_get_contents(__DIR__ . "/../../backend_admin/palettes.json"), true);
$palette = array_values(array_filter($palettes, fn($p) => $p['id'] === ($user['palette_id'] ?? 'default')))[0] ?? $palettes[0];

// Générer et sauvegarder le token
$session_token = bin2hex(random_bytes(32));
$updateStmt = $conn->prepare("UPDATE clients SET session_token = ? WHERE id = ?");
$updateStmt->execute([$session_token, $user['id']]);

echo json_encode([
    "success" => true,
    "session_token" => $session_token,   // ← $session_token pas $sessionToken
    "message" => "Utilisateur reconnu",
    "user" => [
        "id"      => $user['id'],
        "domain"  => $user['domain'],
        "logo"    => $user['logo'],
        "palette" => $palette
    ]
]);
?>