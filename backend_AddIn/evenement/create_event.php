<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    include(__DIR__ . "/../../backend_admin/db.php"); 
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => "Erreur de connexion BD"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["session_token"]) || !isset($data["sender_email"])) {
    echo json_encode(["success" => false, "error" => "Données manquantes"]);
    exit;
}

$session_token = $data["session_token"];
$user_email    = $data["user_email"] ?? "Non précisé"; // Email de l'utilisateur de l'Add-in
$sender_email  = $data["sender_email"];              // Expéditeur de l'email Outlook
// Dans votre fichier PHP
$email_body_encoded = $data["email_body"] ?? "";
// On décode le Base64 pour retrouver le texte original
$email_body = base64_decode($email_body_encoded);
$subject       = $data["subject"] ?? "(Sans objet)";
$action_label  = $data["action_label"] ?? "Événement";

// Récupérer les accès Dolibarr
$stmt = $conn->prepare("SELECT dolibarr_url, dolibarr_api_key FROM clients WHERE session_token = ?");
$stmt->execute([$session_token]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    echo json_encode(["success" => false, "error" => "Session invalide"]);
    exit;
}

$apiUrl = rtrim($client['dolibarr_url'], '/') . "/api/index.php/agendaevents";
$apiKey = $client['dolibarr_api_key'];

// Construction de la note avec traçabilité de l'utilisateur de l'add-in
$note = "--- TRAÇABILITÉ ADD-IN ---\n";
$note .= "Action effectuée par : " . $user_email . "\n";
$note .= "Email reçu de : " . $sender_email . "\n";
$note .= "Objet : " . $subject . "\n";
$note .= "------------------------\n\n";
$note .= "CONTENU DE L'EMAIL :\n" . $email_body;

$event_data = [
    "userownerid"  => 1,
    "label"        => "[" . $action_label . "] " . $subject, 
    "type_code"    => "AC_OTH",      
    "code"         => "AC_OTH",
    "note_private" => $note,
    "datep"        => time(),        
    "percentage"   => 0,             
    "priority"     => 1
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($event_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "DOLAPIKEY: " . $apiKey
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
@curl_close($ch); 

if ($httpCode === 200 || $httpCode === 201) {
    echo json_encode([
        "success" => true,
        "message" => "Événement enregistré",
        "event_id" => json_decode($response, true)
    ]);
} else {
    echo json_encode([
        "success" => false,
        "error"   => "Erreur Dolibarr ($httpCode)",
        "details" => json_decode($response, true) ?? $response
    ]);
}
?>