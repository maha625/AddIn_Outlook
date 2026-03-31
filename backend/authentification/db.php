<?php
$host = "localhost";
$dbname = "addin_outlook";
$username = "root";
$password = "mysql";

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["error" => "Connexion échouée : " . $e->getMessage()]);
    exit;
}
?>