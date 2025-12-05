<?php
// chat_api.php - 간단 파일 기반 채팅 API

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$chatFile = __DIR__ . "/chat_data.json";

// 최초 1회용: 파일 없으면 빈 배열로 생성
if (!file_exists($chatFile)) {
    file_put_contents($chatFile, json_encode([]));
}

$action = $_GET["action"] ?? "";

function loadMessages() {
    global $chatFile;
    $json = file_get_contents($chatFile);
    $data = json_decode($json, true);
    if (!is_array($data)) $data = [];
    return $data;
}

function saveMessages($messages) {
    global $chatFile;
    file_put_contents($chatFile, json_encode($messages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function sendJson($success, $data = null, $message = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        "success" => $success,
        "data" => $data,
        "message" => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ============ 메시지 목록 조회 ============
if ($action === "get") {
    $eventId = $_GET["eventId"] ?? "1";
    $after   = isset($_GET["after"]) ? (int)$_GET["after"] : 0;

    $all = loadMessages();

    $filtered = array_values(array_filter($all, function($m) use ($eventId, $after) {
        if ((string)$m["eventId"] !== (string)$eventId) return false;
        if ($after > 0 && isset($m["timestamp"]) && $m["timestamp"] <= $after) return false;
        return true;
    }));

    sendJson(true, ["messages" => $filtered]);
}

// ============ 메시지 전송 ============
if ($action === "send") {
    $raw = json_decode(file_get_contents("php://input"), true);

    if (!$raw || !isset($raw["eventId"], $raw["author"], $raw["text"])) {
        sendJson(false, null, "필수 필드가 누락되었습니다.", 400);
    }

    $eventId = $raw["eventId"];
    $userId  = $raw["userId"] ?? "guest";  // ✅ 수정: userId를 요청에서 받아옴
    $author  = trim($raw["author"]);
    $text    = trim($raw["text"]);

    if ($text === "") {
        sendJson(false, null, "메시지가 비어 있습니다.", 400);
    }

    $all = loadMessages();

    $all[] = [
        "eventId"   => $eventId,
        "userId"    => $userId,      // ✅ 누가 보냈는지
        "author"    => $author,      // 닉네임
        "text"      => $text,
        "timestamp" => time()
    ];

    saveMessages($all);

    sendJson(true, null, "메시지 전송 성공");
}

// 그 외 action
sendJson(false, null, "잘못된 action 입니다.", 400);