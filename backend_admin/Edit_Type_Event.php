<?php
/**
 * Script de modification de type d'événement dans Dolibarr et la base locale
 * Projet : Add-in Outlook
 */

// 1. Sécurité environnement Dolibarr
if (!defined('NOCSRFCHECK')) define('NOCSRFCHECK', 1);
if (!defined('NOTOKENRENEWAL')) define('NOTOKENRENEWAL', 1);
if (!defined('NOLOGIN')) define('NOLOGIN', 1);

ob_start(); 

// 2. Configuration des headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit;
}

// 3. Connexion et Configuration
include "db.php"; 
$dolibarr_main = 'C:/dolibarr/www/dolibarr/htdocs/main.inc.php';

// 4. Récupération des données React
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || empty($data['code'])) {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Données incomplètes (code manquant)."]);
    exit;
}

// --- TRAITEMENT DE LA COULEUR ---
$rawColor = !empty($data['color']) ? $data['color'] : '3498db';

// 1. Version SANS # (pour Dolibarr)
$colorNoHash = ltrim($rawColor, '#');

// 2. Version AVEC # (pour la base locale)
$colorWithHash = '#' . $colorNoHash;

try {
    // 5. Chargement de l'environnement Dolibarr
    if (!file_exists($dolibarr_main)) {
        throw new Exception("Le fichier main.inc.php est introuvable.");
    }
    require_once $dolibarr_main;
    global $db;

    // --- ÉTAPE A : MISE À JOUR DANS DOLIBARR (SANS #) ---
    $table_doli = MAIN_DB_PREFIX . "c_actioncomm";
    
    $sqlDolibarr = "UPDATE " . $table_doli . " SET 
                    libelle = '" . $db->escape($data['libelle']) . "',
                    color = '" . $db->escape($colorNoHash) . "', 
                    position = " . (int)$data['position'] . "
                    WHERE code = '" . $db->escape($data['code']) . "'";

    $resql = $db->query($sqlDolibarr);

    if (!$resql) {
        throw new Exception("Erreur SQL Dolibarr : " . $db->lasterror());
    }

    // --- ÉTAPE B : MISE À JOUR DANS LA BASE LOCALE (AVEC #) ---
    $stmtLocal = $conn->prepare("
        UPDATE dolibarr_event_types 
        SET libelle = :libelle, 
            color = :color, 
            position = :position 
        WHERE code = :code
    ");

    $stmtLocal->execute([
        ':libelle'  => $data['libelle'],
        ':color'    => $colorWithHash, // Stockage avec le #
        ':position' => (int)$data['position'],
        ':code'     => $data['code']
    ]);

    // 6. Réponse finale
    ob_end_clean();
    echo json_encode([
        "success" => true,
        "message" => "Type d'événement mis à jour. Dolibarr: $colorNoHash | Local: $colorWithHash"
    ]);

} catch (Exception $e) {
    if (ob_get_length()) ob_end_clean();
    echo json_encode([
        "success" => false, 
        "error" => $e->getMessage()
    ]);
}
?>