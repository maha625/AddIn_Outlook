<?php
// Autoriser React
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Répondre immédiatement aux requêtes OPTIONS (pré-vol)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

header("Content-Type: application/json");
include "db.php";

try {
    $sql = "
        SELECT 
    c.username, 
    COUNT(cb.id) AS total_events
FROM clients c
LEFT JOIN client_buttons cb ON c.id = cb.client_id
GROUP BY c.username
ORDER BY total_events DESC;
    ";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(["success" => true, "data" => $data]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>