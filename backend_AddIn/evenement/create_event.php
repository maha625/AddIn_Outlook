<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Inclusion de la base de données
try {
    include(__DIR__ . "/../../backend_admin/db.php"); 
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => "Erreur de connexion base de données"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

// 1. Vérification des données reçues
if (!isset($data["session_token"]) || !isset($data["sender_email"])) {
    echo json_encode(["success" => false, "error" => "Données manquantes"]);
    exit;
}

$session_token = $data["session_token"];
$sender_email  = $data["sender_email"];
$email_body    = $data["email_body"] ?? "";
$subject       = $data["subject"] ?? "(Sans objet)";
$action_label  = $data["action_label"] ?? "Événement sans label";

// 2. Récupérer les accès Dolibarr via le token
$stmt = $conn->prepare("SELECT dolibarr_url, dolibarr_api_key FROM clients WHERE session_token = ?");
$stmt->execute([$session_token]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    echo json_encode(["success" => false, "error" => "Session invalide"]);
    exit;
}

$apiUrl = rtrim($client['dolibarr_url'], '/') . "/api/index.php/agendaevents";
$apiKey = $client['dolibarr_api_key'];

// 3. Préparer l'événement pour l'Agenda Dolibarr
$event_data = [
    "userownerid"  => 1,
    "label"        => $action_label, 
    "type_code"    => "AC_OTH",      
    "code"         => "AC_OTH",
    "note_private" => "Email reçu de : " . $sender_email . "\n\nObjet : " . $subject . "\n\nContenu :\n" . $email_body,
    "datep"        => time(),        
    "percentage"   => 0,             
    "priority"     => 1,
    "socid"        => $data["socid"] ?? null 
];

// 4. Appel cURL vers Dolibarr
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($event_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "DOLAPIKEY: " . $apiKey
]);

// CRUCIAL : Désactiver la vérification SSL pour le développement local
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// curl_close() est optionnel/obsolète sur PHP 8+, mais on peut le laisser ou l'enlever.
// Si tu as une erreur "Deprecated", supprime simplement la ligne suivante :
@curl_close($ch); 

// 5. Retour JSON avec débugging amélioré
if ($httpCode === 200 || $httpCode === 201) {
    echo json_encode([
        "success" => true,
        "message" => "Événement enregistré dans l'agenda",
        "event_id" => json_decode($response, true) // Dolibarr renvoie souvent l'ID créé
    ]);
} else {
    // Si ça échoue, on renvoie la réponse brute de Dolibarr pour comprendre pourquoi
    echo json_encode([
        "success" => false,
        "error"   => "Erreur API Dolibarr (Code: $httpCode)",
        "details" => json_decode($response, true) ?? $response,
        "debug_url" => $apiUrl
    ]);
}
?>