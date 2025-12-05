<?php
// event_api.php - 찜하기/좋아요 기능 API

require_once __DIR__ . '/config.php';

// 액션 파라미터
$action = $_GET['action'] ?? '';

// ========================================
// 라우팅
// ========================================

switch ($action) {
    case 'like':
        handleLikeEvent();
        break;
    
    case 'unlike':
        handleUnlikeEvent();
        break;
    
    case 'liked-list':
        handleGetLikedEvents();
        break;
    
    case 'check-liked':
        handleCheckLiked();
        break;
    
    default:
        sendError('잘못된 액션입니다.', 400);
}

// ========================================
// 찜하기 데이터 가져오기
// ========================================
function getLikedEventsData() {
    return readJsonFile(LIKED_EVENTS_FILE);
}

// ========================================
// 찜하기 데이터 저장
// ========================================
function saveLikedEventsData($data) {
    return writeJsonFile(LIKED_EVENTS_FILE, $data);
}

// ========================================
// 사용자의 찜한 이벤트 목록 가져오기
// ========================================
function getUserLikedEvents($userId) {
    $allLiked = getLikedEventsData();
    
    foreach ($allLiked as $item) {
        if ($item['userId'] === $userId) {
            return $item['events'] ?? [];
        }
    }
    
    return [];
}

// ========================================
// 이벤트 찜하기
// ========================================
function handleLikeEvent() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    requireLogin();
    
    $userId = getCurrentUserId();
    $input = json_decode(file_get_contents('php://input'), true);
    
    validateRequiredFields($input, ['eventId']);
    
    $eventId = $input['eventId'];
    $eventData = $input['eventData'] ?? null;
    
    $allLiked = getLikedEventsData();
    $userFound = false;
    
    // 사용자의 찜 목록 찾기
    foreach ($allLiked as $index => $item) {
        if ($item['userId'] === $userId) {
            $userFound = true;
            
            // 이미 찜한 이벤트인지 확인
            $alreadyLiked = false;
            foreach ($item['events'] as $event) {
                if ($event['id'] === $eventId) {
                    $alreadyLiked = true;
                    break;
                }
            }
            
            if ($alreadyLiked) {
                sendError('이미 찜한 이벤트입니다.', 409);
            }
            
            // 이벤트 추가
            $newEvent = [
                'id' => $eventId,
                'likedAt' => date('Y-m-d H:i:s')
            ];
            
            // eventData가 있으면 포함
            if ($eventData) {
                $newEvent['data'] = $eventData;
            }
            
            $allLiked[$index]['events'][] = $newEvent;
            break;
        }
    }
    
    // 사용자가 없으면 새로 생성
    if (!$userFound) {
        $newEvent = [
            'id' => $eventId,
            'likedAt' => date('Y-m-d H:i:s')
        ];
        
        if ($eventData) {
            $newEvent['data'] = $eventData;
        }
        
        $allLiked[] = [
            'userId' => $userId,
            'events' => [$newEvent]
        ];
    }
    
    // 저장
    if (saveLikedEventsData($allLiked)) {
        logUserActivity($userId, "이벤트 찜하기: {$eventId}");
        sendSuccess(['eventId' => $eventId], '이벤트를 찜했습니다.');
    } else {
        sendError('찜하기 처리 중 오류가 발생했습니다.', 500);
    }
}

// ========================================
// 이벤트 찜 취소
// ========================================
function handleUnlikeEvent() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('POST 요청만 허용됩니다.', 405);
    }
    
    requireLogin();
    
    $userId = getCurrentUserId();
    $input = json_decode(file_get_contents('php://input'), true);
    
    validateRequiredFields($input, ['eventId']);
    
    $eventId = $input['eventId'];
    
    $allLiked = getLikedEventsData();
    $found = false;
    
    // 사용자의 찜 목록에서 제거
    foreach ($allLiked as $index => $item) {
        if ($item['userId'] === $userId) {
            $events = $item['events'];
            $filteredEvents = [];
            
            foreach ($events as $event) {
                if ($event['id'] !== $eventId) {
                    $filteredEvents[] = $event;
                } else {
                    $found = true;
                }
            }
            
            $allLiked[$index]['events'] = $filteredEvents;
            break;
        }
    }
    
    if (!$found) {
        sendError('찜하지 않은 이벤트입니다.', 404);
    }
    
    // 저장
    if (saveLikedEventsData($allLiked)) {
        logUserActivity($userId, "이벤트 찜 취소: {$eventId}");
        sendSuccess(['eventId' => $eventId], '찜을 취소했습니다.');
    } else {
        sendError('찜 취소 처리 중 오류가 발생했습니다.', 500);
    }
}

// ========================================
// 찜한 이벤트 목록 조회
// ========================================
function handleGetLikedEvents() {
    requireLogin();
    
    $userId = getCurrentUserId();
    $likedEvents = getUserLikedEvents($userId);
    
    sendSuccess([
        'events' => $likedEvents,
        'count' => count($likedEvents)
    ], '찜한 이벤트 목록 조회 성공');
}

// ========================================
// 특정 이벤트 찜 여부 확인
// ========================================
function handleCheckLiked() {
    requireLogin();
    
    $userId = getCurrentUserId();
    $eventId = $_GET['eventId'] ?? '';
    
    if (empty($eventId)) {
        sendError('eventId가 필요합니다.', 400);
    }
    
    $likedEvents = getUserLikedEvents($userId);
    $isLiked = false;
    
    foreach ($likedEvents as $event) {
        if ($event['id'] === $eventId) {
            $isLiked = true;
            break;
        }
    }
    
    sendSuccess([
        'eventId' => $eventId,
        'isLiked' => $isLiked
    ]);
}
?>