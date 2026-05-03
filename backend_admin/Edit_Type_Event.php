<?php
/**
 * Script de modification de type d'événement - Logique Locale Uniquement
 */

ob_start(); 

// 1. Configuration des headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit;
}

// 2. Connexion à votre base locale
include "db.php"; 

// 3. Récupération des données React
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || empty($data['code'])) {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Données incomplètes (code manquant)."]);
    exit;
}

// --- NETTOYAGE DE LA COULEUR ---
// On s'assure que la couleur commence toujours par un seul '#'
$rawColor = !empty($data['color']) ? $data['color'] : '#3498db';
$cleanColor = '#' . ltrim($rawColor, '#'); 

try {
    // --- MISE À JOUR DANS LA BASE LOCALE ---
    // On met à jour les infos. Note : Si vous voulez que ce soit global, 
    // ne filtrez que par 'code'. Si c'est par utilisateur, ajoutez 'client_id' dans le WHERE.
    $stmtLocal = $conn->prepare("
        UPDATE dolibarr_event_types 
        SET libelle = :libelle, 
            color = :color, 
            position = :position 
        WHERE code = :code
    ");

    $result = $stmtLocal->execute([
        ':libelle'  => $data['libelle'],
        ':color'    => $cleanColor,
        ':position' => isset($data['position']) ? (int)$data['position'] : 0,
        ':code'     => $data['code']
    ]);

    // Vérification si une ligne a effectivement été modifiée
    if ($stmtLocal->rowCount() === 0) {
        // Optionnel : Vous pourriez décider de faire un INSERT ici si le code n'existe pas encore
    }

    ob_end_clean();
    echo json_encode([
        "success" => true,
        "message" => "Type d'événement mis à jour localement.",
        "debug" => [
            "code" => $data['code'],
            "color" => $cleanColor
        ]
    ]);

} catch (Exception $e) {
    if (ob_get_length()) ob_end_clean();
    echo json_encode([
        "success" => false, 
        "error" => "Erreur SQL : " . $e->getMessage()
    ]);
}
?>