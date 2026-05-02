<?php
$host = "localhost";
$port = "3307"; // On définit le nouveau port ici
$dbname = "addin_outlook";
$username = "root";
$password = "1234";

try {
    // Ajout de port=$port dans le DSN
    $conn = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8", $username, $password);
    
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["error" => "Connexion échouée : " . $e->getMessage()]);
    exit;
}
?>