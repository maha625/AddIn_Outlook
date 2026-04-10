<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include(__DIR__ . "/../../backend_admin/db.php"); 

$data = json_decode(file_get_contents("php://input"), true);

// 1. Vérification
if (!isset($data["session_token"]) || !isset($data["sender_email"])) {
    echo json_encode(["error" => "Données manquantes"]);
    exit;
}

$session_token = $data["session_token"];
$sender_email = $data["sender_email"];
$email_body = $data["email_body"] ?? "";
$subject = $data["subject"] ?? "Demande d'information sans objet";

// 2. Récupérer les accès Dolibarr via le token
$stmt = $conn->prepare("SELECT dolibarr_url, dolibarr_api_key FROM clients WHERE session_token = ?");
$stmt->execute([$session_token]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    echo json_encode(["error" => "Session invalide"]);
    exit;
}

$apiUrl = rtrim($client['dolibarr_url'], '/') . "/api/index.php/agendaevents";
$apiKey = $client['dolibarr_api_key'];

// 3. Préparer l'événement pour l'Agenda Dolibarr
$event_data = [
    "userownerid" => 1,
    "label" => "DEMANDE INFO : " . $subject,
    "type_code" => "AC_OTH", // Type d'action (Autre)
    "code" => "AC_OTH",
    "note_private" => "Email reçu de : " . $sender_email . "\n\nContenu :\n" . $email_body,
    "datep" => time(), // Date de début (maintenant)
    "percentage" => 0,  // Statut "À faire"
    "priority" => 1,
    "socid" => $data["socid"] ?? null // Optionnel : lier à un tiers si vous avez son ID
];

// 4. Appel cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($event_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "DOLAPIKEY: " . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 || $httpCode === 201) {
    echo json_encode(["success" => true, "message" => "Demande d'information enregistrée dans l'agenda"]);
} else {
    echo json_encode(["success" => false, "error" => "Erreur Dolibarr", "details" => json_decode($response, true)]);
}
?>