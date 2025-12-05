<?php
// config.php - 기본 설정 및 유틸리티 함수

// 세션 시작
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 에러 리포팅 (개발 중에만)
error_reporting(E_ALL);

// 브라우저 출력 X
ini_set('display_errors', 0);

// 대신 로그 파일에 적기
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log');

// JSON 응답 헤더
header('Content-Type: application/json; charset=utf-8');

// CORS 허용 (로컬 개발용)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONS 요청 처리
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ========================================
// 상수 정의
// ========================================
define('DATA_DIR', __DIR__ . '/data');
define('USERS_FILE', DATA_DIR . '/users.json');
define('LIKED_EVENTS_FILE', DATA_DIR . '/liked_events.json');
define('API_CONFIG_FILE', DATA_DIR . '/api_config.json');
define('SESSIONS_FILE', DATA_DIR . '/sessions.json');

// 관리자 계정 정보
define('ADMIN_ID', 'admin');
define('ADMIN_PASSWORD', 'cse');

// ========================================
// 데이터 디렉토리 초기화
// ========================================
function initializeDataDirectory() {
    // data 디렉토리 생성
    if (!file_exists(DATA_DIR)) {
        mkdir(DATA_DIR, 0755, true);
    }
    
    // users.json 초기화
    if (!file_exists(USERS_FILE)) {
        $defaultUsers = [
            [
                'id' => ADMIN_ID,
                'password' => password_hash(ADMIN_PASSWORD, PASSWORD_DEFAULT),
                'name' => '관리자',
                'email' => 'admin@danuri.com',
                'isAdmin' => true,
                'joinDate' => date('Y-m-d'),
                'lastLogin' => null
            ]
        ];
        file_put_contents(USERS_FILE, json_encode($defaultUsers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    // liked_events.json 초기화
    if (!file_exists(LIKED_EVENTS_FILE)) {
        file_put_contents(LIKED_EVENTS_FILE, json_encode([], JSON_PRETTY_PRINT));
    }
    
    // api_config.json 초기화
    if (!file_exists(API_CONFIG_FILE)) {
        $defaultApis = [
            [
                'id' => 'daejeon-api',
                'name' => '대전광역시 축제 API',
                'url' => 'https://apis.data.go.kr/6300000/openapi2022/festv/getfestv',
                'apiKey' => '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6',
                'isActive' => true,
                'source' => '대전광역시'
            ],
            [
                'id' => 'busan-api',
                'name' => '부산광역시 축제 API',
                'url' => 'https://apis.data.go.kr/6260000/FestivalService/getFestivalKr',
                'apiKey' => '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6',
                'isActive' => true,
                'source' => '부산광역시'
            ]
        ];
        file_put_contents(API_CONFIG_FILE, json_encode($defaultApis, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    // sessions.json 초기화
    if (!file_exists(SESSIONS_FILE)) {
        file_put_contents(SESSIONS_FILE, json_encode([], JSON_PRETTY_PRINT));
    }
}

// 초기화 실행
initializeDataDirectory();

// ========================================
// JSON 파일 읽기/쓰기 유틸리티
// ========================================

/**
 * JSON 파일 읽기
 */
function readJsonFile($filePath) {
    if (!file_exists($filePath)) {
        return [];
    }
    
    $content = file_get_contents($filePath);
    $data = json_decode($content, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON 파싱 오류: " . json_last_error_msg());
        return [];
    }
    
    return $data;
}

/**
 * JSON 파일 쓰기
 */
function writeJsonFile($filePath, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if ($json === false) {
        error_log("JSON 인코딩 오류: " . json_last_error_msg());
        return false;
    }
    
    $result = file_put_contents($filePath, $json);
    
    if ($result === false) {
        error_log("파일 쓰기 오류: " . $filePath);
        return false;
    }
    
    return true;
}

// ========================================
// 사용자 관련 유틸리티
// ========================================

/**
 * 모든 사용자 가져오기
 */
function getAllUsers() {
    return readJsonFile(USERS_FILE);
}

/**
 * 사용자 ID로 찾기
 */
function findUserById($userId) {
    $users = getAllUsers();
    
    foreach ($users as $user) {
        if ($user['id'] === $userId) {
            return $user;
        }
    }
    
    return null;
}

/**
 * 사용자 이메일로 찾기
 */
function findUserByEmail($email) {
    $users = getAllUsers();
    
    foreach ($users as $user) {
        if ($user['email'] === $email) {
            return $user;
        }
    }
    
    return null;
}

/**
 * 사용자 저장 (추가 또는 업데이트)
 */
function saveUser($userData) {
    $users = getAllUsers();
    $found = false;
    
    // 기존 사용자 업데이트
    foreach ($users as $index => $user) {
        if ($user['id'] === $userData['id']) {
            $users[$index] = $userData;
            $found = true;
            break;
        }
    }
    
    // 새 사용자 추가
    if (!$found) {
        $users[] = $userData;
    }
    
    return writeJsonFile(USERS_FILE, $users);
}

// ========================================
// 응답 유틸리티
// ========================================

/**
 * 성공 응답
 */
function sendSuccess($data = null, $message = 'Success') {
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * 에러 응답
 */
function sendError($message = 'Error', $code = 400, $data = null) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// ========================================
// 입력 검증 유틸리티
// ========================================

/**
 * 이메일 유효성 검사
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * 비밀번호 유효성 검사 (최소 4자)
 */
function isValidPassword($password) {
    return strlen($password) >= 4;
}

/**
 * 필수 필드 확인
 */
function validateRequiredFields($data, $requiredFields) {
    $missingFields = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            $missingFields[] = $field;
        }
    }
    
    if (!empty($missingFields)) {
        sendError('필수 필드가 누락되었습니다: ' . implode(', ', $missingFields), 400, [
            'missingFields' => $missingFields
        ]);
    }
}

// ========================================
// 로그 유틸리티
// ========================================

/**
 * 로그 기록
 */
function logMessage($message, $type = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$type}] {$message}\n";
    error_log($logMessage, 3, DATA_DIR . '/app.log');
}

/**
 * 사용자 활동 로그
 */
function logUserActivity($userId, $action) {
    logMessage("사용자 활동: {$userId} - {$action}", 'USER');
}

// ========================================
// 세션 유틸리티
// ========================================

/**
 * 현재 로그인한 사용자 ID 가져오기
 */
function getCurrentUserId() {
    return $_SESSION['userId'] ?? null;
}

/**
 * 로그인 여부 확인
 */
function isLoggedIn() {
    return isset($_SESSION['userId']) && !empty($_SESSION['userId']);
}

/**
 * 관리자 여부 확인
 */
function isAdmin() {
    return isset($_SESSION['isAdmin']) && $_SESSION['isAdmin'] === true;
}

/**
 * 로그인 필수 체크
 */
function requireLogin() {
    if (!isLoggedIn()) {
        sendError('로그인이 필요합니다.', 401);
    }
}

/**
 * 관리자 권한 필수 체크
 */
function requireAdmin() {
    requireLogin();
    
    if (!isAdmin()) {
        sendError('관리자 권한이 필요합니다.', 403);
    }
}

?>