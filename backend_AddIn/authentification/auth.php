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

// 🔥 Extraire le domaine
$domain = substr(strrchr($email, "@"), 1);

// Chercher client par domaine
$stmt = $conn->prepare("SELECT * FROM clients WHERE domain = ?");
$stmt->execute([$domain]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(["error" => "Utilisateur non reconnu"]);
    exit;
}

// 1. Générer le token interne
$session_token = bin2hex(random_bytes(32));

// 2. MODIFICATION : Enregistrer ce token en base de données pour ce client
// Cela permettra de vérifier l'identité du client lors des prochains appels API
$updateStmt = $conn->prepare("UPDATE clients SET session_token = ? WHERE id = ?");
$updateStmt->execute([$session_token, $user['id']]);

// 3. Réponse SANS exposer API KEY
echo json_encode([
    "success" => true,
    "message" => "Utilisateur reconnu",
    "user" => [
        "id" => $user["id"],
        "domain" => $user["domain"],
        "logo" => $user["logo"]
    ],
    "session_token" => $session_token // On l'envoie à React pour qu'il le stocke
]);
?>