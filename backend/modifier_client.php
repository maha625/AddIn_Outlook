<?php
// Inclusion du fichier de configuration (contient l’URL Dolibarr et la clé API)
include "config.php";

// Récupération de l’identifiant du client à modifier depuis l’URL (ex: update.php?id=5)
$id = $_GET["id"];

// Récupération des nouvelles données envoyées en JSON depuis le frontend (React, Postman, etc.)
$data = json_decode(file_get_contents("php://input"), true);

// Initialisation de cURL (outil PHP pour envoyer des requêtes HTTP)
$ch = curl_init();

// Définition de l’URL de l’API Dolibarr pour modifier un client spécifique
curl_setopt($ch, CURLOPT_URL, "$DOLIBARR_URL/thirdparties/$id");

// Définition du type de requête HTTP en PUT (mise à jour d’une ressource)
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");

// Envoi des données (payload) encodées en JSON dans le corps de la requête
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

// Permet de récupérer la réponse de l’API sous forme de chaîne
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Définition des headers HTTP envoyés à l’API
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "DOLAPIKEY: $API_KEY",           // Clé API pour authentification Dolibarr
    "Content-Type: application/json" // Format des données envoyées (JSON)
]);

// Exécution de la requête HTTP vers l’API Dolibarr
$response = curl_exec($ch);

// Affichage de la réponse retournée par l’API (succès ou erreur)
echo $response;

// Fermeture de la session cURL pour libérer les ressources
curl_close($ch);
?>