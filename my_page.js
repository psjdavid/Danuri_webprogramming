// 학번: 202300771 이름: 박성준
// my_page.js - 마이페이지 (완전 localStorage 버전)

// ==============================
// 전역 상태
// ==============================
let userData = null;
let likedEventsData = [];

// ==============================
// 유틸리티
// ==============================
function showNotification(message) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,.85); color: #fff; padding: 16px 32px; border-radius: 50px;
    font-size: 15px; font-weight: 500; z-index: 10000; animation: slideUp .3s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,.3); backdrop-filter: blur(10px);
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideDown .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createModal(content) {
  const overlay = document.createElement('div');
  overlay.id = 'modalOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn .3s ease;
  `;
  const box = document.createElement('div');
  box.style.cssText = `
    background: #fff; padding: 30px; border-radius: 16px; max-width: 500px; width: 90%;
    max-height: 80vh; overflow-y: auto; animation: slideUp .3s ease;
  `;
  box.innerHTML = content;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  return overlay;
}

window.closeModal = function () {
  const modal = document.getElementById('modalOverlay');
  if (modal) {
    modal.style.animation = 'fadeOut .3s ease';
    setTimeout(() => modal.remove(), 300);
  }
};

// 애니메이션 키프레임
(function injectAnimOnce() {
  if (document.getElementById('mypage-anim-style')) return;
  const style = document.createElement('style');
  style.id = 'mypage-anim-style';
  style.textContent = `
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes fadeOut { from{opacity:1} to{opacity:0} }
    @keyframes slideUp { from{opacity:0; transform:translateY(20px)} to{opacity:1; transform:translateY(0)} }
    @keyframes slideDown { from{opacity:1; transform:translate(-50%,0)} to{opacity:0; transform:translate(-50%,20px)} }
    .interest-tag.selected { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; }
  `;
  document.head.appendChild(style);
})();

// ==============================
// 로그인 확인
// ==============================
function checkLogin() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    showNotification('로그인이 필요합니다');
    setTimeout(() => window.location.href = 'login.html', 1000);
    return false;
  }
  return true;
}

// ==============================
// 프로필 로드 (localStorage에서만)
// ==============================
function loadProfile() {
  console.log('프로필 로드 시작');
  
  const userId = localStorage.getItem('userId');
  
  if (!userId) {
    console.error('사용자 ID가 없습니다');
    userData = {
      id: 'guest',
      name: '게스트',
      email: '',
      isAdmin: false,
      profile: {
        interests: []
      },
      likedEvents: []
    };
    updateUI();
    return;
  }
  
  // localStorage에서 userData 가져오기
  const userDataStr = localStorage.getItem(`userData_${userId}`);
  
  if (userDataStr) {
    userData = JSON.parse(userDataStr);
    console.log('✅ 프로필 로드 성공:', userData);
  } else {
    // 없으면 초기화
    userData = {
      id: userId,
      name: localStorage.getItem('userName') || '사용자',
      email: localStorage.getItem('currentUserEmail') || '',
      isAdmin: localStorage.getItem('isAdmin') === 'true',
      profile: {
        interests: []
      },
      likedEvents: []
    };
    
    // 저장
    localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
    console.log('⚠️ 새 프로필 생성:', userData);
  }
  
  updateUI();
}

// ==============================
// 찜한 이벤트 로드
// ==============================
function loadLikedEvents() {
  console.log('=== 찜한 이벤트 로드 시작 ===');
  
  const userId = localStorage.getItem('userId');
  
  if (!userId) {
    console.error('사용자 ID가 없습니다');
    likedEventsData = [];
    renderLikedEvents();
    updateStatsForLikedEvents(0);
    return;
  }
  
  // 🔥 userData에서 likedEvents 가져오기
  const userDataStr = localStorage.getItem(`userData_${userId}`);
  
  if (!userDataStr) {
    console.warn('userData가 없습니다. 빈 배열로 초기화합니다.');
    likedEventsData = [];
    renderLikedEvents();
    updateStatsForLikedEvents(0);
    return;
  }
  
  const userData = JSON.parse(userDataStr);
  likedEventsData = userData.likedEvents || [];
  
  console.log('✅ 찜한 이벤트 로드 완료:', likedEventsData.length);
  console.log('찜한 이벤트 목록:', likedEventsData);
  
  renderLikedEvents();
  updateStatsForLikedEvents(likedEventsData.length);
}

// ==============================
// 찜한 이벤트 렌더링
// ==============================
function renderLikedEvents() {
  const eventList = document.querySelector('.event-list');
  
  if (!eventList) return;
  
  if (likedEventsData.length === 0) {
    eventList.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">관심 이벤트가 없습니다</p>';
    return;
  }
  
  eventList.innerHTML = likedEventsData.map(event => {
    const imageUrl = event.image || '';
    const imageHtml = imageUrl 
      ? `<img src="${imageUrl}" alt="${event.title}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:32px;\\'>🎪</div>';"/>`
      : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:32px;">🎪</div>';

    return `
      <div class="event-card" style="position:relative; border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.1); cursor:pointer; transition:transform 0.2s;" onclick="window.location.href='event_detail.html?id=${encodeURIComponent(event.id)}'">
        <div style="position:relative; width:100%; height:180px; overflow:hidden;">
          ${imageHtml}
        </div>
        <div style="padding:16px;">
          <h3 style="font-size:16px; font-weight:700; margin-bottom:8px; line-height:1.4;">${event.title}</h3>
          <p style="font-size:13px; color:#666; margin-bottom:4px;">📅 ${event.date || '날짜 미정'}</p>
          <p style="font-size:13px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📍 ${event.location || '장소 미정'}</p>
        </div>
        <button class="unlike-btn" onclick="event.stopPropagation(); unlikeEvent('${event.id}')" style="position:absolute; top:12px; right:12px; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.9); border:none; cursor:pointer; font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.15);">
          ♥
        </button>
      </div>
    `;
  }).join('');
}

// ==============================
// 찜 제거
// ==============================
async function unlikeEvent(eventId) {
  console.log('찜 제거 시도:', eventId);
  
  const userId = localStorage.getItem('userId');
  
  if (!userId) {
    console.error('사용자 ID가 없습니다');
    return;
  }
  
  // 🔥 userData에서 제거
  const userDataStr = localStorage.getItem(`userData_${userId}`);
  if (!userDataStr) {
    console.warn('userData가 없습니다.');
    return;
  }
  
  const userData = JSON.parse(userDataStr);
  
  // likedEvents 배열에서 해당 이벤트 제거
  if (userData.likedEvents && Array.isArray(userData.likedEvents)) {
    userData.likedEvents = userData.likedEvents.filter(event => event.id !== eventId);
    
    // 다시 저장
    localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
    
    console.log('✅ 찜 제거 완료:', eventId);
    showNotification('관심 목록에서 제거했어요');
    
    // 목록 새로고침
    loadLikedEvents();
  }
}

window.unlikeEvent = unlikeEvent;

// ==============================
// 통계 업데이트
// ==============================
function updateStatsForLikedEvents(count) {
  // 🔥 관심 이벤트 개수 업데이트
  const statNumber = document.querySelector('.stat-card .stat-number');
  if (statNumber) {
    statNumber.textContent = count;
  }
  
  // 🔥 섹션 제목 업데이트
  const sectionTitle = document.querySelector('.events-section .section-title');
  if (sectionTitle) {
    sectionTitle.textContent = `관심 이벤트 (${count})`;
  }
}

// ==============================
// UI 업데이트
// ==============================
function updateUI() {
  if (!userData) return;
  
  // 프로필 정보 표시
  const profileNameElement = document.querySelector('.profile-name');
  const profileEmailElement = document.querySelector('.profile-email');
  
  if (profileNameElement) {
    profileNameElement.textContent = userData.name || '사용자';
  }
  
  if (profileEmailElement) {
    profileEmailElement.textContent = userData.email || '';
  }
  
  // 관심사 표시
  renderInterestTags();
}

// ==============================
// 관심사 태그 렌더링
// ==============================
function renderInterestTags() {
  const interestContainer = document.querySelector('.interest-tags');
  if (!interestContainer) return;
  
  const interests = userData.profile?.interests || [];
  
  if (interests.length === 0) {
    interestContainer.innerHTML = '<span style="color:#999;">관심사가 없습니다</span>';
    return;
  }
  
  interestContainer.innerHTML = interests.map(interest => 
    `<span class="interest-tag" style="display:inline-block; padding:6px 12px; background:#f0f4ff; color:#667eea; border-radius:8px; margin:4px; font-size:14px; font-weight:600;">${interest}</span>`
  ).join('');
}

// ==============================
// 관심사 편집 모달
// ==============================
window.editInterests = function() {
  const availableInterests = ['음악', '미술', '스포츠', '푸드', '공연', '역사', '문화', '체험', '자연', '축제'];
  const currentInterests = userData.profile?.interests || [];
  
  console.log('현재 관심사:', currentInterests);
  
  const modalContent = `
    <h2 style="margin-bottom: 20px; font-size: 22px; font-weight: 700;">관심사 선택</h2>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
      ${availableInterests.map(interest => {
        const isSelected = currentInterests.includes(interest);
        return `
          <button type="button" 
                  class="interest-option${isSelected ? ' selected' : ''}" 
                  data-interest="${interest}" 
                  onclick="toggleInterest(this)"
                  style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; background: ${isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#fff'}; color: ${isSelected ? '#fff' : '#333'}; font-weight: 600; cursor: pointer; transition: all 0.3s;">
            ${interest}
          </button>
        `;
      }).join('')}
    </div>
    <div style="display: flex; gap: 10px;">
      <button type="button" onclick="closeModal()" style="flex:1; padding:12px; background:#e5e7eb; color:#333; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer;">취소</button>
      <button type="button" onclick="saveInterests()" style="flex:1; padding:12px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer;">저장</button>
    </div>
  `;
  
  createModal(modalContent);
};

window.toggleInterest = function(btn) {
  btn.classList.toggle('selected');
  if (btn.classList.contains('selected')) {
    btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    btn.style.color = '#fff';
  } else {
    btn.style.background = '#fff';
    btn.style.color = '#333';
  }
};

window.saveInterests = function() {
  const selected = Array.from(document.querySelectorAll('.interest-option.selected'))
    .map(btn => btn.dataset.interest);
  
  if (selected.length === 0) {
    alert('최소 1개 이상의 관심사를 선택해주세요.');
    return;
  }
  
  console.log('선택된 관심사:', selected);
  
  const userId = localStorage.getItem('userId');
  
  if (!userData.profile) userData.profile = {};
  userData.profile.interests = selected;
  
  // 🔥 localStorage에 저장
  localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
  
  console.log('✅ 관심사 저장 완료:', userData.profile.interests);
  
  updateUI();
  closeModal();
  showNotification('관심사가 업데이트되었습니다');
};

// ==============================
// 뒤로 가기
// ==============================
function goBack() {
  window.history.back();
}

// ==============================
// 알림
// ==============================
function goToNotifications() {
  alert('🔔 알림 기능은 준비 중입니다.');
}

// ==============================
// 로그아웃
// ==============================
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    localStorage.removeItem('isLoggedIn');
    showNotification('로그아웃되었습니다');
    setTimeout(() => window.location.href = 'login.html', 1000);
  }
}

window.logout = logout;

// ==============================
// 이벤트 리스너 설정
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  console.log('MyPage 초기화 시작');
  
  if (!checkLogin()) return;
  
  loadProfile();
  loadLikedEvents();
  
  // 🔥 관심사 편집 버튼
  const interestEditBtn = document.querySelector('.interests-section .edit-btn');
  if (interestEditBtn) {
    interestEditBtn.addEventListener('click', editInterests);
  }
  
  // 🔥 프로필 수정 버튼
  const editProfileBtn = document.querySelector('.edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      alert('프로필 수정 기능은 준비 중입니다.');
    });
  }
  
  // 🔥 뒤로가기 버튼
  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => window.history.back());
  }
  
  // 🔥 로그아웃 버튼
  const settingsItems = document.querySelectorAll('.settings-item');
  settingsItems.forEach(item => {
    if (item.textContent.includes('로그아웃')) {
      item.style.cursor = 'pointer';
      item.addEventListener('click', logout);
    }
  });
  
  console.log('MyPage 초기화 완료');
});

console.log('MyPage JavaScript 로드 완료 (완전 localStorage 버전) - 학번: 202300771');