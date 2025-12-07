<?php
// auth.php - 로그인/로그아웃/세션 체크 API
// 사용자 맞춤형이라는 의의를 가집니다.

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once 'config.php';


// 요청 메서드 가져오기
$method = $_SERVER['REQUEST_METHOD'];

// 액션 파라미터
$action = $_GET['action'] ?? '';

// ========================================
// 라우팅
// ========================================

switch ($action) {
    case 'kakao_login':
        handleKakaoLogin();
        break;
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
// 카카오 로그인 (DB/세션 없이 최소 버전)
// ========================================
function handleKakaoLogin()
{
    // Kakao 앱 설정값 (네 계정 기준으로 정확히!)
    $REST_API_KEY = '09366b1c3edaf5e97dc412e15286f95d';              // REST API 키
    $REDIRECT_URI = 'http://localhost/TP/kakao_callback.html';       // 콘솔에 등록한 리다이렉트 URI

    try {
        // 1) 콜백에서 온 JSON 바디에서 code 꺼내기
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data || !isset($data['code'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => '카카오 인가 코드(code)가 없습니다.',
                'data'    => null,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $code = $data['code'];

        // 2) 인가 코드 -> 액세스 토큰 요청
        $tokenUrl = 'https://kauth.kakao.com/oauth/token';
        $postData = http_build_query([
            'grant_type'   => 'authorization_code',
            'client_id'    => $REST_API_KEY,   // ★ REST API 키
            'redirect_uri' => $REDIRECT_URI,
            'code'         => $code,
            // 클라이언트 시크릿 기능을 켜두었다면 여기에 'client_secret' => '시크릿코드'
        ], '', '&');

        $tokenContext = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content'       => $postData,
                'timeout'       => 10,
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer'      => false,   // 로컬 개발용 (운영에서는 true)
                'verify_peer_name' => false,
            ],
        ]);

        $tokenRes = @file_get_contents($tokenUrl, false, $tokenContext);
        if ($tokenRes === false) {
            $e   = error_get_last();
            $msg = $e['message'] ?? '알 수 없는 오류';
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => '카카오 토큰 요청 실패: ' . $msg,
                'data'    => null,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $tokenData = json_decode($tokenRes, true);
        if (!isset($tokenData['access_token'])) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => '카카오 토큰 에러 응답: ' . $tokenRes,
                'data'    => null,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $accessToken = $tokenData['access_token'];

        // 3) 액세스 토큰으로 사용자 정보 요청
        $userUrl = 'https://kapi.kakao.com/v2/user/me';
        $userContext = stream_context_create([
            'http' => [
                'method'        => 'GET',
                'header'        =>
                    "Authorization: Bearer {$accessToken}\r\n" .
                    "Content-Type: application/x-www-form-urlencoded;charset=utf-8\r\n",
                'timeout'       => 10,
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer'      => false,
                'verify_peer_name' => false,
            ],
        ]);

        $userRes = @file_get_contents($userUrl, false, $userContext);
        if ($userRes === false) {
            $e   = error_get_last();
            $msg = $e['message'] ?? '알 수 없는 오류';
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => '카카오 사용자 정보 요청 실패: ' . $msg,
                'data'    => null,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $userData = json_decode($userRes, true);
        if (!isset($userData['id'])) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => '카카오 사용자 정보 에러: ' . $userRes,
                'data'    => null,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // 카카오에서 받은 기본 정보만 그대로 돌려주는 테스트용 응답
        $kakaoId  = $userData['id'];
        $nickname = $userData['properties']['nickname'] ?? '카카오 사용자';

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => '카카오 로그인 테스트 성공',
            'data'    => [
                'kakaoId'   => $kakaoId,
                'nickname'  => $nickname,
                'raw'       => $userData, // 디버깅용 전체 데이터
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;

    } catch (Throwable $e) {  // PHP 7 이상
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => '서버 내부 오류: ' . $e->getMessage(),
            'data'    => $e->getTraceAsString(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

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
        $user = findUserByEmail($userId);
    }

    if (!$user) {
        logMessage("로그인 실패: 존재하지 않는 사용자 - {$userId}", 'AUTH');
        sendError('아이디 또는 비밀번호가 일치하지 않습니다.', 401);
    }
    
    // 비밀번호 확인 (평문 + 해시 둘 다 허용)
    $match = false;

    if ($user['password'] === $password) {
        $match = true;
    } elseif (password_verify($password, $user['password'])) {
        $match = true;
    }

    if (!$match) {
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