<?php
/**
 * Script de gestion des événements - VERSION BASE LOCALE UNIQUEMENT
 * Ce script ne dépend plus du tout de Dolibarr.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Empêcher l'affichage d'erreurs PHP parasites dans le JSON
error_reporting(0);
ini_set('display_errors', 0);

include "db.php"; // Votre connexion PDO $conn est la seule source utilisée désormais

$action = $_GET['action'] ?? '';

try {
    // Action 1 : Lister les utilisateurs (Table locale 'clients')
    if ($action == 'get_users') {
        $stmt = $conn->query("SELECT id, username FROM clients"); //
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    // Action 2 : Lister les types filtrés par utilisateur (Table locale 'dolibarr_event_types')
    if ($action == 'list_types') {
        $user_id = $_GET['user_id'] ?? 0;
        
        if (empty($user_id)) {
            echo json_encode([]);
            exit;
        }

        // Requête sur votre table locale uniquement
        $stmt = $conn->prepare("SELECT code, libelle, color, position, source 
                                FROM dolibarr_event_types 
                                WHERE fk_user = :user_id");
        $stmt->execute([':user_id' => $user_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    // Action 3 : Suppression uniquement dans la base locale
    if ($action == 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $code = $input['code'] ?? '';
        $fk_user = $input['fk_user'] ?? ''; // On récupère l'utilisateur pour sécuriser la suppression

        if (!$code || !$fk_user) {
            throw new Exception("Code ou fk_user manquant pour la suppression");
        }

        // Suppression dans votre base locale
        // On filtre par code ET par fk_user pour ne pas supprimer les types des autres utilisateurs
        $stmt = $conn->prepare("DELETE FROM dolibarr_event_types WHERE code = :code AND fk_user = :fk_user");
        $stmt->execute([
            ':code' => $code,
            ':fk_user' => $fk_user
        ]);

        echo json_encode(["success" => true]);
        exit;
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>