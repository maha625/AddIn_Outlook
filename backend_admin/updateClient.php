<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

include "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id']) || empty($data['id'])) {
    echo json_encode(["success" => false, "error" => "ID client manquant ou invalide"]);
    exit;
}

$id              = (int)$data['id'];
$email           = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
$domain          = $data['domain']          ?? '';
$site_number     = $data['site_number']     ?? '';
$dolibarr_url    = $data['dolibarr_url']    ?? '';
$token_url       = $data['token_url']       ?? '';
$dolibarr_api_key= $data['dolibarr_api_key']?? '';
$username        = $data['username']        ?? '';
$password        = $data['password']        ?? '';
$logo            = $data['logo']            ?? '';

try {
    $conn->beginTransaction();

    // ── 1. Update client info ─────────────────────────────────────────────
    $stmt = $conn->prepare("
        UPDATE clients SET 
            email             = ?,
            domain            = ?,
            site_number       = ?,
            dolibarr_url      = ?,
            token_url         = ?,
            dolibarr_api_key  = ?,
            username          = ?,
            password          = ?,
            logo              = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $email, $domain, $site_number, $dolibarr_url,
        $token_url, $dolibarr_api_key, $username, $password, $logo,
        $id
    ]);

    // ── 2. Replace buttons ────────────────────────────────────────────────
    $conn->prepare("DELETE FROM client_buttons WHERE client_id = ?")
         ->execute([$id]);

    if (!empty($data['buttons']) && is_array($data['buttons'])) {

        // Ajout de la 7ème colonne : event_name
        $placeholders = implode(', ', array_fill(
            0,
            count($data['buttons']),
            "(?, ?, ?, ?, ?, ?, ?)"   // 7 colonnes maintenant
        ));

        $sql = "INSERT INTO client_buttons
                    (client_id, label, bg_color, text_color, icon, dolibarr_type_code, event_name)
                VALUES $placeholders";

        $values = [];
        foreach ($data['buttons'] as $btn) {
            $values[] = $id;
            $values[] = $btn['label']               ?? '';
            $values[] = $btn['bg_color']             ?? '#2563eb';
            $values[] = $btn['text_color']           ?? '#ffffff';
            $values[] = $btn['icon']                 ?? 'fas fa-tag';
            $values[] = !empty($btn['dolibarr_type_code'])
                            ? $btn['dolibarr_type_code']
                            : null;
            
            // Correction ici : on ajoute la valeur pour event_name
            // Si le frontend n'envoie pas explicitement event_name, on utilise le label
            $values[] = !empty($btn['event_name']) ? $btn['event_name'] : ($btn['label'] ?? 'unnamed_event');
        }

        $conn->prepare($sql)->execute($values);
    }

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Mise à jour réussie"]);

} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    error_log("Erreur updateClient : " . $e->getMessage());
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}