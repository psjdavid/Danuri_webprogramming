<?php
// 학번: 202300771 이름: 박성준
// simple_backend.php - 간단한 JSON 기반 백엔드 (개선 버전)

// CORS 허용
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// OPTIONS 요청 처리
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 파일 경로
$USERS_FILE = __DIR__ . '/data/users.json';
$LIKED_FILE = __DIR__ . '/data/liked_events.json';

// 디렉토리 생성
if (!file_exists(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

// 초기 데이터
if (!file_exists($USERS_FILE)) {
    $defaultUsers = [
        [
            'id' => 'admin',
            'name' => '관리자',
            'email' => 'admin@danuri.com',
            'password' => 'cse',
            'isAdmin' => true,
            'joinDate' => date('Y-m-d')
        ]
    ];
    file_put_contents($USERS_FILE, json_encode($defaultUsers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if (!file_exists($LIKED_FILE)) {
    file_put_contents($LIKED_FILE, json_encode([], JSON_PRETTY_PRINT));
}

// 요청 처리
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'register':
        handleRegister();
        break;
    case 'get_profile':
        handleGetProfile();
        break;
    case 'update_profile':
        handleUpdateProfile();
        break;
    case 'get_liked':
        handleGetLiked();
        break;
    case 'add_liked':
        handleAddLiked();
        break;
    case 'remove_liked':
        handleRemoveLiked();
        break;
    default:
        sendError('Invalid action');
}

// ========================================
// 로그인
// ========================================
function handleLogin() {
    global $USERS_FILE;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($id) || empty($password)) {
        sendError('아이디와 비밀번호를 입력해주세요');
        return;
    }
    
    $users = json_decode(file_get_contents($USERS_FILE), true);
    
    foreach ($users as $user) {
        if ($user['id'] === $id) {
            // 비밀번호 확인 (평문 또는 해시)
            $passwordMatch = false;
            
            if ($user['password'] === $password) {
                // 평문 비밀번호 (개발용)
                $passwordMatch = true;
            } elseif (password_verify($password, $user['password'])) {
                // 해시 비밀번호 (bcrypt)
                $passwordMatch = true;
            }
            
            if ($passwordMatch) {
                // 마지막 로그인 업데이트
                $user['lastLogin'] = date('Y-m-d H:i:s');
                updateUser($user);
                
                unset($user['password']);
                sendSuccess([
                    'user' => $user,
                    'isAdmin' => $user['isAdmin'] ?? false
                ], '로그인 성공');
                return;
            } else {
                sendError('비밀번호가 일치하지 않습니다');
                return;
            }
        }
    }
    
    sendError('존재하지 않는 아이디입니다');
}

// ========================================
// 회원가입
// ========================================
function handleRegister() {
    global $USERS_FILE;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($id) || empty($name) || empty($email) || empty($password)) {
        sendError('모든 필드를 입력해주세요');
        return;
    }
    
    $users = json_decode(file_get_contents($USERS_FILE), true);
    
    // 중복 체크
    foreach ($users as $user) {
        if ($user['id'] === $id) {
            sendError('이미 존재하는 아이디입니다');
            return;
        }
        if ($user['email'] === $email) {
            sendError('이미 사용 중인 이메일입니다');
            return;
        }
    }
    
    $newUser = [
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'password' => $password, // 개발용: 평문 저장
        'isAdmin' => false,
        'joinDate' => date('Y-m-d'),
        'lastLogin' => null
    ];
    
    $users[] = $newUser;
    file_put_contents($USERS_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    unset($newUser['password']);
    sendSuccess($newUser, '회원가입 성공');
}

// ========================================
// 사용자 업데이트 (내부 함수)
// ========================================
function updateUser($updatedUser) {
    global $USERS_FILE;
    
    $users = json_decode(file_get_contents($USERS_FILE), true);
    
    foreach ($users as $index => $user) {
        if ($user['id'] === $updatedUser['id']) {
            $users[$index] = $updatedUser;
            file_put_contents($USERS_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return true;
        }
    }
    
    return false;
}

// ========================================
// 프로필 조회
// ========================================
function handleGetProfile() {
    global $USERS_FILE;
    
    $userId = $_GET['userId'] ?? '';
    
    error_log('=== GET PROFILE ===');
    error_log('userId: ' . $userId);
    
    if (empty($userId)) {
        sendError('사용자 ID가 필요합니다');
        return;
    }
    
    $users = json_decode(file_get_contents($USERS_FILE), true);
    
    foreach ($users as $user) {
        if ($user['id'] === $userId) {
            unset($user['password']);
            error_log('사용자 찾음: ' . json_encode($user));
            error_log('관심사: ' . json_encode($user['profile']['interests'] ?? null));
            sendSuccess($user);
            return;
        }
    }
    
    sendError('사용자를 찾을 수 없습니다');
}

// ========================================
// 프로필 수정
// ========================================
function handleUpdateProfile() {
    global $USERS_FILE;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? '';
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $interests = $input['interests'] ?? null;
    
    error_log('=== UPDATE PROFILE ===');
    error_log('userId: ' . $userId);
    error_log('name: ' . $name);
    error_log('email: ' . $email);
    error_log('interests: ' . json_encode($interests));
    
    if (empty($userId)) {
        sendError('사용자 ID가 필요합니다');
        return;
    }
    
    $users = json_decode(file_get_contents($USERS_FILE), true);
    
    foreach ($users as $index => $user) {
        if ($user['id'] === $userId) {
            if (!empty($name)) {
                $users[$index]['name'] = $name;
            }
            
            if (!empty($email)) {
                $users[$index]['email'] = $email;
            }
            
            if ($interests !== null) {
                if (!isset($users[$index]['profile'])) {
                    $users[$index]['profile'] = [];
                }
                $users[$index]['profile']['interests'] = $interests;
                error_log('관심사 저장됨: ' . json_encode($users[$index]['profile']['interests']));
            }
            
            $saved = file_put_contents($USERS_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            error_log('파일 저장 결과: ' . ($saved !== false ? 'SUCCESS' : 'FAILED'));
            
            unset($users[$index]['password']);
            error_log('반환 데이터: ' . json_encode($users[$index]));
            sendSuccess($users[$index], '프로필 업데이트 성공');
            return;
        }
    }
    
    sendError('사용자를 찾을 수 없습니다');
}

// ========================================
// 찜한 이벤트 조회
// ========================================
function handleGetLiked() {
    global $LIKED_FILE;
    
    $userId = $_GET['userId'] ?? '';
    
    if (empty($userId)) {
        sendError('사용자 ID가 필요합니다');
        return;
    }
    
    $liked = json_decode(file_get_contents($LIKED_FILE), true);
    $userLiked = $liked[$userId] ?? [];
    
    // 객체를 배열로 변환
    $events = [];
    foreach ($userLiked as $eventId => $eventData) {
        $events[] = $eventData;
    }
    
    sendSuccess(['events' => $events, 'count' => count($events)]);
}

// ========================================
// 찜하기
// ========================================
function handleAddLiked() {
    global $LIKED_FILE;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? '';
    $eventId = $input['eventId'] ?? '';
    $eventData = $input['eventData'] ?? null;
    
    if (empty($userId) || empty($eventId)) {
        sendError('사용자 ID와 이벤트 ID가 필요합니다');
        return;
    }
    
    $liked = json_decode(file_get_contents($LIKED_FILE), true);
    
    if (!isset($liked[$userId])) {
        $liked[$userId] = [];
    }
    
    $liked[$userId][$eventId] = $eventData;
    
    file_put_contents($LIKED_FILE, json_encode($liked, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    sendSuccess(['eventId' => $eventId], '찜하기 성공');
}

// ========================================
// 찜 취소
// ========================================
function handleRemoveLiked() {
    global $LIKED_FILE;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? '';
    $eventId = $input['eventId'] ?? '';
    
    if (empty($userId) || empty($eventId)) {
        sendError('사용자 ID와 이벤트 ID가 필요합니다');
        return;
    }
    
    $liked = json_decode(file_get_contents($LIKED_FILE), true);
    
    if (isset($liked[$userId][$eventId])) {
        unset($liked[$userId][$eventId]);
        file_put_contents($LIKED_FILE, json_encode($liked, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        sendSuccess(['eventId' => $eventId], '찜 취소 성공');
    } else {
        sendError('찜하지 않은 이벤트입니다');
    }
}

// ========================================
// 응답 함수
// ========================================
function sendSuccess($data = null, $message = 'Success') {
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function sendError($message = 'Error', $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
?>