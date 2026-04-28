<?php
ini_set('display_errors', 0);
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "db.php";

// Plus besoin de client_id — types globaux
$stmt  = $conn->query("SELECT code, label FROM dolibarr_event_types ORDER BY label");
$types = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["success" => true, "types" => $types]);
?>