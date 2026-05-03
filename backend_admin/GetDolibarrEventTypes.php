<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

include "db.php";

// On récupère l'ID du client depuis l'URL
$client_id = $_GET['client_id'] ?? null;

try {
    // La requête sélectionne les types actifs liés à l'ID OU ceux dont le client_id est NULL
    $query = "SELECT code, libelle AS label 
              FROM dolibarr_event_types 
              WHERE active = 1 
              AND (fk_user = ? OR fk_user IS NULL) 
              ORDER BY libelle ASC";
              
    $stmt = $conn->prepare($query);
    $stmt->execute([$client_id]);
    
    $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "types" => $types
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>