<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Gestion du preflight OPTIONS pour CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

include "db.php";

$data = json_decode(file_get_contents("php://input"), true);

// 1. Validation stricte des données entrantes
if (!isset($data['id']) || empty($data['id'])) {
    echo json_encode(["success" => false, "error" => "ID client manquant ou invalide"]);
    exit;
}

// Nettoyage et préparation des variables (assurez-vous que les colonnes existent en BD)
$id = (int)$data['id'];
$email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
$domain = $data['domain'] ?? '';
$site_number = $data['site_number'] ?? '';
$dolibarr_url = $data['dolibarr_url'] ?? '';
$token_url = $data['token_url'] ?? '';
$dolibarr_api_key = $data['dolibarr_api_key'] ?? '';
$username = $data['username'] ?? '';
$password = $data['password'] ?? ''; // Nouveau champ
$logo = $data['logo'] ?? '';         // Nouveau champ

try {
    $conn->beginTransaction();

    // 2. Mise à jour des informations de base (champs harmonisés avec le frontend)
    $stmt = $conn->prepare("
        UPDATE clients SET 
            email = ?, 
            domain = ?, 
            site_number = ?, 
            dolibarr_url = ?, 
            token_url = ?, 
            dolibarr_api_key = ?, 
            username = ?,
            password = ?,
            logo = ?
        WHERE id = ?
    ");

    $stmt->execute([
        $email, 
        $domain, 
        $site_number, 
        $dolibarr_url, 
        $token_url, 
        $dolibarr_api_key, 
        $username,
        $password,
        $logo,
        $id
    ]);

    // 3. Mise à jour optimisée des boutons
    // Suppression des anciens boutons
    $stmtDel = $conn->prepare("DELETE FROM client_buttons WHERE client_id = ?");
    $stmtDel->execute([$id]);

    // Réinsertion groupée si des boutons sont présents
    if (isset($data['buttons']) && is_array($data['buttons']) && count($data['buttons']) > 0) {
        $sqlIns = "INSERT INTO client_buttons (client_id, label, event_name, bg_color, text_color, icon) VALUES ";
        $placeholders = [];
        $values = [];

        foreach ($data['buttons'] as $btn) {
            $placeholders[] = "(?, ?, ?, ?, ?, ?)";
            $values[] = $id;
            $values[] = $btn['label'] ?? '';
            $values[] = $btn['event_name'] ?? '';
            $values[] = $btn['bg_color'] ?? '#2563eb';
            $values[] = $btn['text_color'] ?? '#ffffff';
            $values[] = $btn['icon'] ?? 'fas fa-tag';
        }

        $sqlIns .= implode(', ', $placeholders);
        $stmtIns = $conn->prepare($sqlIns);
        $stmtIns->execute($values);
    }

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Mise à jour réussie"]);

} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    error_log("Erreur SQL lors de l'update : " . $e->getMessage()); // Log côté serveur
    echo json_encode(["success" => false, "error" => "Une erreur interne est survenue"]);
}