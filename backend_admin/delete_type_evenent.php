<?php
/**
 * Script de suppression de type d'événement dans Dolibarr et la base locale
 */

// 1. Définitions de sécurité Dolibarr
if (!defined('NOCSRFCHECK')) define('NOCSRFCHECK', 1);
if (!defined('NOTOKENRENEWAL')) define('NOTOKENRENEWAL', 1);
if (!defined('NOLOGIN')) define('NOLOGIN', 1);

ob_start(); // Empêcher toute sortie parasite

// 2. Configuration des headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit;
}

// 3. Connexion et Chemins
include "db.php"; // Fournit $conn pour la base locale
$dolibarr_main = 'C:/dolibarr/www/dolibarr/htdocs/main.inc.php';

// 4. Récupération des données
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || empty($data['code'])) {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Code d'événement manquant."]);
    exit;
}

try {
    // 5. Chargement de l'environnement Dolibarr
    if (!file_exists($dolibarr_main)) {
        throw new Exception("Le fichier main.inc.php est introuvable.");
    }
    require_once $dolibarr_main;
    global $db;

    // --- ÉTAPE A : SUPPRESSION DANS LA BASE LOCALE (PDO) ---
    $stmtLocal = $conn->prepare("DELETE FROM dolibarr_event_types WHERE code = :code");
    $stmtLocal->execute([':code' => $data['code']]);

    // 6. Réponse finale
    ob_end_clean();
    echo json_encode([
        "success" => true,
        "message" => "Type d'événement supprimé avec succès des deux bases."
    ]);

} catch (Exception $e) {
    if (ob_get_length()) ob_end_clean();
    echo json_encode([
        "success" => false, 
        "error" => $e->getMessage()
    ]);
}
?>