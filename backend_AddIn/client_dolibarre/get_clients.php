<?php
// Inclusion du fichier de configuration (contient l’URL de Dolibarr et la clé API)
include "config.php";

// Initialisation de cURL (outil PHP pour envoyer des requêtes HTTP)
$ch = curl_init();

// Définition de l’URL de l’API Dolibarr pour récupérer les thirdparties (clients/fournisseurs)
curl_setopt($ch, CURLOPT_URL, "$DOLIBARR_URL/thirdparties");

// Indique que la réponse doit être retournée sous forme de chaîne (et non affichée directement)
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Définition des headers HTTP envoyés avec la requête
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "DOLAPIKEY: $API_KEY",           // Clé API pour authentifier la requête auprès de Dolibarr
    "Content-Type: application/json" // Type de contenu attendu (JSON)
]);

// Exécution de la requête HTTP vers l’API Dolibarr
$response = curl_exec($ch);

// Affichage de la réponse renvoyée par l’API (liste des clients/fournisseurs en JSON)
echo $response;
?>