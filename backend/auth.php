<?php
// 학번: 202300771 이름: 박성준
// auth.php - 로그인/로그아웃/세션 체크 API

require_once 'config.php';

// 요청 메서드 가져오기
$method = $_SERVER['REQUEST_METHOD'];

// 액션 파라미터
$action = $_GET['action'] ?? '';

// ========================================
// 라우팅
// ========================================

switch ($action) {
    case 'login':
        handleLogin();
        break;
    
    case 'logout':
        handleLogout();
        break;
    
    case 'check':
        handleCheckSession();
        break;
    
    case 'session':
        handleGetSession();
        break;
    
    default:
        sendError('잘못된 액션입니다.', 400);
}

// ========================================
// 로그인 처리
// ========================================
function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    // 요청 데이터 가져오기
    $input = json_decode(file_get_contents('php://input'), true);
    
    // 필수 필드 확인
    validateRequiredFields($input, ['id', 'password']);
    
    $userId = trim($input['id']);
    $password = trim($input['password']);
    
    // 사용자 찾기
    $user = findUserById($userId);
    
    if (!$user) {
        logMessage("로그인 실패: 존재하지 않는 사용자 - {$userId}", 'AUTH');
        sendError('아이디 또는 비밀번호가 일치하지 않습니다.', 401);
    }
    
    // 비밀번호 확인
    if (!password_verify($password, $user['password'])) {
        logMessage("로그인 실패: 비밀번호 불일치 - {$userId}", 'AUTH');
        sendError('아이디 또는 비밀번호가 일치하지 않습니다.', 401);
    }
    
    // 세션 설정
    $_SESSION['userId'] = $user['id'];
    $_SESSION['userName'] = $user['name'];
    $_SESSION['userEmail'] = $user['email'];
    $_SESSION['isAdmin'] = isset($user['isAdmin']) ? $user['isAdmin'] : false;
    $_SESSION['loginTime'] = time();
    
    // 마지막 로그인 시간 업데이트
    $user['lastLogin'] = date('Y-m-d H:i:s');
    saveUser($user);
    
    logUserActivity($userId, '로그인');
    
    // 비밀번호 제외하고 응답
    unset($user['password']);
    
    sendSuccess([
        'user' => $user,
        'isAdmin' => $_SESSION['isAdmin']
    ], '로그인 성공');
}

// ========================================
// 로그아웃 처리
// ========================================
function handleLogout() {
    $userId = getCurrentUserId();
    
    if ($userId) {
        logUserActivity($userId, '로그아웃');
    }
    
    // 세션 파괴
    session_unset();
    session_destroy();
    
    // 새 세션 시작 (CSRF 방지)
    session_start();
    
    sendSuccess(null, '로그아웃 성공');
}

// ========================================
// 세션 확인
// ========================================
function handleCheckSession() {
    if (isLoggedIn()) {
        $userId = getCurrentUserId();
        $user = findUserById($userId);
        
        if ($user) {
            unset($user['password']);
            
            sendSuccess([
                'isLoggedIn' => true,
                'user' => $user,
                'isAdmin' => isAdmin()
            ], '로그인 상태입니다.');
        }
    }
    
    sendSuccess([
        'isLoggedIn' => false,
        'user' => null,
        'isAdmin' => false
    ], '로그인되지 않았습니다.');
}

// ========================================
// 세션 정보 가져오기
// ========================================
function handleGetSession() {
    if (!isLoggedIn()) {
        sendSuccess([
            'isLoggedIn' => false,
            'userId' => null,
            'userName' => null,
            'userEmail' => null,
            'isAdmin' => false
        ]);
    }
    
    sendSuccess([
        'isLoggedIn' => true,
        'userId' => $_SESSION['userId'],
        'userName' => $_SESSION['userName'],
        'userEmail' => $_SESSION['userEmail'],
        'isAdmin' => isAdmin(),
        'loginTime' => $_SESSION['loginTime']
    ]);
}

?>