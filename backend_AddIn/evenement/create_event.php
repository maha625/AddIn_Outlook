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

/**
 * Fonction pour retourner une erreur JSON et arrêter le script
 */
function fail(string $msg, array $extra = []): void {
    error_log("[Diva] ERREUR : $msg");
    echo json_encode(array_merge(["success" => false, "error" => $msg], $extra));
    exit;
}

try {
    // Connexion à la base de données centrale pour récupérer les accès Dolibarr
    include(__DIR__ . "/../../backend_admin/db.php");
} catch (Exception $e) {
    fail("Erreur de connexion BD", ["detail" => $e->getMessage()]);
}

// Récupération des données JSON envoyées par le taskpane.ts
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!isset($data["session_token"]) || !isset($data["sender_email"])) {
    fail("Données manquantes (session ou email)");
}

// Extraction des variables
$session_token    = $data["session_token"];
$user_email       = $data["user_email"]         ?? "Non précisé";
$sender_email     = $data["sender_email"];
$email_body       = base64_decode($data["email_body"] ?? "");
$subject          = $data["subject"]            ?? "(Sans objet)";
$action_label     = $data["action_label"]       ?? "Événement";
$attachments      = $data["attachments"]         ?? [];
$button_type_code = $data["dolibarr_type_code"] ?? null;
$socid            = $data["socid"]              ?? null;
// Récupération de l'ID de l'événement parent (si sélectionné dans la liste déroulante)
$parent_event_id  = $data["parent_event_id"]    ?? null;

// 1. Récupération des paramètres API Dolibarr pour ce client
$stmt = $conn->prepare("SELECT dolibarr_url, dolibarr_api_key FROM clients WHERE session_token = ?");
$stmt->execute([$session_token]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) fail("Session invalide ou client non trouvé");

$baseUrl   = rtrim($client['dolibarr_url'], '/');
$apiKey    = $client['dolibarr_api_key'];
$type_code = !empty($button_type_code) ? $button_type_code : 'AC_OTH';

// ── ÉTAPE 1 : Création de l'événement dans l'Agenda Dolibarr ────────────────
$event_data = [
    "userownerid"  => 1, // ID de l'utilisateur propriétaire dans Dolibarr
    "label"        => "[" . $action_label . "] " . $subject,
    "type_code"    => $type_code,
    "code"         => $type_code,
    "note_private" => "Email archivé avec pièces jointes natives via l'Add-in.",
    "datep"        => time(),
    "percentage"   => 0,
    "priority"     => 1,
    "socid"        => $socid,
    // On stocke l'ID de l'événement parent dans le champ "Lieu" (location)
    "location"     => $parent_event_id ? (string)$parent_event_id : ""
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,            $baseUrl . "/api/index.php/agendaevents");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST,           true);
curl_setopt($ch, CURLOPT_POSTFIELDS,     json_encode($event_data));
curl_setopt($ch, CURLOPT_HTTPHEADER,     ["Content-Type: application/json", "DOLAPIKEY: $apiKey"]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 && $httpCode !== 201) {
    fail("Erreur lors de la création de l'événement (Code: $httpCode)");
}

$event_id = (int) json_decode($response, true);
if ($event_id <= 0) fail("ID d'événement invalide retourné par Dolibarr");

// ── ÉTAPE 2 : Construction du fichier EML (Email complet avec PJ) ───────────
$boundary = "----=_Part_" . md5(time());
$safe_date = date('r');

// Headers de l'EML
$eml = "From: <{$sender_email}>\r\n";
$eml .= "To: <{$user_email}>\r\n";
$eml .= "Subject: {$subject}\r\n";
$eml .= "Date: {$safe_date}\r\n";
$eml .= "MIME-Version: 1.0\r\n";
$eml .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n\r\n";

// Partie HTML de l'email
$eml .= "--{$boundary}\r\n";
$eml .= "Content-Type: text/html; charset=UTF-8\r\n";
$eml .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$eml .= "<html><body>";
$eml .= "<div style='background:#f4f4f4; padding:10px; border:1px solid #ddd; font-family:sans-serif;'>";
$eml .= "<strong>Archivé par :</strong> {$user_email}<br>";
$eml .= "<strong>Date d'archivage :</strong> " . date('d/m/Y H:i') . "</div>";
$eml .= "<div style='margin-top:20px;'>{$email_body}</div>";
$eml .= "</body></html>\r\n\r\n";

// Ajout des pièces jointes reçues d'Outlook
foreach ($attachments as $att) {
    $name    = $att["name"] ?? "fichier_joint";
    $content = $att["content"] ?? ""; // Base64 envoyé par taskpane.ts
    $type    = $att["contentType"] ?? "application/octet-stream";
    
    if (empty($content)) continue;

    $eml .= "--{$boundary}\r\n";
    $eml .= "Content-Type: {$type}; name=\"{$name}\"\r\n";
    $eml .= "Content-Transfer-Encoding: base64\r\n";
    $eml .= "Content-Disposition: attachment; filename=\"{$name}\"\r\n\r\n";
    $eml .= chunk_split($content) . "\r\n";
}

$eml .= "--{$boundary}--";

// Préparation du fichier pour l'upload
$safe_filename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', substr($subject, 0, 50)) . ".eml";
$base64_eml = base64_encode($eml);

// ── ÉTAPE 3 : Upload du fichier EML vers l'événement créé ───────────────────
$upload_payload = [
    "filename"          => $safe_filename,
    "modulepart"        => "agenda",
    "ref"               => (string)$event_id,
    "filecontent"       => $base64_eml,
    "fileencoding"      => "base64",
    "overwriteifexists" => "1",
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,            $baseUrl . "/api/index.php/documents/upload");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST,           true);
curl_setopt($ch, CURLOPT_POSTFIELDS,     json_encode($upload_payload));
curl_setopt($ch, CURLOPT_HTTPHEADER,     ["Content-Type: application/json", "DOLAPIKEY: $apiKey"]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res_upload = curl_exec($ch);
$up_code    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// ── RÉPONSE FINALE ──────────────────────────────────────────────────────────
echo json_encode([
    "success"  => ($up_code == 200 || $up_code == 201),
    "event_id" => $event_id,
    "parent"   => $parent_event_id,
    "filename" => $safe_filename
]);
?>