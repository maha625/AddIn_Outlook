<?php
/**
 * Script d'ajout de type d'événement uniquement dans la base locale
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

$input = file_get_contents("php://input");
$data = json_decode($input, true);

// 1. Vérification : On utilise fk_user pour être cohérent avec le frontend
if (!$data || empty($data['code']) || empty($data['libelle']) || empty($data['fk_user'])) {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Données incomplètes : code, libelle ou fk_user manquant."]);
    exit;
}

$rawColor = !empty($data['color']) ? $data['color'] : '#3498db';
$colorWithHash = '#' . ltrim($rawColor, '#'); 

try {
    // 2. Requête : On insère fk_user pour lier le type d'événement à l'utilisateur
    $stmtLocal = $conn->prepare("
        INSERT INTO dolibarr_event_types (code, libelle, color, fk_user, position, source) 
        VALUES (:code, :libelle, :color, :fk_user, :position, 'local')
        ON DUPLICATE KEY UPDATE 
            libelle = VALUES(libelle),
            color = VALUES(color),
            position = VALUES(position),
            fk_user = VALUES(fk_user) 
    ");

    $stmtLocal->execute([
        ':code'      => strtoupper($data['code']),
        ':libelle'   => $data['libelle'],
        ':color'     => $colorWithHash,
        ':fk_user'   => $data['fk_user'], // Utilisation de la clé correcte venant du JS
        ':position'  => (int)($data['position'] ?? 0)
    ]);

    ob_end_clean();
    echo json_encode([
        "success" => true,
        "message" => "Type d'événement enregistré avec succès pour l'utilisateur.",
        "details" => [
            "code" => strtoupper($data['code']),
            "fk_user" => $data['fk_user']
        ]
    ]);

} catch (Exception $e) {
    if (ob_get_length()) ob_end_clean();
    echo json_encode(["success" => false, "error" => "Erreur base locale : " . $e->getMessage()]);
}
?>