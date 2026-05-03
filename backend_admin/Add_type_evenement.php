<?php
/**
 * Script d'ajout de type d'événement dans Dolibarr et la base locale
 * Projet : Add-in Outlook / BorrowMe
 */

if (!defined('NOCSRFCHECK')) define('NOCSRFCHECK', 1);
if (!defined('NOTOKENRENEWAL')) define('NOTOKENRENEWAL', 1);
if (!defined('NOLOGIN')) define('NOLOGIN', 1);

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit;
}

include "db.php"; 
$dolibarr_main = 'C:/dolibarr/www/dolibarr/htdocs/main.inc.php';

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || empty($data['code']) || empty($data['libelle'])) {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Données du formulaire incomplètes."]);
    exit;
}

// --- TRAITEMENT DE LA COULEUR ---
$rawColor = !empty($data['color']) ? $data['color'] : '3498db';

// 1. Version SANS # (pour Dolibarr)
$colorNoHash = ltrim($rawColor, '#');

// 2. Version AVEC # (pour la base locale / CSS)
$colorWithHash = '#' . $colorNoHash;

try {
    if (!file_exists($dolibarr_main)) {
        throw new Exception("Le fichier main.inc.php est introuvable.");
    }
    require_once $dolibarr_main;
    global $db;

    // --- ÉTAPE A : INSERTION DANS DOLIBARR (SANS #) ---
    $table_doli = MAIN_DB_PREFIX . "c_actioncomm";
    
    $sqlMax = "SELECT MAX(id) as max_id FROM " . $table_doli;
    $resMax = $db->query($sqlMax);
    $objMax = $db->fetch_object($resMax);
    $nextId = (int)($objMax->max_id) + 1;

    $sqlDolibarr = "INSERT INTO " . $table_doli . " (id, code, libelle, type, color, position, active) 
                    VALUES (
                        " . $nextId . ", 
                        '" . $db->escape($data['code']) . "', 
                        '" . $db->escape($data['libelle']) . "', 
                        'user', 
                        '" . $db->escape($colorNoHash) . "', 
                        " . (int)$data['position'] . ", 
                        1
                    )";

    $resql = $db->query($sqlDolibarr);

    if (!$resql) {
        if ($db->lasterrno() == 'DB_ERROR_RECORD_ALREADY_EXISTS' || $db->lasterrno() == 1062) {
            throw new Exception("Ce code d'événement existe déjà dans Dolibarr.");
        }
        throw new Exception("Erreur SQL Dolibarr : " . $db->lasterror());
    }

    // --- ÉTAPE B : INSERTION DANS LA BASE LOCALE (AVEC #) ---
    $stmtLocal = $conn->prepare("
        INSERT INTO dolibarr_event_types (id, code, libelle, color, fk_user, position, source) 
        VALUES (NULL, :code, :libelle, :color, :fk_user, :position, 'local')
        ON DUPLICATE KEY UPDATE 
            libelle = VALUES(libelle),
            color = VALUES(color),
            position = VALUES(position)
    ");

    $stmtLocal->execute([
        ':code'     => strtoupper($data['code']),
        ':libelle'  => $data['libelle'],
        ':color'    => $colorWithHash, // Utilise la version avec #
        ':fk_user'  => !empty($data['fk_user']) ? $data['fk_user'] : null,
        ':position' => (int)$data['position']
    ]);

    ob_end_clean();
    echo json_encode([
        "success" => true,
        "message" => "Type d'événement créé. Dolibarr: $colorNoHash | Local: $colorWithHash",
        "id_cree" => $nextId
    ]);

} catch (Exception $e) {
    if (ob_get_length()) ob_end_clean();
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>