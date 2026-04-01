<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
include "db.php";

try {
    // On sélectionne TOUS les champs importants
    $query = "SELECT id, site_number, email, domain, dolibarr_url, token_url, username, dolibarr_api_key, logo, created_at FROM clients ORDER BY id DESC";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>