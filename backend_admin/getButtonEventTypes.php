<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "db.php";

try {
    // On récupère tous les boutons avec leurs types d'événements possibles
    $stmt = $conn->prepare("
        SELECT b.action_key, b.label AS button_label,
               et.id AS event_type_id, et.code AS event_code, et.label AS event_label
        FROM button_event_types bet
        JOIN buttons b ON bet.button_action_key = b.action_key
        JOIN event_types et ON bet.event_type_id = et.id
        ORDER BY b.action_key, et.id
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Structurer la réponse par bouton
    $result = [];
    foreach ($rows as $row) {
        $key = $row["action_key"];
        if (!isset($result[$key])) {
            $result[$key] = [
                "label" => $row["button_label"],
                "event_types" => []
            ];
        }
        $result[$key]["event_types"][] = [
            "id" => $row["event_type_id"],
            "code" => $row["event_code"],
            "label" => $row["event_label"]
        ];
    }

    echo json_encode($result);

} catch (PDOException $e) {
    echo json_encode(["error" => "Erreur SQL", "details" => $e->getMessage()]);
}
?>
