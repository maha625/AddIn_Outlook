<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

include "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['client_id']) || empty($data['buttons'])) {
    echo json_encode(["success" => false, "error" => "Données manquantes"]);
    exit;
}

try {
    // Préparation pour TOUS les champs de ta table
    $stmt = $conn->prepare("INSERT INTO client_buttons (client_id, label, event_name, bg_color, text_color, icon) VALUES (?, ?, ?, ?, ?, ?)");

    foreach ($data['buttons'] as $btn) {
        if (!empty($btn['label'])) {
            $stmt->execute([
                $data['client_id'],
                $btn['label'],
                $btn['event_name'],
                $btn['bg_color'] ?? '#2563eb',
                $btn['text_color'] ?? '#ffffff',
                $btn['icon'] ?? 'fas fa-tag'
            ]);
        }
    }

    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>