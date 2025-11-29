// 학번: 202300771 이름: 박성준
// chat_page.js - 채팅 페이지 인터랙션 처리 (서버 연동 준비 버전)

// ========================================
// DOM 요소 선택
// ========================================
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const participantsSidebar = document.getElementById('participantsSidebar');
const toggleParticipantsBtn = document.getElementById('toggleParticipants');
const closeSidebarBtn = document.getElementById('closeSidebar');
const typingIndicator = document.getElementById('typingIndicator');

// ========================================
// 유틸리티 함수
// ========================================

// URL 파라미터 헬퍼
function getParam(name, fallback = null) {
    const v = new URLSearchParams(location.search).get(name);
    return v ?? fallback;
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 스크롤을 최하단으로
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 시간 포맷팅 (오전/오후 형식)
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}:${String(minutes).padStart(2, '0')}`;
}

// ========================================
// API 통신 함수 (서버 연동 준비)
// ========================================

// 이벤트 정보 가져오기
async function loadEventInfo(eventId) {
    try {
        // TODO: 실제 서버 API 엔드포인트로 변경 필요
        // const response = await fetch(`/api/events/${eventId}`);
        // const data = await response.json();
        
        // 서버 연동 전까지 localStorage에서 가져오기
        const eventsData = localStorage.getItem('eventsData');
        if (eventsData) {
            const events = JSON.parse(eventsData);
            const event = events.find(e => e.id === eventId);
            
            if (event) {
                updateEventUI(event);
                return event;
            }
        }
        
        // 기본 정보 표시
        updateEventUI({
            title: '이벤트 정보 없음',
            date: '날짜 정보 없음',
            image: 'https://via.placeholder.com/60x60/667eea/ffffff?text=?'
        });
        
    } catch (error) {
        console.error('이벤트 정보 로드 실패:', error);
        showNotification('이벤트 정보를 불러올 수 없습니다');
    }
}

// 이벤트 UI 업데이트
function updateEventUI(event) {
    const titleEl = document.getElementById('eventTitle');
    const dateEl = document.getElementById('eventDate');
    const imgEl = document.getElementById('eventImage');
    
    if (titleEl) titleEl.textContent = event.title || '제목 없음';
    if (dateEl) dateEl.textContent = event.date || '📅 날짜 정보 없음';
    if (imgEl) imgEl.src = event.image || 'https://via.placeholder.com/60x60/667eea/ffffff?text=?';
    
    // 페이지 타이틀 업데이트
    document.title = `채팅 - ${event.title || '다누리'}`;
}

// 채팅 메시지 가져오기
async function loadMessages(eventId) {
    try {
        // TODO: 실제 서버 API 엔드포인트로 변경 필요
        // const response = await fetch(`/api/chats/${eventId}/messages`);
        // const messages = await response.json();
        // messages.forEach(msg => renderMessage(msg));
        
        // 서버 연동 전: 시스템 메시지만 표시
        const systemMessage = createSystemMessage('🎉 채팅방에 입장하셨습니다. 다른 참석자들과 함께 이야기를 나눠보세요!');
        messagesContainer.insertBefore(systemMessage, typingIndicator);
        
    } catch (error) {
        console.error('메시지 로드 실패:', error);
        showNotification('메시지를 불러올 수 없습니다');
    }
}

// 참석자 목록 가져오기
async function loadParticipants(eventId) {
    try {
        // TODO: 실제 서버 API 엔드포인트로 변경 필요
        // const response = await fetch(`/api/chats/${eventId}/participants`);
        // const participants = await response.json();
        // renderParticipants(participants);
        
        // 서버 연동 전: 참석자 수만 0으로 표시
        updateParticipantCount(0);
        
    } catch (error) {
        console.error('참석자 목록 로드 실패:', error);
        showNotification('참석자 목록을 불러올 수 없습니다');
    }
}

// 메시지 전송
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (message === '') return;
    
    try {
        // 내 메시지 UI에 즉시 추가
        const messageElement = createMyMessage(message);
        messagesContainer.insertBefore(messageElement, typingIndicator);
        
        // 입력창 초기화
        messageInput.value = '';
        scrollToBottom();
        
        // TODO: 실제 서버로 메시지 전송
        // const eventId = getParam('id', '1');
        // const response = await fetch(`/api/chats/${eventId}/messages`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         message: message,
        //         timestamp: new Date().toISOString()
        //     })
        // });
        
        // if (!response.ok) {
        //     throw new Error('메시지 전송 실패');
        // }
        
        console.log('메시지 전송 (서버 연동 대기 중):', message);
        
    } catch (error) {
        console.error('메시지 전송 실패:', error);
        showNotification('메시지 전송에 실패했습니다');
    }
}

// ========================================
// UI 렌더링 함수
// ========================================

// 시스템 메시지 생성
function createSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
    return messageDiv;
}

// 날짜 구분선 생성
function createDateDivider(dateText) {
    const divider = document.createElement('div');
    divider.className = 'date-divider';
    divider.innerHTML = `<span>${escapeHtml(dateText)}</span>`;
    return divider;
}

// 내 메시지 생성
function createMyMessage(text, timestamp = new Date()) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mine';
    
    const timeString = formatTime(timestamp);
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-bubble">
                ${escapeHtml(text)}
            </div>
        </div>
    `;
    
    return messageDiv;
}

// 상대방 메시지 생성
function createOtherMessage(author, text, avatarColor = '10b981', timestamp = new Date()) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message other';
    
    const timeString = formatTime(timestamp);
    const initial = author.charAt(0);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="https://via.placeholder.com/40x40/${avatarColor}/ffffff?text=${initial}" alt="${author}">
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${escapeHtml(author)}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-bubble">
                ${escapeHtml(text)}
            </div>
        </div>
    `;
    
    return messageDiv;
}

// 메시지 렌더링 (서버 데이터 기반)
function renderMessage(messageData) {
    let messageElement;
    
    if (messageData.type === 'system') {
        messageElement = createSystemMessage(messageData.text);
    } else if (messageData.isMine) {
        messageElement = createMyMessage(messageData.text, new Date(messageData.timestamp));
    } else {
        messageElement = createOtherMessage(
            messageData.author,
            messageData.text,
            messageData.avatarColor,
            new Date(messageData.timestamp)
        );
    }
    
    messagesContainer.insertBefore(messageElement, typingIndicator);
}

// 참석자 수 업데이트
function updateParticipantCount(count) {
    const countEl = document.getElementById('participantCount');
    const totalEl = document.getElementById('totalParticipants');
    
    if (countEl) countEl.textContent = `👥 ${count}`;
    if (totalEl) totalEl.textContent = count;
}

// 참석자 목록 렌더링 (서버 데이터 기반)
function renderParticipants(participants) {
    const listEl = document.getElementById('participantsList');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    // 온라인 참석자
    const online = participants.filter(p => p.isOnline);
    const offline = participants.filter(p => !p.isOnline);
    
    if (online.length > 0) {
        const onlineGroup = document.createElement('div');
        onlineGroup.className = 'participant-group';
        onlineGroup.innerHTML = `<div class="group-title">온라인 (${online.length})</div>`;
        
        online.forEach(participant => {
            onlineGroup.appendChild(createParticipantItem(participant, true));
        });
        
        listEl.appendChild(onlineGroup);
    }
    
    if (offline.length > 0) {
        const offlineGroup = document.createElement('div');
        offlineGroup.className = 'participant-group';
        offlineGroup.innerHTML = `<div class="group-title">오프라인 (${offline.length})</div>`;
        
        offline.forEach(participant => {
            offlineGroup.appendChild(createParticipantItem(participant, false));
        });
        
        listEl.appendChild(offlineGroup);
    }
    
    updateParticipantCount(participants.length);
}

// 참석자 아이템 생성
function createParticipantItem(participant, isOnline) {
    const item = document.createElement('div');
    item.className = `participant-item ${isOnline ? 'online' : ''} ${participant.isMe ? 'me' : ''}`;
    
    const initial = participant.name.charAt(0);
    const onlineBadge = isOnline ? '<span class="online-badge"></span>' : '';
    const nameDisplay = participant.isMe ? `${participant.name} (나)` : participant.name;
    const status = isOnline ? '활동 중' : participant.lastSeen || '오프라인';
    
    item.innerHTML = `
        <div class="participant-avatar">
            <img src="https://via.placeholder.com/40x40/${participant.avatarColor || '94a3b8'}/ffffff?text=${initial}" 
                 alt="${participant.name}">
            ${onlineBadge}
        </div>
        <div class="participant-info">
            <div class="participant-name">${escapeHtml(nameDisplay)}</div>
            <div class="participant-status">${escapeHtml(status)}</div>
        </div>
    `;
    
    item.addEventListener('click', () => {
        console.log('참석자 프로필:', participant.name);
        // TODO: 프로필 모달 표시
    });
    
    return item;
}

// ========================================
// 이벤트 핸들러
// ========================================

// 참석자 사이드바 토글
function toggleParticipantsSidebar() {
    participantsSidebar.classList.toggle('hidden');
}

// 엔터 키로 메시지 전송
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 전송 버튼 클릭
sendBtn.addEventListener('click', sendMessage);

// 참석자 목록 토글
toggleParticipantsBtn.addEventListener('click', toggleParticipantsSidebar);
closeSidebarBtn.addEventListener('click', toggleParticipantsSidebar);

// 참석자 검색
const searchParticipantsInput = document.querySelector('.search-participants .search-input');
searchParticipantsInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const participants = document.querySelectorAll('.participant-item');
    
    participants.forEach(participant => {
        const name = participant.querySelector('.participant-name').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            participant.style.display = 'flex';
        } else {
            participant.style.display = 'none';
        }
    });
});

// 파일 첨부 버튼
document.querySelector('.attach-btn').addEventListener('click', () => {
    console.log('파일 첨부 기능 (서버 연동 후 구현 예정)');
    showNotification('파일 첨부 기능은 서버 연동 후 사용 가능합니다');
});

// 이모지 버튼
document.querySelector('.emoji-btn').addEventListener('click', () => {
    console.log('이모지 선택 기능 (서버 연동 후 구현 예정)');
    showNotification('이모지 선택 기능은 서버 연동 후 사용 가능합니다');
});

// 뒤로 가기 버튼
document.querySelector('.back-btn').addEventListener('click', () => {
    if (confirm('채팅방을 나가시겠습니까?')) {
        const eventId = getParam('id', '1');
        window.location.href = `event_detail.html?id=${eventId}`;
    }
});

// ========================================
// 알림 토스트
// ========================================

function showNotification(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 16px 32px;
        border-radius: 50px;
        font-size: 15px;
        font-weight: 500;
        z-index: 10000;
        animation: slideUp 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 애니메이션 CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
    }
`;
document.head.appendChild(style);

// ========================================
// 페이지 초기화
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('채팅 페이지 로드 시작');
    
    const eventId = getParam('id', '1');
    
    // 이벤트 정보 로드
    await loadEventInfo(eventId);
    
    // 채팅 메시지 로드
    await loadMessages(eventId);
    
    // 참석자 목록 로드
    await loadParticipants(eventId);
    
    // 스크롤을 최하단으로
    scrollToBottom();
    
    // 입력창에 포커스
    messageInput.focus();
    
    // 반응형 사이드바 처리
    if (window.innerWidth <= 1024) {
        participantsSidebar.classList.add('hidden');
    }
    
    console.log('채팅 페이지 로드 완료 (서버 연동 대기 중)');
});

// 반응형 처리
window.addEventListener('resize', () => {
    if (window.innerWidth <= 1024) {
        participantsSidebar.classList.add('hidden');
    }
});