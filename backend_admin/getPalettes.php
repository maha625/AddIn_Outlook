<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$palettes = json_decode(file_get_contents(__DIR__ . "/palettes.json"), true);
echo json_encode(["success" => true, "palettes" => $palettes]);