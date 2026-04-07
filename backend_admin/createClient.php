<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "db.php"; // doit définir $conn (PDO)

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["error" => "Aucune donnée reçue"]);
    exit;
}

// Extraction automatique du domaine si vide
if (empty($data["domain"]) && !empty($data["email"])) {
    $parts = explode('@', $data["email"]);
    $data["domain"] = end($parts);
}

$requiredFields = [
    "site_number", "email", "dolibarr_url", "token_url",
    "username", "password", "dolibarr_api_key", "domain"
];

foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || $data[$field] === "") {
        echo json_encode(["error" => "Champ vide: $field"]);
        exit;
    }
}

try {
    $conn->beginTransaction();

    // Hash du mot de passe avant stockage
    $hashedPassword = password_hash($data["password"], PASSWORD_DEFAULT);

    // 1) Insertion du client
    $stmt = $conn->prepare("
        INSERT INTO clients 
        (site_number, email, dolibarr_url, token_url, username, password, dolibarr_api_key, domain, logo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $data["site_number"],
        $data["email"],
        $data["dolibarr_url"],
        $data["token_url"],
        $data["username"],
        $hashedPassword,
        $data["dolibarr_api_key"],
        $data["domain"],
        isset($data["logo"]) ? $data["logo"] : null
    ]);

    $clientId = $conn->lastInsertId();

    // 2) Insertion des relations client -> bouton -> event_type
    if (!empty($data["buttons"]) && is_array($data["buttons"])) {

        // Préparer la requête d'insertion finale
        $insertRel = $conn->prepare("
            INSERT INTO client_button_relation (client_id, button_action_key, event_type_id)
            VALUES (?, ?, ?)
        ");

        // Requêtes pour valider l'existence des références
        $checkButton = $conn->prepare("SELECT 1 FROM buttons WHERE action_key = ?");
        $checkEvent  = $conn->prepare("SELECT 1 FROM event_types WHERE id = ?");

        foreach ($data["buttons"] as $btn) {
            // Chaque bouton attendu : { action_key: "...", event_type_id: 123 }
            if (empty($btn["action_key"]) || empty($btn["event_type_id"])) {
                // Rollback et erreur si données incomplètes
                $conn->rollBack();
                echo json_encode(["error" => "Chaque bouton doit contenir action_key et event_type_id"]);
                exit;
            }

            // Vérifier que le bouton existe
            $checkButton->execute([$btn["action_key"]]);
            if (!$checkButton->fetchColumn()) {
                $conn->rollBack();
                echo json_encode(["error" => "Bouton inconnu: " . $btn["action_key"]]);
                exit;
            }

            // Vérifier que le type d'événement existe
            $checkEvent->execute([$btn["event_type_id"]]);
            if (!$checkEvent->fetchColumn()) {
                $conn->rollBack();
                echo json_encode(["error" => "Type d'événement inconnu pour event_type_id: " . $btn["event_type_id"]]);
                exit;
            }

            // Insérer la relation (si clé primaire composite existe déjà, on peut choisir d'ignorer ou mettre à jour)
            $insertRel->execute([$clientId, $btn["action_key"], $btn["event_type_id"]]);
        }
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Client et configurations enregistrés",
        "client_id" => $clientId
    ]);
    exit;

} catch (PDOException $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo json_encode(["error" => "Erreur SQL", "details" => $e->getMessage()]);
    exit;
}
?>
