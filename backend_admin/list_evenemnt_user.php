<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Empêcher l'affichage d'erreurs PHP parasites dans le JSON
error_reporting(0);
ini_set('display_errors', 0);

include "db.php"; // Votre connexion PDO $conn
// Chemin vers le fichier main de Dolibarr pour utiliser l'objet $db
$dolibarr_main = 'C:/dolibarr/www/dolibarr/htdocs/main.inc.php';

$action = $_GET['action'] ?? '';

try {
    // Action 1 : Lister les utilisateurs (Table clients)
    if ($action == 'get_users') {
        $stmt = $conn->query("SELECT id, username FROM clients");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    // Action 2 : Lister les types FILTRÉS par utilisateur
    if ($action == 'list_types') {
        $user_id = $_GET['user_id'] ?? 0;
        
        if (empty($user_id)) {
            echo json_encode([]);
            exit;
        }

        // On cherche dans la table locale qui possède la colonne fk_user
        $stmt = $conn->prepare("SELECT code, libelle, color, position, source 
                                FROM dolibarr_event_types 
                                WHERE fk_user = :user_id");
        $stmt->execute([':user_id' => $user_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    // Action 3 : Suppression synchronisée
    if ($action == 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        require_once $dolibarr_main;
        global $db;

        $input = json_decode(file_get_contents('php://input'), true);
        $code = $input['code'] ?? '';

        if (!$code) throw new Exception("Code manquant");

        // 1. Suppression dans Dolibarr
        $sqlDoli = "DELETE FROM " . MAIN_DB_PREFIX . "c_actioncomm WHERE code = '" . $db->escape($code) . "'";
        $db->query($sqlDoli);

        // 2. Suppression dans la base locale
        $stmt = $conn->prepare("DELETE FROM dolibarr_event_types WHERE code = :code");
        $stmt->execute([':code' => $code]);

        echo json_encode(["success" => true]);
        exit;
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>