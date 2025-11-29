<?php
// 학번: 202300771 이름: 박성준
// user_api.php - 회원가입 및 사용자 관리 API

require_once 'config.php';

// 액션 파라미터
$action = $_GET['action'] ?? '';

// ========================================
// 라우팅
// ========================================

switch ($action) {
    case 'register':
        handleRegister();
        break;
    
    case 'profile':
        handleGetProfile();
        break;
    
    case 'update':
        handleUpdateProfile();
        break;
    
    case 'change-password':
        handleChangePassword();
        break;
    
    default:
        sendError('잘못된 액션입니다.', 400);
}

// ========================================
// 회원가입
// ========================================
function handleRegister() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    // 요청 데이터 가져오기
    $input = json_decode(file_get_contents('php://input'), true);
    
    // 필수 필드 확인
    validateRequiredFields($input, ['id', 'password', 'name', 'email']);
    
    $userId = trim($input['id']);
    $password = trim($input['password']);
    $name = trim($input['name']);
    $email = trim($input['email']);
    
    // 입력 검증
    if (strlen($userId) < 4) {
        sendError('아이디는 최소 4자 이상이어야 합니다.', 400);
    }
    
    if (!isValidPassword($password)) {
        sendError('비밀번호는 최소 4자 이상이어야 합니다.', 400);
    }
    
    if (!isValidEmail($email)) {
        sendError('유효하지 않은 이메일 형식입니다.', 400);
    }
    
    // 중복 확인
    if (findUserById($userId)) {
        sendError('이미 존재하는 아이디입니다.', 409);
    }
    
    if (findUserByEmail($email)) {
        sendError('이미 사용 중인 이메일입니다.', 409);
    }
    
    // 관리자 아이디 예약어 확인
    if (strtolower($userId) === ADMIN_ID) {
        sendError('사용할 수 없는 아이디입니다.', 400);
    }
    
    // 새 사용자 생성
    $newUser = [
        'id' => $userId,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'name' => $name,
        'email' => $email,
        'isAdmin' => false,
        'joinDate' => date('Y-m-d'),
        'lastLogin' => null,
        'profile' => [
            'bio' => '',
            'location' => '',
            'interests' => []
        ]
    ];
    
    // 저장
    if (saveUser($newUser)) {
        logUserActivity($userId, '회원가입');
        
        // 비밀번호 제외하고 응답
        unset($newUser['password']);
        
        sendSuccess($newUser, '회원가입이 완료되었습니다.');
    } else {
        sendError('회원가입 처리 중 오류가 발생했습니다.', 500);
    }
}

// ========================================
// 프로필 조회
// ========================================
function handleGetProfile() {
    requireLogin();
    
    $userId = getCurrentUserId();
    $user = findUserById($userId);
    
    if (!$user) {
        sendError('사용자를 찾을 수 없습니다.', 404);
    }
    
    // 비밀번호 제외
    unset($user['password']);
    
    sendSuccess($user, '프로필 조회 성공');
}

// ========================================
// 프로필 업데이트
// ========================================
function handleUpdateProfile() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    requireLogin();
    
    $userId = getCurrentUserId();
    $user = findUserById($userId);
    
    if (!$user) {
        sendError('사용자를 찾을 수 없습니다.', 404);
    }
    
    // 요청 데이터 가져오기
    $input = json_decode(file_get_contents('php://input'), true);
    
    // 업데이트 가능한 필드
    if (isset($input['name']) && !empty(trim($input['name']))) {
        $user['name'] = trim($input['name']);
        $_SESSION['userName'] = $user['name'];
    }
    
    if (isset($input['email']) && !empty(trim($input['email']))) {
        $email = trim($input['email']);
        
        if (!isValidEmail($email)) {
            sendError('유효하지 않은 이메일 형식입니다.', 400);
        }
        
        // 다른 사용자가 사용 중인지 확인
        $existingUser = findUserByEmail($email);
        if ($existingUser && $existingUser['id'] !== $userId) {
            sendError('이미 사용 중인 이메일입니다.', 409);
        }
        
        $user['email'] = $email;
        $_SESSION['userEmail'] = $email;
    }
    
    // 프로필 추가 정보
    if (isset($input['profile'])) {
        if (!isset($user['profile'])) {
            $user['profile'] = [];
        }
        
        if (isset($input['profile']['bio'])) {
            $user['profile']['bio'] = trim($input['profile']['bio']);
        }
        
        if (isset($input['profile']['location'])) {
            $user['profile']['location'] = trim($input['profile']['location']);
        }
        
        if (isset($input['profile']['interests']) && is_array($input['profile']['interests'])) {
            $user['profile']['interests'] = $input['profile']['interests'];
        }
    }
    
    // 저장
    if (saveUser($user)) {
        logUserActivity($userId, '프로필 업데이트');
        
        // 비밀번호 제외
        unset($user['password']);
        
        sendSuccess($user, '프로필이 업데이트되었습니다.');
    } else {
        sendError('프로필 업데이트 중 오류가 발생했습니다.', 500);
    }
}

// ========================================
// 비밀번호 변경
// ========================================
function handleChangePassword() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    requireLogin();
    
    $userId = getCurrentUserId();
    $user = findUserById($userId);
    
    if (!$user) {
        sendError('사용자를 찾을 수 없습니다.', 404);
    }
    
    // 요청 데이터 가져오기
    $input = json_decode(file_get_contents('php://input'), true);
    
    validateRequiredFields($input, ['currentPassword', 'newPassword']);
    
    $currentPassword = $input['currentPassword'];
    $newPassword = $input['newPassword'];
    
    // 현재 비밀번호 확인
    if (!password_verify($currentPassword, $user['password'])) {
        sendError('현재 비밀번호가 일치하지 않습니다.', 401);
    }
    
    // 새 비밀번호 검증
    if (!isValidPassword($newPassword)) {
        sendError('새 비밀번호는 최소 4자 이상이어야 합니다.', 400);
    }
    
    // 같은 비밀번호인지 확인
    if ($currentPassword === $newPassword) {
        sendError('현재 비밀번호와 동일합니다.', 400);
    }
    
    // 비밀번호 업데이트
    $user['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
    
    if (saveUser($user)) {
        logUserActivity($userId, '비밀번호 변경');
        sendSuccess(null, '비밀번호가 변경되었습니다.');
    } else {
        sendError('비밀번호 변경 중 오류가 발생했습니다.', 500);
    }
}

?>