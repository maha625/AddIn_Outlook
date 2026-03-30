<?php
// Inclusion du fichier de configuration (URL Dolibarr + clé API)
include "config.php";

// Récupération de l'identifiant du client à supprimer depuis l'URL (ex: delete.php?id=5)
$id = $_GET["id"];

// Initialisation de cURL (outil PHP pour envoyer des requêtes HTTP)
$ch = curl_init();

// Définition de l'URL de l’API Dolibarr pour supprimer un client spécifique (thirdparty)
curl_setopt($ch, CURLOPT_URL, "$DOLIBARR_URL/thirdparties/$id");

// Définition du type de requête HTTP en DELETE (suppression)
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");

// Permet de récupérer la réponse de l’API sous forme de chaîne (et non l’afficher directement)
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Définition des headers HTTP envoyés à l’API
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "DOLAPIKEY: $API_KEY" // Clé API utilisée pour authentifier la requête auprès de Dolibarr
]);

// Exécution de la requête HTTP vers l’API Dolibarr
$response = curl_exec($ch);

// Affichage de la réponse retournée par l’API (succès ou erreur)
echo $response;

// (Optionnel mais recommandé) fermer la session cURL pour libérer les ressources
curl_close($ch);
?>