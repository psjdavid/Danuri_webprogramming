// 학번: 202300771 이름: 박성준
// my_page.js - 마이페이지 (JSON 파일 저장 버전)

// ==============================
// API 엔드포인트
// ==============================
const API_URL = './simple_backend.php';

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
// 🔥 수정: 프로필 로드 (JSON 파일에서 가져오기)
// ==============================
async function loadProfile() {
  try {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      throw new Error('사용자 ID가 없습니다');
    }
    
    console.log('프로필 로드 시도:', userId);
    
    // user_api.php에서 JSON 파일 데이터 가져오기
    const res = await fetch('./backend/user_api.php?action=profile');
    const data = await res.json();
    
    console.log('프로필 API 응답:', data);
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    userData = data.data;
    
    // localStorage에도 저장 (event_list.js에서 사용)
    localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
    
    console.log('✅ 프로필 로드 성공:', userData);
    console.log('관심사:', userData.profile?.interests);
    
    updateUI();
    
  } catch (error) {
    console.error('❌ 프로필 로드 실패:', error);
    
    // 폴백: localStorage에서 가져오기
    const userId = localStorage.getItem('userId');
    const cachedData = localStorage.getItem(`userData_${userId}`);
    
    if (cachedData) {
      userData = JSON.parse(cachedData);
      console.log('📦 캐시된 데이터 사용:', userData);
    } else {
      // 기본값
      userData = {
        id: userId,
        name: localStorage.getItem('userName') || '사용자',
        email: localStorage.getItem('currentUserEmail') || '',
        isAdmin: localStorage.getItem('isAdmin') === 'true',
        profile: {
          interests: []
        }
      };
      console.log('⚠️ 기본값 사용:', userData);
    }
    
    updateUI();
  }
}
async function loadLikedEvents() {
  console.log('=== 좋아요 목록 로드 시작 ===');
  
  try {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      throw new Error('사용자 ID가 없습니다');
    }
    
    const res = await fetch(`${API_URL}?action=get_liked&userId=${userId}`);
    const data = await res.json();
    
    console.log('찜한 이벤트 응답:', data);
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    likedEventsData = data.data.events || [];
    console.log('✅ 찜한 이벤트 수:', likedEventsData.length);
    
    renderLikedEvents();
    updateStatsForLikedEvents(likedEventsData.length);
    
  } catch (error) {
    console.error('❌ 찜한 이벤트 로드 실패:', error);
    
    // 폴백: localStorage 사용
    const likedEvents = JSON.parse(localStorage.getItem('likedEvents') || '{}');
    likedEventsData = Object.values(likedEvents);
    
    console.log('폴백 모드: localStorage에서 로드', likedEventsData.length);
    
    renderLikedEvents();
    updateStatsForLikedEvents(likedEventsData.length);
  }
}

// ==============================
// 찜한 이벤트 렌더링
// ==============================
function renderLikedEvents() {
  const likedSection = document.querySelector('.events-section[data-type="liked"]');
  if (!likedSection) return;
  
  const eventList = likedSection.querySelector('.event-list');
  const sectionHeader = likedSection.querySelector('.section-header .section-title');
  
  if (!eventList) return;
  
  // 헤더 업데이트
  if (sectionHeader) {
    sectionHeader.textContent = `관심 이벤트 (${likedEventsData.length})`;
  }
  
  // 좋아요한 이벤트가 없을 때
  if (likedEventsData.length === 0) {
    eventList.innerHTML = '<div style="text-align:center; padding:40px 0; color:#999;">아직 관심 이벤트가 없습니다</div>';
    return;
  }
  
  // 이벤트 목록 생성
  eventList.innerHTML = likedEventsData.map(event => {
    const eventId = event.id || event.eventId || '';
    const title = event.title || event.TITLE || '제목 없음';
    const date = event.date || event.USAGE_DAY || '일정 미정';
    const location = event.location || event.PLACE || '';
    
    return `
      <div class="event-item" data-event-id="${eventId}" style="
        display: flex; 
        align-items: center; 
        padding: 15px; 
        margin-bottom: 10px;
        background: #f9f9f9; 
        border-radius: 10px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      ">
        <div class="event-thumb" style="
          width: 60px; 
          height: 60px; 
          border-radius: 8px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-right: 15px;
        ">📅</div>
        <div class="event-details" style="flex: 1;">
          <div class="event-title" style="font-weight: bold; margin-bottom: 5px;">${title}</div>
          <div class="event-meta" style="font-size: 13px; color: #666; display: flex; gap: 10px;">
            <span>📅 ${date}</span>
            ${location ? `<span>📍 ${location.substring(0, 15)}${location.length > 15 ? '...' : ''}</span>` : ''}
          </div>
        </div>
        <button class="remove-liked-btn" data-event-id="${eventId}" style="
          background: none; 
          border: none; 
          color: #ff6b6b; 
          font-size: 20px; 
          cursor: pointer;
          padding: 5px 10px;
          transition: transform 0.2s;
        " title="관심 목록에서 제거">♥</button>
      </div>
    `;
  }).join('');
  
  // 이벤트 핸들러 추가
  eventList.querySelectorAll('.event-item').forEach(item => {
    const eventId = item.dataset.eventId;
    const removeBtn = item.querySelector('.remove-liked-btn');
    
    // 호버 효과
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'translateY(-2px)';
      item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.transform = '';
      item.style.boxShadow = '';
    });
    
    // 이벤트 클릭 시 상세 페이지로 이동
    item.addEventListener('click', (e) => {
      if (e.target.closest('.remove-liked-btn')) return;
      window.location.href = `event_detail.html?id=${eventId}`;
    });
    
    // 삭제 버튼
    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('관심 목록에서 제거하시겠습니까?')) {
          await removeLikedEvent(eventId);
        }
      });
      
      removeBtn.addEventListener('mouseenter', () => {
        removeBtn.style.transform = 'scale(1.2)';
      });
      removeBtn.addEventListener('mouseleave', () => {
        removeBtn.style.transform = 'scale(1)';
      });
    }
  });
}

// ==============================
// 찜 제거
// ==============================
async function removeLikedEvent(eventId) {
  try {
    const userId = localStorage.getItem('userId');
    
    const res = await fetch(`${API_URL}?action=remove_liked`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showNotification('관심 목록에서 제거했어요');
      await loadLikedEvents();
      
      // localStorage도 동기화
      const likedEvents = JSON.parse(localStorage.getItem('likedEvents') || '{}');
      delete likedEvents[eventId];
      localStorage.setItem('likedEvents', JSON.stringify(likedEvents));
      localStorage.setItem(`event_like_${eventId}`, '0');
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('찜 제거 실패:', error);
    
    // 폴백: localStorage에서만 제거
    const likedEvents = JSON.parse(localStorage.getItem('likedEvents') || '{}');
    delete likedEvents[eventId];
    localStorage.setItem('likedEvents', JSON.stringify(likedEvents));
    localStorage.setItem(`event_like_${eventId}`, '0');
    
    showNotification('관심 목록에서 제거했어요');
    await loadLikedEvents();
  }
}

// ==============================
// UI 업데이트
// ==============================
function updateUI() {
  if (!userData) return;
  
  console.log('UI 업데이트:', userData);
  
  // 프로필 정보
  const nameEl = document.querySelector('.profile-name');
  const emailEl = document.querySelector('.profile-email');
  
  if (nameEl) nameEl.textContent = userData.name || '사용자';
  if (emailEl) emailEl.textContent = userData.email || '';
  
  // 관심사 (기본값)
  const interests = userData.profile?.interests || ['음악', '미술', '스포츠', '푸드', '자연'];
  const tagsBox = document.querySelector('.interest-tags');
  if (tagsBox) {
    tagsBox.innerHTML = interests.map(v => `<span class="interest-tag">${v}</span>`).join('');
  }
}

// ==============================
// 통계 업데이트
// ==============================
function updateStatsForLikedEvents(count) {
  const statCards = document.querySelectorAll('.stat-card');
  if (statCards.length >= 1) {
    const likedStatNumber = statCards[0].querySelector('.stat-number');
    if (likedStatNumber) {
      likedStatNumber.textContent = count;
    }
  }
}

// ==============================
// 프로필 수정
// ==============================
function openEditProfileModal() {
  if (!userData) return;
  
  createModal(`
    <h3 style="margin-bottom:20px; font-size:20px; font-weight:700;">프로필 수정</h3>
    <form id="editProfileForm" style="display:flex; flex-direction:column; gap:15px;">
      <div>
        <label style="display:block; margin-bottom:5px; font-weight:500;">이름</label>
        <input type="text" id="editName" value="${userData.name}" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:15px;">
      </div>
      <div>
        <label style="display:block; margin-bottom:5px; font-weight:500;">이메일</label>
        <input type="email" id="editEmail" value="${userData.email}" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:15px;">
      </div>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button type="submit" style="flex:1; padding:12px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer;">저장</button>
        <button type="button" onclick="closeModal()" style="flex:1; padding:12px; background:#f3f4f6; border:none; border-radius:8px; font-size:15px; font-weight:500; cursor:pointer;">취소</button>
      </div>
    </form>
  `);
  
  document.getElementById('editProfileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveProfile();
  });
}

async function saveProfile() {
  const name = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  
  if (!name) {
    alert('이름을 입력해주세요.');
    return;
  }
  
  if (!email) {
    alert('이메일을 입력해주세요.');
    return;
  }
  
  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('올바른 이메일 형식을 입력해주세요.');
    return;
  }
  
  try {
    const userId = localStorage.getItem('userId');
    
    const res = await fetch(`${API_URL}?action=update_profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, email })
    });
    
    const data = await res.json();
    
    if (data.success) {
      userData = data.data;
      localStorage.setItem('userName', name);
      localStorage.setItem('currentUserEmail', email);
      updateUI();
      closeModal();
      showNotification('프로필이 업데이트되었습니다');
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('프로필 수정 실패:', error);
    
    // 폴백: localStorage만 업데이트
    localStorage.setItem('userName', name);
    localStorage.setItem('currentUserEmail', email);
    userData.name = name;
    userData.email = email;
    updateUI();
    closeModal();
    showNotification('프로필이 업데이트되었습니다');
  }
}

// ==============================
// 로그아웃
// ==============================
function handleLogout() {
  if (!confirm('로그아웃 하시겠습니까?')) return;
  
  // localStorage 정리
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('currentUserEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  localStorage.removeItem('isAdmin');
  
  showNotification('로그아웃되었습니다');
  setTimeout(() => window.location.href = 'login.html', 900);
}

// ==============================
// 설정 메뉴
// ==============================
function handleSettingsClick(index) {
  switch (index) {
    case 0: // 알림 설정
      showNotification('알림 설정 페이지로 이동합니다');
      setTimeout(() => window.location.href = 'notification.html', 900);
      break;
    case 1: // 계정 관리
      openAccountManagementModal();
      break;
    case 2: // 고객센터
      showNotification('고객센터 페이지로 이동합니다');
      break;
    case 3: // 로그아웃
      handleLogout();
      break;
  }
}

function openAccountManagementModal() {
  createModal(`
    <h3 style="margin-bottom:20px; font-size:20px; font-weight:700;">계정 관리</h3>
    <div style="display:flex; flex-direction:column; gap:15px;">
      <button onclick="alert('비밀번호 변경 기능은 준비 중입니다')" style="width:100%; padding:15px; background:#fff; border:2px solid #e5e7eb; border-radius:8px; font-size:15px; font-weight:500; cursor:pointer; text-align:left;">🔒 비밀번호 변경</button>
      <button onclick="closeModal()" style="width:100%; padding:12px; background:#f3f4f6; border:none; border-radius:8px; font-size:15px; font-weight:500; cursor:pointer;">닫기</button>
    </div>
  `);
}

// ==============================
// 관심사 편집
// ==============================
function openEditInterestsModal() {
  if (!userData) return;
  
  const allInterests = [
    '음악', '미술', '스포츠', '푸드', '자연',
    '공연', '전시', '축제', '체험', '교육',
    '문화', '역사', '기술', '패션', '여행'
  ];
  
  const currentInterests = userData.profile?.interests || ['음악', '미술', '스포츠', '푸드', '자연'];
  
  const interestsHTML = allInterests.map(interest => {
    const isSelected = currentInterests.includes(interest);
    return `
      <button type="button" class="interest-option ${isSelected ? 'selected' : ''}" data-interest="${interest}"
        style="
          padding: 10px 20px; 
          border: 2px solid ${isSelected ? '#667eea' : '#ddd'}; 
          background: ${isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#fff'};
          color: ${isSelected ? '#fff' : '#333'};
          border-radius: 20px; 
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        ">${interest}</button>
    `;
  }).join('');
  
  createModal(`
    <h3 style="margin-bottom:20px; font-size:20px; font-weight:700;">관심사 편집</h3>
    <p style="color:#666; margin-bottom:15px; font-size:14px;">관심사를 선택하세요 (최대 10개)</p>
    <div id="interestsContainer" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
      ${interestsHTML}
    </div>
    <div style="display:flex; gap:10px;">
      <button type="button" onclick="saveInterests()" style="flex:1; padding:12px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer;">저장</button>
      <button type="button" onclick="closeModal()" style="flex:1; padding:12px; background:#f3f4f6; border:none; border-radius:8px; font-size:15px; font-weight:500; cursor:pointer;">취소</button>
    </div>
  `);
  
  // 관심사 토글 이벤트
  document.querySelectorAll('.interest-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = document.querySelectorAll('.interest-option.selected');
      
      if (btn.classList.contains('selected')) {
        // 선택 해제
        btn.classList.remove('selected');
        btn.style.border = '2px solid #ddd';
        btn.style.background = '#fff';
        btn.style.color = '#333';
      } else {
        // 선택 (최대 10개)
        if (selected.length >= 10) {
          alert('최대 10개까지 선택할 수 있습니다.');
          return;
        }
        btn.classList.add('selected');
        btn.style.border = '2px solid #667eea';
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.style.color = '#fff';
      }
    });
  });
}


// ==============================
// 🔥 수정: 관심사 저장 (JSON 파일에 저장)
// ==============================
window.saveInterests = async function() {
  const selected = Array.from(document.querySelectorAll('.interest-option.selected'))
    .map(btn => btn.dataset.interest);
  
  if (selected.length === 0) {
    alert('최소 1개 이상의 관심사를 선택해주세요.');
    return;
  }
  
  console.log('선택된 관심사:', selected);
  
  try {
    const userId = localStorage.getItem('userId');
    
    console.log('관심사 저장 요청:', { userId, interests: selected });
    
    // 🔥 user_api.php를 사용하여 JSON 파일에 저장
    const res = await fetch('./backend/user_api.php?action=update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        profile: {
          interests: selected
        }
      })
    });
    
    const data = await res.json();
    
    console.log('관심사 저장 응답:', data);
    
    if (data.success) {
      // 서버에서 받은 최신 데이터로 업데이트
      userData = data.data;
      
      // 🔥 localStorage에도 저장 (event_list.js에서 사용)
      localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
      
      console.log('✅ 관심사 JSON 파일에 저장 성공:', userData.profile?.interests);
      
      updateUI();
      closeModal();
      showNotification('관심사가 업데이트되었습니다');
    } else {
      throw new Error(data.message || '저장 실패');
    }
  } catch (error) {
    console.error('❌ 관심사 저장 실패:', error);
    alert('관심사 저장에 실패했습니다: ' + error.message);
  }
};


// ==============================
// 이벤트 리스너 설정
// ==============================
function setupEventListeners() {
  // 뒤로 가기
  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => window.history.back());
  }
  
  // 프로필 수정
  const editProfileBtn = document.querySelector('.edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', openEditProfileModal);
  }
  
  // 관심사 편집
  const interestsSection = document.querySelector('.interests-section');
  if (interestsSection) {
    const editBtn = interestsSection.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', openEditInterestsModal);
    }
  }
  
  // 설정 메뉴
  const settingsItems = document.querySelectorAll('.settings-item');
  settingsItems.forEach((item, index) => {
    item.addEventListener('click', () => handleSettingsClick(index));
  });
}

// ==============================
// 초기화
// ==============================
async function init() {
  console.log('=== 마이페이지 초기화 ===');
  
  // 로그인 확인
  if (!checkLogin()) return;
  
  console.log('로그인 확인 완료');
  
  // 프로필 로드
  await loadProfile();
  
  console.log('프로필 로드 완료');
  
  // 찜한 이벤트 로드
  await loadLikedEvents();
  
  console.log('찜한 이벤트 로드 완료');
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // 카드 애니메이션
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    card.style.animation = `fadeIn .5s ease ${i * 0.1}s both`;
  });
  
  console.log('마이페이지 초기화 완료');
}

// ==============================
// 페이지 로드
// ==============================
document.addEventListener('DOMContentLoaded', init);

// 실시간 동기화
window.addEventListener('focus', () => {
  console.log('페이지 포커스 - 좋아요 목록 새로고침');
  loadLikedEvents();
});

window.addEventListener('storage', (e) => {
  if (e.key === 'likedEvents') {
    console.log('좋아요 목록 변경 감지 - 새로고침');
    loadLikedEvents();
  }
});

console.log('MyPage JavaScript 로드 완료 (simple_backend.php) - 학번: 202300771');