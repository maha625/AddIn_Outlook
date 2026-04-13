<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include "db.php";

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;

if ($id) {
    try {
        // La suppression du client supprimera les boutons si tu as mis "ON DELETE CASCADE"
        // Sinon, supprime les boutons manuellement d'abord.
        $stmt = $conn->prepare("DELETE FROM clients WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}
?>