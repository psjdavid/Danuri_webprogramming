// 학번: 202300771 이름: 박성준
// notification.js - 관심 축제 D-7 알림 페이지

// 🔔 알림 페이지로 이동 (헤더 종 아이콘에서 사용)
function goToNotifications() {
  if (!location.pathname.endsWith('notification.html')) {
    window.location.href = 'notification.html';
  }
}
window.goToNotifications = goToNotifications;

// 토스트 알림 유틸
function showToast(message) {
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
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 16px 32px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    animation: slideUp 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 애니메이션 스타일 주입 (없으면 한 번만)
(function injectAnimOnce() {
  if (document.getElementById('notification-anim-style')) return;
  const style = document.createElement('style');
  style.id = 'notification-anim-style';
  style.textContent = `
    @keyframes slideUp {
      from { opacity:0; transform: translate(-50%, 20px); }
      to   { opacity:1; transform: translate(-50%, 0); }
    }
    @keyframes slideDown {
      from { opacity:1; transform: translate(-50%, 0); }
      to   { opacity:0; transform: translate(-50%, 20px); }
    }
  `;
  document.head.appendChild(style);
})();

// 날짜 파싱: event.eventstartdate(YYYYMMDD) → Date
function parseYYYYMMDD(str) {
  if (!str || !/^\d{8}$/.test(str)) return null;
  const y = parseInt(str.slice(0, 4), 10);
  const m = parseInt(str.slice(4, 6), 10) - 1;
  const d = parseInt(str.slice(6, 8), 10);
  const dt = new Date(y, m, d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

// 날짜 파싱: event.date("2025.3.1 ~ 2025.3.3" 등)에서 첫 날짜 찾기
function parseFromDateText(text) {
  if (!text) return null;
  const match = text.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  const d = parseInt(match[3], 10);
  const dt = new Date(y, m, d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

// 공통 포맷: Date → "YYYY.MM.DD"
function formatDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

// 시작일 계산
function getEventStartDate(ev) {
  // 1) TourAPI 정규화 객체처럼 eventstartdate가 있을 때
  if (ev.eventstartdate) {
    const dt = parseYYYYMMDD(ev.eventstartdate);
    if (dt) return dt;
  }

  // 2) 마이페이지에서 쓰는 date 문자열에서 추출
  if (ev.date) {
    const dt = parseFromDateText(ev.date);
    if (dt) return dt;
  }

  return null;
}

// D-day 계산
function calcDiffDays(startDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(startDate.getTime());
  s.setHours(0, 0, 0, 0);
  const diffMs = s - today;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// 알림 카드 하나 만들기
function createNotificationCard(ev) {
  const startDate = getEventStartDate(ev);
  if (!startDate) return null;

  const diffDays = calcDiffDays(startDate);
  if (diffDays < 0 || diffDays > 7) return null; // 0~7일만

  const article = document.createElement('article');
  article.className = 'notification-card unread'; // 항상 새 알림 느낌
  article.dataset.type = 'event';

  const icon = document.createElement('div');
  icon.className = 'notification-icon event-icon';
  icon.textContent = '🎉';

  const content = document.createElement('div');
  content.className = 'notification-content';

  const header = document.createElement('div');
  header.className = 'notification-header';

  const title = document.createElement('h3');
  title.className = 'notification-title';

  if (diffDays === 0) {
    title.textContent = `${ev.title || '축제'}가 오늘 시작됩니다!`;
  } else {
    title.textContent = `${ev.title || '축제'}가 곧 시작돼요 (D-${diffDays})`;
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.title = '삭제';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    article.classList.add('deleting');
    setTimeout(() => {
      article.remove();
      updateEmptyState();
      showToast('알림이 삭제되었습니다');
    }, 300);
  });

  header.appendChild(title);
  header.appendChild(deleteBtn);

  const text = document.createElement('p');
  text.className = 'notification-text';

  const startStr = formatDate(startDate);
  const locationText = ev.location || ev.locationText || ev.addr1 || '장소 미정';

  if (diffDays === 0) {
    text.innerHTML = `
      오늘부터 <strong>${startStr}</strong>에 시작하는 축제예요.<br/>
      <strong>${locationText}</strong>에서 열려요.
    `;
  } else {
    text.innerHTML = `
      축제 시작까지 <strong>D-${diffDays}</strong>일 남았어요.<br/>
      시작일은 <strong>${startStr}</strong>, 장소는 <strong>${locationText}</strong>입니다.
    `;
  }

  const footer = document.createElement('div');
  footer.className = 'notification-footer';

  const time = document.createElement('span');
  time.className = 'notification-time';
  time.textContent = `시작일: ${startStr} (D-${diffDays < 0 ? '지남' : diffDays})`;

  const link = document.createElement('a');
  link.className = 'notification-link';
  link.textContent = '이벤트 자세히 보기 →';
  // 이벤트 id가 있으면 상세 페이지로 이동
  if (ev.id) {
    link.href = `event_detail.html?id=${encodeURIComponent(ev.id)}`;
  } else {
    link.href = '#';
  }

  footer.appendChild(time);
  footer.appendChild(link);

  content.appendChild(header);
  content.appendChild(text);
  content.appendChild(footer);

  article.appendChild(icon);
  article.appendChild(content);

  // 카드 전체 클릭 시 읽음 처리
  article.addEventListener('click', (e) => {
    if (e.target === deleteBtn || e.target === link) return;
    if (article.classList.contains('unread')) {
      article.classList.remove('unread');
    }
  });

  return article;
}

// 빈 상태 업데이트
function updateEmptyState() {
  const list = document.querySelector('.notification-list');
  const empty = document.querySelector('.empty-state');
  const cards = list ? list.querySelectorAll('.notification-card') : [];

  if (!list || !empty) return;

  if (cards.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
  } else {
    list.style.display = 'flex';
    empty.style.display = 'none';
  }
}

// 메인 렌더링
async function renderFestivalNotifications() {
  const list = document.querySelector('.notification-list');
  const tabs = document.querySelector('.notification-tabs');

  if (!list) return;

  // 기존 샘플 알림/타임그룹 제거
  list.innerHTML = '';

  // 탭은 이번 기능에선 쓰지 않으니 숨김
  if (tabs) tabs.style.display = 'none';

  const userId = localStorage.getItem('userId');
  if (!userId) {
    const empty = document.querySelector('.empty-state');
    if (empty) {
      empty.style.display = 'block';
      empty.querySelector('h3').textContent = '로그인이 필요합니다';
      empty.querySelector('p').textContent = '관심 축제를 보려면 먼저 로그인해주세요.';
    }
    list.style.display = 'none';
    return;
  }

  const userDataStr = localStorage.getItem(`userData_${userId}`);
  if (!userDataStr) {
    const empty = document.querySelector('.empty-state');
    if (empty) {
      empty.style.display = 'block';
      empty.querySelector('h3').textContent = '관심 축제가 없습니다';
      empty.querySelector('p').textContent = '마이페이지에서 축제를 찜해보세요.';
    }
    list.style.display = 'none';
    return;
  }

  let userData;
  try {
    userData = JSON.parse(userDataStr);
  } catch (e) {
    console.error('userData 파싱 오류:', e);
    showToast('사용자 데이터를 불러오는 중 오류가 발생했습니다.');
    return;
  }

  const likedEvents = Array.isArray(userData.likedEvents) ? userData.likedEvents : [];
  console.log('알림용 likedEvents:', likedEvents);

  // 1주일 안에 시작하는 축제만 필터링
  const upcoming = [];
  likedEvents.forEach(ev => {
    const startDate = getEventStartDate(ev);
    if (!startDate) return;
    const diffDays = calcDiffDays(startDate);
    if (diffDays < 0 || diffDays > 7) return;

    upcoming.push({
      ...ev,
      _startDate: startDate,
      _diffDays: diffDays
    });
  });

  // 시작일 기준 오름차순 정렬
  upcoming.sort((a, b) => a._startDate - b._startDate);

  if (upcoming.length === 0) {
    const empty = document.querySelector('.empty-state');
    if (empty) {
      empty.style.display = 'block';
      empty.querySelector('h3').textContent = '임박한 관심 축제가 없습니다';
      empty.querySelector('p').textContent = '관심 축제의 시작일이 1주일 이내일 때 여기에서 알려드릴게요.';
    }
    list.style.display = 'none';
    return;
  }

  // 타임 그룹 하나 만들기 (1주일 안에 시작하는 축제)
  const group = document.createElement('div');
  group.className = 'time-group';

  const label = document.createElement('div');
  label.className = 'time-label';
  label.textContent = '1주일 안에 시작하는 관심 축제';

  group.appendChild(label);

  upcoming.forEach(ev => {
    const card = createNotificationCard(ev);
    if (card) group.appendChild(card);
  });

  list.appendChild(group);
  updateEmptyState();

  const pageTitle = document.querySelector('.page-title');
  if (pageTitle) {
    pageTitle.textContent = `🔔 알림 (임박한 축제 ${upcoming.length}개)`;
  }

  showToast(`1주일 안에 시작하는 관심 축제 ${upcoming.length}개를 찾았어요.`);
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  console.log('알림 페이지 로드 완료 - 임박한 관심 축제 알림 모드');
  renderFestivalNotifications();
});
