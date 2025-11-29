// 학번: 202300771 이름: 박성준
// notification.js - 알림 페이지 인터랙션 처리

// DOM 요소 선택
const tabBtns = document.querySelectorAll('.tab-btn');
const notificationCards = document.querySelectorAll('.notification-card');
const deleteBtns = document.querySelectorAll('.delete-btn');
const markAllReadBtn = document.getElementById('markAllRead');
const deleteAllBtn = document.getElementById('deleteAll');
const notificationList = document.querySelector('.notification-list');
const emptyState = document.querySelector('.empty-state');

// 알림 데이터 (localStorage에서 관리)
let notifications = [];

// 초기화
function init() {
    loadNotifications();
    updateBadges();
    setupEventListeners();
}

// 알림 데이터 로드
function loadNotifications() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
        notifications = JSON.parse(saved);
    } else {
        // 초기 알림 데이터 (현재 HTML의 알림들을 기반으로)
        notifications = Array.from(notificationCards).map((card, index) => ({
            id: `notif_${Date.now()}_${index}`,
            type: card.dataset.type,
            isRead: !card.classList.contains('unread'),
            timestamp: Date.now() - (index * 3600000) // 시간차를 두고 생성
        }));
        saveNotifications();
    }
}

// 알림 데이터 저장
function saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// 배지 업데이트
function updateBadges() {
    const counts = {
        all: 0,
        event: 0,
        participate: 0,
        system: 0
    };

    notificationCards.forEach(card => {
        if (!card.classList.contains('hidden')) {
            counts.all++;
            const type = card.dataset.type;
            if (counts[type] !== undefined) {
                counts[type]++;
            }
        }
    });

    tabBtns.forEach(btn => {
        const type = btn.dataset.type;
        const badge = btn.querySelector('.badge');
        if (badge && counts[type] !== undefined) {
            badge.textContent = counts[type];
        }
    });

    // 빈 상태 체크
    checkEmptyState();
}

// 1) 도우미: 매번 현재 DOM 기준으로 카드 가져오기
function getCards() {
  return Array.from(document.querySelectorAll('.notification-card'));
}

// 2) 배지 업데이트: 정적 리스트 대신 getCards() 사용 + DOM 포함 여부 체크
function updateBadges() {
  const counts = { all: 0, event: 0, participate: 0, system: 0 };

  getCards().forEach(card => {
    // 이미 DOM에서 빠진 카드면 스킵 (안전)
    if (!document.contains(card)) return;

    if (!card.classList.contains('hidden')) {
      counts.all++;
      const type = card.dataset.type;
      if (type in counts) counts[type]++;
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const type = btn.dataset.type;
    const badge = btn.querySelector('.badge');
    if (badge && type in counts) badge.textContent = String(counts[type]);
  });

  checkEmptyState();
}

// 3) 상태 저장도 매번 현재 DOM을 사용
function saveNotificationState() {
  const state = getCards().map(card => ({
    isRead: !card.classList.contains('unread'),
    // 현재 DOM에 있으면 미삭제, 없으면 삭제
    isDeleted: !document.contains(card)
  }));
  localStorage.setItem('notificationState', JSON.stringify(state));
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 탭 필터링
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 탭에서 active 제거
            tabBtns.forEach(b => b.classList.remove('active'));
            // 클릭된 탭에 active 추가
            btn.classList.add('active');
            
            const filterType = btn.dataset.type;
            filterNotifications(filterType);
        });
    });

    // 개별 삭제 버튼
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = btn.closest('.notification-card');
            deleteNotification(card);
        });
    });

    // 알림 카드 클릭 (읽음 처리)
    notificationCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // 삭제 버튼이나 링크 클릭시에는 읽음 처리하지 않음
            if (e.target.classList.contains('delete-btn') || 
                e.target.classList.contains('notification-link')) {
                return;
            }
            markAsRead(card);
        });
    });

    // 모두 읽음 처리
    markAllReadBtn.addEventListener('click', markAllAsRead);

    // 모두 삭제
    deleteAllBtn.addEventListener('click', deleteAllNotifications);
}

// 알림 필터링
function filterNotifications(type) {
    let visibleCount = 0;
    
    notificationCards.forEach(card => {
        if (type === 'all' || card.dataset.type === type) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });

    // 시간 그룹 레이블 표시/숨김 처리
    document.querySelectorAll('.time-group').forEach(group => {
        const visibleCards = group.querySelectorAll('.notification-card:not(.hidden)');
        if (visibleCards.length === 0) {
            group.style.display = 'none';
        } else {
            group.style.display = 'flex';
        }
    });

    checkEmptyState();
    console.log(`필터: ${type}, 표시된 알림: ${visibleCount}개`);
}

// 알림 읽음 처리
function markAsRead(card) {
    if (card.classList.contains('unread')) {
        card.classList.remove('unread');
        updateBadges();
        showNotification('알림을 읽음 처리했습니다');
        saveNotificationState();
    }
}

// 모두 읽음 처리
function markAllAsRead() {
    const unreadCards = document.querySelectorAll('.notification-card.unread:not(.hidden)');
    
    if (unreadCards.length === 0) {
        showNotification('읽지 않은 알림이 없습니다');
        return;
    }

    unreadCards.forEach(card => {
        card.classList.remove('unread');
    });

    updateBadges();
    saveNotificationState();
    showNotification(`${unreadCards.length}개의 알림을 읽음 처리했습니다`);
}

// 알림 삭제
function deleteNotification(card) {
    if (confirm('이 알림을 삭제하시겠습니까?')) {
        card.classList.add('deleting');
        
        setTimeout(() => {
            card.remove();
            updateBadges();
            saveNotificationState();
            showNotification('알림이 삭제되었습니다');
        }, 300);
    }
}

// 모두 삭제
function deleteAllNotifications() {
    const visibleCards = document.querySelectorAll('.notification-card:not(.hidden)');
    
    if (visibleCards.length === 0) {
        showNotification('삭제할 알림이 없습니다');
        return;
    }

    if (confirm(`${visibleCards.length}개의 알림을 모두 삭제하시겠습니까?`)) {
        visibleCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('deleting');
                setTimeout(() => {
                    card.remove();
                    
                    // 마지막 카드 삭제 후 업데이트
                    if (index === visibleCards.length - 1) {
                        updateBadges();
                        saveNotificationState();
                        showNotification('모든 알림이 삭제되었습니다');
                    }
                }, 300);
            }, index * 50); // 순차적으로 삭제
        });
    }
}

// 빈 상태 체크
function checkEmptyState() {
    const visibleCards = document.querySelectorAll('.notification-card:not(.hidden)');
    
    if (visibleCards.length === 0) {
        notificationList.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        notificationList.style.display = 'flex';
        emptyState.style.display = 'none';
    }
}

// 알림 상태 저장
function saveNotificationState() {
    const state = [];
    notificationCards.forEach(card => {
        state.push({
            isRead: !card.classList.contains('unread'),
            isDeleted: card.classList.contains('deleting') || !document.contains(card)
        });
    });
    localStorage.setItem('notificationState', JSON.stringify(state));
}

// 알림 토스트 표시
function showNotification(message) {
    // 기존 알림 제거
    const existing = document.querySelector('.toast-notification');
    if (existing) {
        existing.remove();
    }

    // 새 알림 생성
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

    // 3초 후 제거
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 애니메이션 CSS 추가
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

// 스크롤시 헤더 그림자 효과
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.pageYOffset > 10) {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    } else {
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
});

// 실시간 알림 시뮬레이션 (5초마다)
let notificationCounter = 0;
function simulateNewNotification() {
    notificationCounter++;
    
    // 알림 벨 아이콘에 배지 표시
    const iconBtn = document.querySelector('.icon-btn.active');
    if (iconBtn && !iconBtn.querySelector('.notification-badge')) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = '1';
        badge.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: #ef4444;
            color: white;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 10px;
            border: 2px solid white;
        `;
        iconBtn.appendChild(badge);
    }
    
    console.log('새 알림이 도착했습니다!');
}

// 10초마다 새 알림 시뮬레이션 (개발용)
// setInterval(simulateNewNotification, 10000);

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    init();
    console.log('알림 페이지 로드 완료');
    
    // 저장된 알림 상태 복원
    const savedState = localStorage.getItem('notificationState');
    if (savedState) {
        const state = JSON.parse(savedState);
        const cards = Array.from(notificationCards);
        
        state.forEach((item, index) => {
            if (cards[index]) {
                if (item.isDeleted) {
                    cards[index].remove();
                } else if (item.isRead) {
                    cards[index].classList.remove('unread');
                }
            }
        });
        
        updateBadges();
    }
});

// 반응형 네비게이션 (모바일)
const createMobileMenu = () => {
    const nav = document.querySelector('.nav');
    const headerActions = document.querySelector('.header-actions');
    
    if (window.innerWidth <= 768) {
        nav.style.display = 'none';
        
        // 햄버거 메뉴 버튼 생성
        if (!document.querySelector('.mobile-menu-btn')) {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'mobile-menu-btn icon-btn';
            menuBtn.innerHTML = '☰';
            menuBtn.onclick = () => {
                nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
            };
            headerActions.insertBefore(menuBtn, headerActions.firstChild);
        }
    } else {
        nav.style.display = 'flex';
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.remove();
        }
    }
};

window.addEventListener('resize', createMobileMenu);
createMobileMenu();

console.log('Notification JavaScript 로드 완료 - 학번: 202300771');