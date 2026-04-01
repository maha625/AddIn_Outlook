<?php
// Inclusion du fichier de configuration (contient l'URL Dolibarr et la clé API)
include "config.php";

// Récupération des données envoyées en JSON
$data = json_decode(file_get_contents("php://input"), true);

// Construction du payload
$payload = [
    "name" => $data["name"],
    "client" => 1,
    "status" => 1,
    "email" => $data["email"] ?? null,
    "phone" => $data["phone"] ?? null,
    "address" => $data["address"] ?? null,
    "zip" => $data["zip"] ?? null,
    "town" => $data["town"] ?? null,
    "country_id" => $data["country_id"] ?? 1
];

// Initialisation cURL
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, "$DOLIBARR_URL/thirdparties");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "DOLAPIKEY: $API_KEY",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);

// Gestion erreur propre JSON
if (curl_errno($ch)) {
    echo json_encode(["error" => curl_error($ch)]);
} else {
    echo $response;
}

curl_close($ch);
?>