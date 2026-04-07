<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Gestion du preflight (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include(__DIR__ . "/../../backend_admin/db.php"); 

$data = json_decode(file_get_contents("php://input"), true);

// 1. Vérification des données reçues de React
// On ajoute sender_email et email_body dans la vérification
if (!isset($data["session_token"]) || !isset($data["order_data"]) || !isset($data["sender_email"])) {
    echo json_encode(["error" => "Données manquantes (token, email ou commande)"]);
    exit;
}

$session_token = $data["session_token"];
$sender_email = $data["sender_email"];
$email_body = $data["email_body"] ?? "Corps de l'email non fourni";
$order = $data["order_data"]; 

// 2. Vérifier le session_token et récupérer les accès Dolibarr
$stmt = $conn->prepare("SELECT dolibarr_url, dolibarr_api_key FROM clients WHERE session_token = ?");
$stmt->execute([$session_token]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    echo json_encode(["error" => "Session invalide ou expirée"]);
    exit;
}

// Nettoyage de l'URL pour éviter les doubles slashs
$apiUrl = rtrim($client['dolibarr_url'], '/') . "/api/index.php/orders";
$apiKey = $client['dolibarr_api_key'];

// 3. Préparer les notes pour Dolibarr
// Note privée : Traçabilité complète de l'email original
$private_note = "--- COMMANDE REÇUE PAR EMAIL ---\n";
$private_note .= "Expéditeur : " . $sender_email . "\n";
$private_note .= "Message original :\n" . $email_body;

// 4. Préparer le corps de la commande
$dolibarr_order = [
    "socid" => $order["socid"],
    "type" => 0,
    "lines" => $order["lines"], // Doit être un tableau formaté pour Dolibarr
    "date" => time(),
    "note_public" => "Commande saisie via Diva Add-in (Email: $sender_email)",
    "note_private" => $private_note
];

// 5. Appel cURL vers l'API Dolibarr
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($dolibarr_order));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "DOLAPIKEY: " . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// 6. Réponse à l'Add-in React
if ($httpCode === 200 || $httpCode === 201) {
    echo json_encode([
        "success" => true, 
        "message" => "Commande créée avec succès dans Dolibarr",
        "dolibarr_response" => json_decode($response, true)
    ]);
} else {
    echo json_encode([
        "success" => false, 
        "error" => "Erreur Dolibarr (Code $httpCode)",
        "curl_error" => $curlError,
        "details" => json_decode($response, true)
    ]);
}
?>