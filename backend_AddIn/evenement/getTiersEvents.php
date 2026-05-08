<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include(__DIR__ . "/../../backend_admin/db.php");

$data = json_decode(file_get_contents("php://input"), true);
$socid = $data['socid'] ?? null;
$session_token = $data['session_token'] ?? null;

if (!$socid || !$session_token) {
    echo json_encode(["success" => false, "error" => "socid ou session_token manquant"]);
    exit;
}

// 1. Récupération des accès Dolibarr du client
$stmt = $conn->prepare("SELECT dolibarr_url, dolibarr_api_key FROM clients WHERE session_token = ?");
$stmt->execute([$session_token]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    echo json_encode(["success" => false, "error" => "Session invalide"]);
    exit;
}

$baseUrl = rtrim($client['dolibarr_url'], '/');
$apiKey = $client['dolibarr_api_key'];

// 2. Construction du filtre pour l'API
// On filtre sur 'socid' car c'est le champ présent dans votre exemple JSON
$filters = rawurlencode("(t.fk_soc:=:" . $socid . ")");
$apiUrl = $baseUrl . "/api/index.php/agendaevents?sortfield=t.datep&sortorder=DESC&limit=100&sqlfilters=" . $filters;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "DOLAPIKEY: " . $apiKey
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $events = json_decode($response, true);
    
    // Si l'API renvoie un objet d'erreur au lieu d'une liste
    if (isset($events['error'])) {
        echo json_encode(["success" => true, "events" => []]);
        exit;
    }

    // 3. Formatage pour le frontend Outlook
    $formattedEvents = array_map(function($ev) {
        return [
            "id"    => $ev['id'],
            "label" => $ev['label'],
            // Utilisation de datep (timestamp) comme dans votre exemple
            "date_event" => isset($ev['datep']) ? date('Y-m-d', $ev['datep']) : null 
        ];
    }, $events);

    echo json_encode(["success" => true, "events" => $formattedEvents]);
} else {
    echo json_encode(["success" => false, "error" => "Erreur API Dolibarr (Code: $httpCode)"]);
}