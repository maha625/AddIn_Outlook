<?php
//ce fichier reçoit une requete de react avec un email,
//il extrait le domaine de cet email, cherche dans la base de donnée si un client a ce domaine,
//et si oui, il utilise la clé API de ce client pour faire une requete à Dolibarr et récupérer la liste des tiers

header("Content-Type: application/json");

include "db.php";

// 1. On lit le flux brut qui arrive de React (php://input)
// 2. On le transforme de JSON en tableau PHP (json_decode)
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["email"])) { //isset() : C'est une fonction PHP qui vérifie si une variable existe et n'est pas NULL
    echo json_encode(["error" => "Email requis"]);
    exit;
}

$email = $data["email"];

// Extraire domaine
$domain = substr(strrchr($email, "@"), 1);//strrchr($email, "@"):Elle cherche la dernière occurrence du caractère @ dans la variable $email
                                          //substr(..., 1): Elle prend la partie de la chaîne après le @ (en commençant à l'index 1 pour exclure le @ lui-même)
// Chercher client
$stmt = $conn->prepare("SELECT * FROM clients WHERE domain = ?"); //demande a la base de donner de preparer pour executer une commande et traiter le ? comme du texte qui sera remplie apres pour eviter les injection sql
$stmt->execute([$domain]);

$user = $stmt->fetch(PDO::FETCH_ASSOC); //il transmettre la table de la base de donneee en une tableau php dont les indice sont les noms des colonnes de la base de donnees

if (!$user) {
    echo json_encode([
        "success" => false,
        "message" => "Client n'existe pas"
    ]);
    exit;
}

// Dolibarr API
$API_KEY = $user["dolibarr_api_key"];
$DOLIBARR_URL = $user["dolibarr_url"];

// Appel API
$ch = curl_init();
//curl_setopt: Définit l'URL de l'API que tu veux contacter.
curl_setopt($ch, CURLOPT_URL, $DOLIBARR_URL . "/thirdparties");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);//Demande à PHP de stocker la réponse de Dolibarr dans une variable au lieu de l'afficher directement à l'écran.
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "DOLAPIKEY: $API_KEY",
    "Content-Type: application/json"
]);//Tu déclines ton identité avec ta clé secrète pour que Dolibarr sache que c'est toi qui fais la demande et que tu as le droit d'accéder aux données.

$response = curl_exec($ch);//PHP ouvre une connexion réseau, contacte l'URL de Dolibarr, présente la DOLAPIKEY, et attend que le serveur distant réponde.

if (curl_errno($ch)) {
    echo json_encode(["error" => curl_error($ch)]);
} else {
    echo $response;
}

curl_close($ch);
?>