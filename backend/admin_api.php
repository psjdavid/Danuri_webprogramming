<?php
// 학번: 202300771 이름: 박성준
// admin_api.php - 관리자 전용 API

require_once 'config.php';

// 관리자 권한 확인
requireAdmin();

// 액션 파라미터
$action = $_GET['action'] ?? '';

// ========================================
// 라우팅
// ========================================

switch ($action) {
    // 회원 관리
    case 'users':
        handleGetUsers();
        break;
    
    case 'user-warning':
        handleUserWarning();
        break;
    
    case 'user-suspend':
        handleUserSuspend();
        break;
    
    case 'user-delete':
        handleUserDelete();
        break;
    
    // API 관리
    case 'api-list':
        handleGetApiList();
        break;
    
    case 'api-add':
        handleAddApi();
        break;
    
    case 'api-update':
        handleUpdateApi();
        break;
    
    case 'api-delete':
        handleDeleteApi();
        break;
    
    case 'api-toggle':
        handleToggleApi();
        break;
    
    default:
        sendError('잘못된 액션입니다.', 400);
}

// ========================================
// 회원 목록 조회
// ========================================
function handleGetUsers() {
    $users = getAllUsers();
    
    // 비밀번호 제외
    $safeUsers = array_map(function($user) {
        unset($user['password']);
        return $user;
    }, $users);
    
    sendSuccess([
        'users' => $safeUsers,
        'count' => count($safeUsers)
    ], '회원 목록 조회 성공');
}

// ========================================
// 회원 경고
// ========================================
function handleUserWarning() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    validateRequiredFields($input, ['userId', 'reason']);
    
    $userId = $input['userId'];
    $reason = $input['reason'];
    
    // 자기 자신에게는 경고 불가
    if ($userId === getCurrentUserId()) {
        sendError('자기 자신에게 경고를 줄 수 없습니다.', 400);
    }
    
    $user = findUserById($userId);
    
    if (!$user) {
        sendError('사용자를 찾을 수 없습니다.', 404);
    }
    
    // 경고 횟수 증가
    if (!isset($user['warningCount'])) {
        $user['warningCount'] = 0;
    }
    $user['warningCount']++;
    
    // 경고 기록
    if (!isset($user['warnings'])) {
        $user['warnings'] = [];
    }
    $user['warnings'][] = [
        'reason' => $reason,
        'date' => date('Y-m-d H:i:s'),
        'adminId' => getCurrentUserId()
    ];
    
    // 경고 3회 이상 시 자동 정지
    if ($user['warningCount'] >= 3) {
        $user['status'] = 'suspended';
        $user['suspendedAt'] = date('Y-m-d H:i:s');
        $user['suspendReason'] = '경고 3회 누적';
    }
    
    saveUser($user);
    
    logUserActivity(getCurrentUserId(), "회원 경고: {$userId} - {$reason}");
    
    unset($user['password']);
    sendSuccess($user, '경고를 전송했습니다.');
}

// ========================================
// 회원 정지/해제
// ========================================
function handleUserSuspend() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    validateRequiredFields($input, ['userId', 'suspend']);
    
    $userId = $input['userId'];
    $suspend = $input['suspend']; // true or false
    $reason = $input['reason'] ?? '관리자 조치';
    
    // 자기 자신은 정지 불가
    if ($userId === getCurrentUserId()) {
        sendError('자기 자신을 정지시킬 수 없습니다.', 400);
    }
    
    $user = findUserById($userId);
    
    if (!$user) {
        sendError('사용자를 찾을 수 없습니다.', 404);
    }
    
    if ($suspend) {
        // 정지
        $user['status'] = 'suspended';
        $user['suspendedAt'] = date('Y-m-d H:i:s');
        $user['suspendReason'] = $reason;
        $message = '계정이 정지되었습니다.';
    } else {
        // 해제
        $user['status'] = 'active';
        $user['suspendedAt'] = null;
        $user['suspendReason'] = null;
        $message = '계정 정지가 해제되었습니다.';
    }
    
    saveUser($user);
    
    logUserActivity(getCurrentUserId(), "회원 정지: {$userId} - " . ($suspend ? '정지' : '해제'));
    
    unset($user['password']);
    sendSuccess($user, $message);
}

// ========================================
// 회원 삭제
// ========================================
function handleUserDelete() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    validateRequiredFields($input, ['userId']);
    
    $userId = $input['userId'];
    
    // 자기 자신은 삭제 불가
    if ($userId === getCurrentUserId()) {
        sendError('자기 자신을 삭제할 수 없습니다.', 400);
    }
    
    // 관리자는 삭제 불가
    if ($userId === ADMIN_ID) {
        sendError('관리자 계정은 삭제할 수 없습니다.', 400);
    }
    
    $users = getAllUsers();
    $newUsers = array_filter($users, function($user) use ($userId) {
        return $user['id'] !== $userId;
    });
    
    if (count($newUsers) === count($users)) {
        sendError('사용자를 찾을 수 없습니다.', 404);
    }
    
    // 재인덱싱
    $newUsers = array_values($newUsers);
    
    writeJsonFile(USERS_FILE, $newUsers);
    
    logUserActivity(getCurrentUserId(), "회원 삭제: {$userId}");
    
    sendSuccess(['userId' => $userId], '회원이 삭제되었습니다.');
}

// ========================================
// API 목록 조회
// ========================================
function handleGetApiList() {
    $apis = readJsonFile(API_CONFIG_FILE);
    
    sendSuccess([
        'apis' => $apis,
        'count' => count($apis)
    ], 'API 목록 조회 성공');
}

// ========================================
// API 추가
// ========================================
function handleAddApi() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    validateRequiredFields($input, ['name', 'url']);
    
    $apis = readJsonFile(API_CONFIG_FILE);
    
    $newApi = [
        'id' => 'custom-' . time(),
        'name' => $input['name'],
        'url' => $input['url'],
        'apiKey' => $input['apiKey'] ?? '',
        'isActive' => $input['isActive'] ?? false,
        'source' => $input['source'] ?? $input['name'],
        'addedAt' => date('Y-m-d H:i:s'),
        'addedBy' => getCurrentUserId()
    ];
    
    $apis[] = $newApi;
    
    writeJsonFile(API_CONFIG_FILE, $apis);
    
    logUserActivity(getCurrentUserId(), "API 추가: {$newApi['name']}");
    
    sendSuccess($newApi, 'API가 추가되었습니다.');
}

// ========================================
// API 수정
// ========================================
function handleUpdateApi() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    validateRequiredFields($input, ['id']);
    
    $apiId = $input['id'];
    $apis = readJsonFile(API_CONFIG_FILE);
    $found = false;
    
    foreach ($apis as $index => $api) {
        if ($api['id'] === $apiId) {
            $found = true;
            
            // 업데이트 가능한 필드
            if (isset($input['name'])) $apis[$index]['name'] = $input['name'];
            if (isset($input['url'])) $apis[$index]['url'] = $input['url'];
            if (isset($input['apiKey'])) $apis[$index]['apiKey'] = $input['apiKey'];
            if (isset($input['source'])) $apis[$index]['source'] = $input['source'];
            
            $apis[$index]['updatedAt'] = date('Y-m-d H:i:s');
            $apis[$index]['updatedBy'] = getCurrentUserId();
            
            break;
        }
    }
    
    if (!$found) {
        sendError('API를 찾을 수 없습니다.', 404);
    }
    
    writeJsonFile(API_CONFIG_FILE, $apis);
    
    logUserActivity(getCurrentUserId(), "API 수정: {$apiId}");
    
    sendSuccess($apis[$index], 'API가 수정되었습니다.');
}

// ========================================
// API 삭제
// ========================================
function handleDeleteApi() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    validateRequiredFields($input, ['id']);
    
    $apiId = $input['id'];
    $apis = readJsonFile(API_CONFIG_FILE);
    
    $newApis = array_filter($apis, function($api) use ($apiId) {
        return $api['id'] !== $apiId;
    });
    
    if (count($newApis) === count($apis)) {
        sendError('API를 찾을 수 없습니다.', 404);
    }
    
    // 재인덱싱
    $newApis = array_values($newApis);
    
    writeJsonFile(API_CONFIG_FILE, $newApis);
    
    logUserActivity(getCurrentUserId(), "API 삭제: {$apiId}");
    
    sendSuccess(['id' => $apiId], 'API가 삭제되었습니다.');
}

// ========================================
// API 활성화/비활성화
// ========================================
function handleToggleApi() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    validateRequiredFields($input, ['id', 'isActive']);
    
    $apiId = $input['id'];
    $isActive = $input['isActive'];
    
    $apis = readJsonFile(API_CONFIG_FILE);
    $found = false;
    
    foreach ($apis as $index => $api) {
        if ($api['id'] === $apiId) {
            $found = true;
            $apis[$index]['isActive'] = $isActive;
            $apis[$index]['updatedAt'] = date('Y-m-d H:i:s');
            break;
        }
    }
    
    if (!$found) {
        sendError('API를 찾을 수 없습니다.', 404);
    }
    
    writeJsonFile(API_CONFIG_FILE, $apis);
    
    logUserActivity(getCurrentUserId(), "API 토글: {$apiId} - " . ($isActive ? '활성화' : '비활성화'));
    
    sendSuccess($apis[$index], 'API 상태가 변경되었습니다.');
}

?>