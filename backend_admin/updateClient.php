<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
    exit;
include "db.php";
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id']) || empty($data['id'])) {
    echo json_encode(["success" => false, "error" => "ID client manquant"]);
    exit;
}

$id = (int) $data['id'];

try {
    $conn->beginTransaction();

    // 1. Mise à jour des informations générales
    // Dans le UPDATE, ajouter palette_id = ? :
    $stmt = $conn->prepare("
    UPDATE `clients` SET 
        `email` = ?, `domain` = ?, `site_number` = ?, `dolibarr_url` = ?, 
        `dolibarr_api_key` = ?, `username` = ?, `logo` = ?, `palette_id` = ?
    WHERE `id` = ?
");
    $stmt->execute([
        $data['email'] ?? '',
        $data['domain'] ?? '',
        $data['site_number'] ?? '',
        $data['dolibarr_url'] ?? '',
        $data['dolibarr_api_key'] ?? '',
        $data['username'] ?? '',
        $data['logo'] ?? '',
        $data['palette_id'] ?? 'default',
        $id
    ]);

    // 2. Suppression des anciens boutons (L'ERREUR VENAIT D'ICI)
    // On s'assure que le mot DELETE est bien présent et qu'il n'y a pas de virgule parasite
    $sqlDelete = "DELETE FROM `client_buttons` WHERE `client_id` = ?";
    $stmtDel = $conn->prepare($sqlDelete);
    $stmtDel->execute([$id]);

    // 3. Insertion des nouveaux boutons
    if (!empty($data['buttons']) && is_array($data['buttons'])) {

        $columns = "(`client_id`, `label`, `bg_color`, `text_color`, `icon`, `dolibarr_type_code`, `allow_linked_events`)";
        $placeholders = implode(', ', array_fill(0, count($data['buttons']), "(?, ?, ?, ?, ?, ?, ?)"));

        $sqlIns = "INSERT INTO `client_buttons` $columns VALUES $placeholders";

        $values = [];
        foreach ($data['buttons'] as $btn) {
            $values[] = $id;
            $values[] = $btn['label'] ?? 'Bouton';
            $values[] = $btn['bg_color'] ?? '#2563eb';
            $values[] = $btn['text_color'] ?? '#ffffff';
            $values[] = $btn['icon'] ?? 'fas fa-tag';
            $values[] = (!empty($btn['dolibarr_type_code'])) ? $btn['dolibarr_type_code'] : null;
            // On récupère la valeur de la case à cocher (1 pour true, 0 pour false)
            $values[] = !empty($btn['allow_linked_events']) ? 1 : 0;
        }

        $stmtIns = $conn->prepare($sqlIns);
        $stmtIns->execute($values);
    }

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Mise à jour réussie"]);

} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }

    echo json_encode([
        "success" => false,
        "error" => "Erreur SQL : " . $e->getMessage()
    ]);
}