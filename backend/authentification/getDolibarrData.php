<?php
header("Content-Type: application/json");

include "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["email"])) {
    echo json_encode(["error" => "Email requis"]);
    exit;
}

$email = $data["email"];

// Extraire domaine
$domain = substr(strrchr($email, "@"), 1);

// Chercher client
$stmt = $conn->prepare("SELECT * FROM clients WHERE domain = ?");
$stmt->execute([$domain]);

$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(["error" => "Entreprise non trouvée"]);
    exit;
}

// Dolibarr API
$API_KEY = $user["dolibarr_api_key"];
$DOLIBARR_URL = $user["dolibarr_url"];

// Appel API
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $DOLIBARR_URL . "/thirdparties");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "DOLAPIKEY: $API_KEY",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo json_encode(["error" => curl_error($ch)]);
} else {
    echo $response;
}

curl_close($ch);
?>