<?php
// Inclusion du fichier de configuration (contient l'URL Dolibarr et la clé API)
include "config.php";

// Récupération des données envoyées en JSON depuis le frontend (React, Postman, etc.)
$data = json_decode(file_get_contents("php://input"), true);

// Construction du payload (les données à envoyer à l'API Dolibarr)
$payload = [
    "name" => $data["name"],          // Nom du client (obligatoire)
    "client" => 1,                    // 1 = indique que c'est un client
    "status" => 1,                    // 1 = client actif

    // Champs optionnels (si non fournis, valeur null)
    "email" => $data["email"] ?? null,        // Email du client
    "phone" => $data["phone"] ?? null,        // Téléphone
    "address" => $data["address"] ?? null,    // Adresse
    "zip" => $data["zip"] ?? null,            // Code postal
    "town" => $data["town"] ?? null,          // Ville
    "country_id" => $data["country_id"] ?? 1  // ID du pays (par défaut 1)
];

// Initialisation de cURL (outil PHP pour faire des requêtes HTTP)
$ch = curl_init();

// Définition de l'URL de l'API Dolibarr (endpoint thirdparties = clients/fournisseurs)
curl_setopt($ch, CURLOPT_URL, "$DOLIBARR_URL/thirdparties");

// Indique que la requête est de type POST (création d'un client)
curl_setopt($ch, CURLOPT_POST, true);

// On envoie les données encodées en JSON dans le body de la requête
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

// Permet de récupérer la réponse de l'API sous forme de string
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Définition des headers HTTP :
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "DOLAPIKEY: $API_KEY",           // Clé API pour authentification Dolibarr
    "Content-Type: application/json" // Format des données envoyées (JSON)
]);

// Exécution de la requête HTTP vers Dolibarr
$response = curl_exec($ch);

// Vérification s'il y a une erreur cURL (problème de requête HTTP)
if (curl_errno($ch)) {
    // Affiche l'erreur si elle existe
    echo "Erreur cURL : " . curl_error($ch);
} else {
    // Sinon, affiche la réponse renvoyée par l'API Dolibarr
    echo $response;
}

// Fermeture de la session cURL pour libérer les ressources
curl_close($ch);
?>