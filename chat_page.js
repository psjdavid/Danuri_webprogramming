// 학번: 202300771 이름: 박성준
// chat_page.js - 다누리 채팅 페이지 (폴링 기반 실시간 채팅)

// ========================================
// 설정 / 전역 상태
// ========================================

const BACKEND_BASE = '/TP/backend';
const CHAT_API = `${BACKEND_BASE}/chat_api.php`;

let messageInput;
let sendBtn;
let messagesContainer;
let toggleParticipantsBtn;
let participantCountEl;
let backBtn;
let emojiBtn;

let lastMessageTimestamp = 0; // 마지막으로 받은 메시지 시간 (중복 방지)

// ========================================
// 유틸 함수
// ========================================

// URL 파라미터 가져오기
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
  if (!messagesContainer) return;
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

// 토스트 알림
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
    padding: 14px 26px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    animation: chatToastUp 0.25s ease-out;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'chatToastDown 0.25s ease-in';
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}

// 토스트 애니메이션 스타일 추가
(function appendToastStyle() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes chatToastUp {
      from { opacity: 0; transform: translate(-50%, 10px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes chatToastDown {
      from { opacity: 1; transform: translate(-50%, 0); }
      to   { opacity: 0; transform: translate(-50%, 10px); }
    }
  `;
  document.head.appendChild(style);
})();

// ========================================
// 이벤트 정보 로드
// ========================================

async function loadEventInfo(eventId) {
  try {
    // 지금은 서버 API 없다고 가정하고 localStorage 사용
    const eventsData = localStorage.getItem('eventsData');
    let event = null;

    if (eventsData) {
      const events = JSON.parse(eventsData);
      event = events.find(e => String(e.id) === String(eventId));
    }

    const titleEl = document.getElementById('eventTitle');
    const dateEl = document.getElementById('eventDate');

    if (event) {
      if (titleEl) titleEl.textContent = event.title || '제목 없음';
      if (dateEl) dateEl.textContent = event.date || '📅 날짜 정보 없음';
      document.title = `채팅 - ${event.title || '다누리'}`;
    } else {
      if (titleEl) titleEl.textContent = '이벤트 정보 없음';
      if (dateEl) dateEl.textContent = '날짜 정보 없음';
      document.title = '채팅 - 다누리';
    }
  } catch (error) {
    console.error('이벤트 정보 로드 실패:', error);
    showNotification('이벤트 정보를 불러올 수 없습니다');
  }
}

// 참석자 수는 일단 0으로 처리 (추후 확장)
async function loadParticipants(eventId) {
  if (participantCountEl) {
    participantCountEl.textContent = '👥 0';
  }
}

// ========================================
// 메시지 DOM 생성
// ========================================

// 내 메시지 (오른쪽)
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

// 상대 메시지 (왼쪽, 이미지 없음)
function createOtherMessage(author, text, timestamp = new Date()) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message other';

  const timeString = formatTime(timestamp);

  messageDiv.innerHTML = `
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

// 메시지 컨테이너에 추가
function appendMessageElement(el) {
  if (!messagesContainer) return;
  messagesContainer.appendChild(el);
}

// ========================================
// 채팅 API 연동
// ========================================

// 전체 메시지 1회 로드 (입장 시)
async function loadMessages(eventId) {
  try {
    const res = await fetch(`${CHAT_API}?action=get&eventId=${encodeURIComponent(eventId)}`);
    const data = await res.json();

    const payload  = data.data || data;
    const messages = payload.messages || [];

    if (!messagesContainer) return;

    // 기존 메시지 제거
    Array.from(messagesContainer.querySelectorAll('.message')).forEach(el => el.remove());

    const myUserId = localStorage.getItem('userId') || 'guest';

    // timestamp 기준 정렬(혹시 안 정렬돼 있을 수도 있으니)
    messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    messages.forEach(msg => {
      const ts = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();
      const isMine = msg.userId && String(msg.userId) === String(myUserId);

      const el = isMine
        ? createMyMessage(msg.text, ts)
        : createOtherMessage(msg.author || '익명', msg.text, ts);

      appendMessageElement(el);
    });

    if (messages.length > 0) {
      lastMessageTimestamp = messages[messages.length - 1].timestamp || lastMessageTimestamp;
    }

    scrollToBottom();
  } catch (error) {
    console.error('메시지 로드 실패:', error);
    showNotification('메시지를 불러올 수 없습니다');
  }
}

// 새 메시지만 가져오기 (폴링)
async function pollNewMessages(eventId) {
  try {
    const res = await fetch(`${CHAT_API}?action=get&eventId=${encodeURIComponent(eventId)}`);
    const data = await res.json();

    const payload  = data.data || data;
    const messages = payload.messages || [];

    if (!messages || messages.length === 0) return;

    const myUserId = localStorage.getItem('userId') || 'guest';

    // timestamp 기준 정렬
    messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // 아직 화면에 없는 "새로운" 메시지만 필터링
    const newMessages = messages.filter(msg =>
      typeof msg.timestamp === 'number' && msg.timestamp > lastMessageTimestamp
    );

    if (newMessages.length === 0) return;

    newMessages.forEach(msg => {
      const ts = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();
      const isMine = msg.userId && String(msg.userId) === String(myUserId);

      const el = isMine
        ? createMyMessage(msg.text, ts)
        : createOtherMessage(msg.author || '익명', msg.text, ts);

      appendMessageElement(el);
    });

    lastMessageTimestamp = newMessages[newMessages.length - 1].timestamp || lastMessageTimestamp;
    scrollToBottom();
  } catch (error) {
    console.error('새 메시지 폴링 실패:', error);
  }
}

// 메시지 전송
async function sendMessage() {
  if (!messageInput) return;

  const text = messageInput.value.trim();
  if (text === '') return;

  const eventId = getParam('id', '1');
  const userId  = localStorage.getItem('userId') || 'guest';
  const author  = localStorage.getItem('userName') || '익명';

  messageInput.value = '';

  try {
    await fetch(`${CHAT_API}?action=send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        userId,
        author,
        text
      })
    });

    // 전송 직후 한 번 새 메시지만 즉시 가져오기
    await pollNewMessages(eventId);
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    showNotification('메시지 전송에 실패했습니다');
  }
}

// ========================================
// 초기화 / 이벤트 바인딩
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('채팅 페이지 로드 시작');

  // DOM 요소 캐싱
  messageInput        = document.getElementById('messageInput');
  sendBtn             = document.getElementById('sendBtn');
  messagesContainer   = document.getElementById('messagesContainer');
  toggleParticipantsBtn = document.getElementById('toggleParticipants');
  participantCountEl  = document.getElementById('participantCount');
  backBtn             = document.querySelector('.back-btn');
  emojiBtn            = document.querySelector('.emoji-btn');

  const eventId = getParam('id', '1');

  // 이벤트 정보 / 메시지 / 참석자 로드
  await loadEventInfo(eventId);
  await loadMessages(eventId);
  await loadParticipants(eventId);

  // 입력 포커스
  if (messageInput) messageInput.focus();

  // 엔터로 전송
  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // 버튼으로 전송
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // 이모지 버튼 (일단 알림만)
  if (emojiBtn) {
    emojiBtn.addEventListener('click', () => {
      showNotification('이모지 선택 기능은 추후 지원 예정입니다 😊');
    });
  }

  // 참석자 버튼 (사이드바 없으니 알림만)
  if (toggleParticipantsBtn) {
    toggleParticipantsBtn.addEventListener('click', () => {
      showNotification('참석자 목록은 추후 구현 예정입니다.');
    });
  }

  // 뒤로가기
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (confirm('채팅방을 나가시겠습니까?')) {
        const eid = getParam('id', '1');
        window.location.href = `event_detail.html?id=${encodeURIComponent(eid)}`;
      }
    });
  }

  // 3초마다 새 메시지만 폴링
  setInterval(() => {
    const eid = getParam('id', '1');
    pollNewMessages(eid);
  }, 3000);

  console.log('채팅 페이지 로드 완료');
});

// 알림 페이지로 이동
function goToNotifications() {
  // 이미 알림 페이지면 굳이 이동 안 해도 되지만,
  // 새로고침 느낌으로 그냥 보내도 문제 없음
  window.location.href = 'notification.html';
}

