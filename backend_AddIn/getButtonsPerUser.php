<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include(__DIR__ . "/../backend_admin/db.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['session_token']) || empty($data['session_token'])) {
    echo json_encode(["success" => false, "error" => "session_token requis"]);
    exit;
}

$session_token = $data['session_token'];

try {
    $stmt = $conn->prepare("SELECT id FROM clients WHERE session_token = ?");
    $stmt->execute([$session_token]);
    $client = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$client) {
        echo json_encode(["success" => false, "error" => "Session invalide"]);
        exit;
    }

    $buttonStmt = $conn->prepare("SELECT id, client_id, label, event_name, bg_color, text_color, icon FROM client_buttons WHERE client_id = ? ORDER BY id ASC");
    $buttonStmt->execute([$client['id']]);
    $buttons = $buttonStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "buttons" => $buttons]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => "Erreur serveur : " . $e->getMessage()]);
}
?>