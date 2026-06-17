<?php
// 1. Autoriser l'accès depuis votre application React
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// 2. Gérer la requête de pré-vol (OPTIONS) utilisée par Axios
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

header("Content-Type: application/json");

require_once "db.php"; 

try {
    $sql = "
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') AS month,
            COUNT(*) AS total
        FROM clients
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $months = [];
    for ($i = 11; $i >= 0; $i--) {
        $date = new DateTime();
        $date->modify("-$i month");
        $key = $date->format("Y-m");

        $months[$key] = [
            "month_name" => $date->format("M Y"),
            "total" => 0
        ];
    }

    foreach ($results as $row) {
        if(isset($months[$row["month"]])) {
            $months[$row["month"]]["total"] = intval($row["total"]);
        }
    }

    echo json_encode([
        "success" => true,
        "data" => array_values($months)
    ]);

} catch(PDOException $e){
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>