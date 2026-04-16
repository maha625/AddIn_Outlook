<?php
// backend_admin/getDolibarrEventTypes.php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function fail(string $msg, array $extra = []): void {
    echo json_encode(array_merge(["success" => false, "error" => $msg], $extra));
    exit;
}

include "db.php";

$client_id = $_GET['client_id'] ?? null;
if (!$client_id) {
    fail("client_id manquant");
}

// ── Fetch client credentials ──────────────────────────────────────────────────
$stmt = $conn->prepare(
    "SELECT dolibarr_url, dolibarr_api_key, default_dolibarr_type_code FROM clients WHERE id = ?"
);
$stmt->execute([$client_id]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    fail("Client introuvable");
}

$apiUrl = rtrim($client['dolibarr_url'], '/') . "/api/index.php/setup/dictionary/event_types";
$apiKey = $client['dolibarr_api_key'];

// ── Call Dolibarr ─────────────────────────────────────────────────────────────
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,            $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER,     [
    "Content-Type: application/json",
    "DOLAPIKEY: " . $apiKey
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT,        10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    fail("Erreur cURL", ["detail" => $curlErr]);
}

if ($httpCode !== 200) {
    fail("Dolibarr a répondu $httpCode", ["body" => $response]);
}

$types = json_decode($response, true);

if (!is_array($types)) {
    fail("Réponse Dolibarr invalide", ["raw" => substr($response, 0, 200)]);
}

// ── Normalise: keep only code + label ─────────────────────────────────────────
// Dolibarr returns objects like { "id":…, "code":"AC_TEL", "libelle":"Appel téléphonique", … }
$normalised = array_map(fn($t) => [
    "code"  => $t['code']    ?? $t['id'] ?? "?",
    "label" => $t['libelle'] ?? $t['label'] ?? ($t['code'] ?? "—"),
], $types);

echo json_encode([
    "success"      => true,
    "types"        => $normalised,
    "client_default" => $client['default_dolibarr_type_code'],
    "client_default" => $client['default_dolibarr_type_code'],
]);
?>