<?php
// backend_AddIn/evenement/create_event.php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function fail(string $msg, array $extra = []): void {
    $log = "[Diva][" . date('Y-m-d H:i:s') . "] ERREUR : $msg";
    if (!empty($extra)) $log .= " | " . json_encode($extra, JSON_UNESCAPED_UNICODE);
    error_log($log);
    echo json_encode(array_merge(["success" => false, "error" => $msg], $extra));
    exit;
}

try {
    include(__DIR__ . "/../../backend_admin/db.php");
} catch (Exception $e) {
    fail("Erreur de connexion BD", ["detail" => $e->getMessage()]);
}

$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);

error_log("[Diva] Body reçu (tronqué) : " . substr($raw, 0, 300));

if (json_last_error() !== JSON_ERROR_NONE) {
    fail("JSON invalide", ["json_error" => json_last_error_msg()]);
}

if (!isset($data["session_token"]) || !isset($data["sender_email"])) {
    fail("Données manquantes", ["keys_present" => array_keys($data ?? [])]);
}

$session_token = $data["session_token"];
$user_email    = $data["user_email"]   ?? "Non précisé";
$sender_email  = $data["sender_email"];
$email_body    = base64_decode($data["email_body"] ?? "");
$subject       = $data["subject"]      ?? "(Sans objet)";
$action_label  = $data["action_label"] ?? "Événement";
$attachments   = $data["attachments"]  ?? [];

// The add-in passes the button's stored type code (may be null/absent for old clients)
$button_type_code = $data["dolibarr_type_code"] ?? null;

error_log("[Diva] session_token=$session_token | subject=$subject | PJ=" . count($attachments) . " | button_type_code=" . ($button_type_code ?? "null"));

// ── Fetch client — include default_dolibarr_type_code ────────────────────────
$stmt = $conn->prepare(
    "SELECT dolibarr_url, dolibarr_api_key, default_dolibarr_type_code
     FROM clients WHERE session_token = ?"
);
$stmt->execute([$session_token]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    fail("Session invalide", ["token" => substr($session_token, 0, 10) . "..."]);
}

error_log("[Diva] Client trouvé : " . $client['dolibarr_url']);

// ── 3-level type code resolution ─────────────────────────────────────────────
// 1. Button's own code   → highest priority
// 2. Client-level default → if button has none
// 3. AC_OTH              → universal fallback
$type_code = $button_type_code
          ?? $client['default_dolibarr_type_code']
          ?? 'AC_OTH';

error_log("[Diva] type_code résolu : $type_code");

$apiUrl = rtrim($client['dolibarr_url'], '/') . "/api/index.php/agendaevents";
$apiKey = $client['dolibarr_api_key'];

// ── Build note ────────────────────────────────────────────────────────────────
$note  = "--- TRAÇABILITÉ ADD-IN ---\n";
$note .= "Action effectuée par : " . $user_email . "\n";
$note .= "Email reçu de : "        . $sender_email . "\n";
$note .= "Objet : "                 . $subject . "\n";
$note .= "------------------------\n\n";
$note .= "CONTENU DE L'EMAIL :\n"  . $email_body;

$event_data = [
    "userownerid"  => 1,
    "label"        => "[" . $action_label . "] " . $subject,
    "type_code"    => $type_code,
    "code"         => $type_code,
    "note_private" => $note,
    "datep"        => time(),
    "percentage"   => 0,
    "priority"     => 1,
];

// ── Create event ──────────────────────────────────────────────────────────────
error_log("[Diva] POST événement → $apiUrl | type=$type_code");

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,            $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST,           true);
curl_setopt($ch, CURLOPT_POSTFIELDS,     json_encode($event_data));
curl_setopt($ch, CURLOPT_HTTPHEADER,     [
    "Content-Type: application/json",
    "DOLAPIKEY: " . $apiKey
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

error_log("[Diva] Réponse événement HTTP=$httpCode | body=" . substr($response, 0, 200));

if ($curlErr) {
    fail("Erreur cURL événement", ["curl_error" => $curlErr]);
}

if ($httpCode !== 200 && $httpCode !== 201) {
    fail("Erreur Dolibarr création événement ($httpCode)", [
        "details" => json_decode($response, true) ?? $response
    ]);
}

$event_id      = json_decode($response, true);
$uploaded      = 0;
$upload_errors = [];

error_log("[Diva] Événement créé, ID=$event_id | Upload de " . count($attachments) . " PJ");

// ── Upload attachments ────────────────────────────────────────────────────────
foreach ($attachments as $index => $attachment) {
    $filename    = basename($attachment["name"]    ?? "fichier");
    $fileContent = $attachment["content"]          ?? "";
    $contentType = $attachment["contentType"]      ?? "application/octet-stream";

    error_log("[Diva] PJ[$index] : $filename | type=$contentType | taille=" . strlen($fileContent));

    if (empty($fileContent)) {
        error_log("[Diva] PJ[$index] ignorée : contenu vide");
        continue;
    }

    $upload_payload = [
        "filename"    => $filename,
        "modulepart"  => "agenda",
        "ref"         => (string)$event_id,
        "filecontent" => $fileContent,
        "overwrite"   => "0",
    ];

    $upload_url = rtrim($client['dolibarr_url'], '/') . "/api/index.php/documents/upload";

    $ch2 = curl_init();
    curl_setopt($ch2, CURLOPT_URL,            $upload_url);
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch2, CURLOPT_POST,           true);
    curl_setopt($ch2, CURLOPT_POSTFIELDS,     json_encode($upload_payload));
    curl_setopt($ch2, CURLOPT_HTTPHEADER,     [
        "Content-Type: application/json",
        "DOLAPIKEY: " . $apiKey
    ]);
    curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch2, CURLOPT_SSL_VERIFYHOST, false);

    $upload_response = curl_exec($ch2);
    $upload_code     = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    $curlErr2        = curl_error($ch2);
    curl_close($ch2);

    error_log("[Diva] Upload PJ[$index] HTTP=$upload_code | body=" . substr($upload_response, 0, 200));

    if ($curlErr2) {
        $upload_errors[] = ["file" => $filename, "code" => 0, "detail" => $curlErr2];
        continue;
    }

    if ($upload_code === 200 || $upload_code === 201) {
        $uploaded++;
    } else {
        $upload_errors[] = [
            "file"   => $filename,
            "code"   => $upload_code,
            "detail" => json_decode($upload_response, true) ?? $upload_response,
        ];
        error_log("[Diva] Échec upload PJ[$index] '$filename' HTTP=$upload_code : $upload_response");
    }
}

// ── Final response ────────────────────────────────────────────────────────────
error_log("[Diva] Terminé. type=$type_code | uploaded=$uploaded | errors=" . count($upload_errors));

echo json_encode([
    "success"           => true,
    "message"           => "Événement enregistré",
    "event_id"          => $event_id,
    "type_code_used"    => $type_code,
    "attachments_sent"  => $uploaded,
    "attachment_errors" => $upload_errors,
]);
?>