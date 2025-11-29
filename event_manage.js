// 학번: 202300771 이름: 박성준
// event_manage.js - 관리자 대시보드 (API 관리 + 회원 관리 + 다크모드)

// ==============================
// 전역 상태
// ==============================
const API_LIST_KEY = 'adminApiList';
const SYNC_HISTORY_KEY = 'syncHistory';
const USERS_KEY = 'users'; // 회원 데이터 (기존 users와 동일)
const USER_REPORTS_KEY = 'userReports'; // 신고 내역
const THEME_KEY = 'adminTheme';

// ==============================
// 기본 API 목록
// ==============================
const defaultAPIs = [
  {
    id: 'daejeon-api',
    name: '대전광역시 축제 API',
    url: 'https://apis.data.go.kr/6300000/openapi2022/festv/getfestv',
    apiKey: '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6',
    isActive: true,
    lastSync: new Date().toISOString(),
    errorMsg: null,
    source: '대전광역시',
    eventCount: 0
  },
  {
    id: 'busan-api',
    name: '부산광역시 축제 API',
    url: 'https://apis.data.go.kr/6260000/FestivalService/getFestivalKr',
    apiKey: '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6',
    isActive: true,
    lastSync: new Date().toISOString(),
    errorMsg: null,
    source: '부산광역시',
    eventCount: 0
  }
];

// ==============================
// 하드코딩 회원 데이터
// ==============================
const hardcodedUsers = [
  {
    id: 'user-001',
    name: '김철수',
    email: 'kim@example.com',
    joinDate: '2024-11-15',
    status: 'active',
    warningCount: 0,
    lastLogin: '2025-01-21'
  },
  {
    id: 'user-002',
    name: '이영희',
    email: 'lee@example.com',
    joinDate: '2024-12-01',
    status: 'active',
    warningCount: 1,
    lastLogin: '2025-01-20'
  },
  {
    id: 'user-003',
    name: '박민수',
    email: 'park@example.com',
    joinDate: '2024-10-20',
    status: 'suspended',
    warningCount: 3,
    lastLogin: '2025-01-18'
  },
  {
    id: 'user-004',
    name: '최지은',
    email: 'choi@example.com',
    joinDate: '2025-01-10',
    status: 'active',
    warningCount: 0,
    lastLogin: '2025-01-21'
  },
  {
    id: 'user-005',
    name: '정다은',
    email: 'jung@example.com',
    joinDate: '2024-09-05',
    status: 'active',
    warningCount: 2,
    lastLogin: '2025-01-19'
  }
];

// ==============================
// 로컬스토리지 관리
// ==============================
function loadAPIs() {
  const saved = localStorage.getItem(API_LIST_KEY);
  if (saved) return JSON.parse(saved);
  saveAPIs(defaultAPIs);
  return defaultAPIs;
}

function saveAPIs(apiList) {
  localStorage.setItem(API_LIST_KEY, JSON.stringify(apiList));
}

function loadUsers() {
  const saved = localStorage.getItem(USERS_KEY);
  if (saved) {
    const users = JSON.parse(saved);
    // 기존 users에 관리 필드 추가
    return users.map(u => ({
      id: u.email || 'user-' + Math.random().toString(36).substr(2, 9),
      name: u.name || '익명',
      email: u.email || '',
      joinDate: u.joinDate || '2024-01-01',
      status: u.status || 'active',
      warningCount: u.warningCount || 0,
      lastLogin: new Date().toISOString().split('T')[0]
    }));
  }
  // 없으면 하드코딩 데이터 사용
  return hardcodedUsers;
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSyncHistory() {
  const saved = localStorage.getItem(SYNC_HISTORY_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveSyncHistory(history) {
  localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(history));
}

// ==============================
// 시간 차이 계산
// ==============================
function getTimeDifference(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMin = Math.floor(diffMs / 60000);
  
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

// ==============================
// API 카드 렌더링
// ==============================
function renderAPICards() {
  const apiList = loadAPIs();
  const container = document.getElementById('apiList');
  
  container.innerHTML = '';
  
  apiList.forEach(api => {
    const card = createAPICard(api);
    container.appendChild(card);
  });
  
  updateStats();
}

function createAPICard(api) {
  const card = document.createElement('div');
  card.className = 'api-card';
  
  const statusClass = api.isActive ? 'status-active' : 'status-inactive';
  const statusText = api.isActive ? '● 활성' : '● 비활성';
  
  let syncInfo = '';
  if (api.isActive && api.lastSync) {
    syncInfo = `마지막 동기화: ${getTimeDifference(api.lastSync)}`;
  } else if (api.errorMsg) {
    syncInfo = `오류: ${api.errorMsg}`;
  } else {
    syncInfo = '동기화 필요';
  }
  
  card.innerHTML = `
    <div class="api-info">
      <div class="api-name">${api.name}</div>
      <div class="api-url">${api.url}</div>
      <span class="api-status ${statusClass}">${statusText}</span>
      <span style="font-size: 12px; color: #666; margin-left: 10px;">${syncInfo}</span>
      ${api.eventCount > 0 ? `<span style="font-size: 12px; color: #27ae60; margin-left: 10px;">📊 ${api.eventCount}개 이벤트</span>` : ''}
    </div>
    <div class="api-actions">
      <button class="action-btn sync-btn" onclick="syncAPI('${api.id}')" ${!api.isActive ? 'disabled style="opacity: 0.5;"' : ''}>🔄 동기화</button>
      <button class="action-btn" onclick="toggleAPIStatus('${api.id}')">${api.isActive ? '⏸️ 비활성화' : '▶️ 활성화'}</button>
      <button class="action-btn" onclick="openAPISettings('${api.id}')">⚙️ 설정</button>
      <button class="action-btn delete-btn" onclick="deleteAPI('${api.id}')">🗑️ 삭제</button>
    </div>
  `;
  
  return card;
}

// ==============================
// API 동기화
// ==============================
async function syncAPI(apiId) {
  showNotification('🔄 동기화 중...');
  
  const apiList = loadAPIs();
  const api = apiList.find(a => a.id === apiId);
  
  if (!api || !api.isActive) {
    showNotification('⚠️ 활성화된 API가 아닙니다.');
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const eventCount = Math.floor(Math.random() * 50) + 10;
  api.lastSync = new Date().toISOString();
  api.eventCount = eventCount;
  api.errorMsg = null;
  
  saveAPIs(apiList);
  addSyncHistory(api.name, eventCount, '성공');
  
  renderAPICards();
  renderSyncHistory();
  
  showNotification(`✅ ${api.name} 동기화 완료! ${eventCount}개 이벤트`);
}

function toggleAPIStatus(apiId) {
  const apiList = loadAPIs();
  const api = apiList.find(a => a.id === apiId);
  
  if (!api) return;
  
  if (confirm(`${api.name}을(를) ${!api.isActive ? '활성화' : '비활성화'}하시겠습니까?`)) {
    api.isActive = !api.isActive;
    api.errorMsg = api.isActive ? null : '관리자가 비활성화함';
    saveAPIs(apiList);
    renderAPICards();
    showNotification(`${api.isActive ? '✅ 활성화' : '⏸️ 비활성화'} 완료`);
  }
}

function deleteAPI(apiId) {
  const apiList = loadAPIs();
  const api = apiList.find(a => a.id === apiId);
  
  if (!api) return;
  
  if (confirm(`정말 "${api.name}"을(를) 삭제하시겠습니까?`)) {
    const newList = apiList.filter(a => a.id !== apiId);
    saveAPIs(newList);
    renderAPICards();
    showNotification(`🗑️ ${api.name} 삭제 완료`);
  }
}

function openAPISettings(apiId) {
  const apiList = loadAPIs();
  const api = apiList.find(a => a.id === apiId);
  
  if (!api) return;
  
  const newName = prompt(`API 이름 수정:\n\n현재: ${api.name}`, api.name);
  
  if (newName && newName.trim()) {
    api.name = newName.trim();
    saveAPIs(apiList);
    renderAPICards();
    showNotification('✅ API 이름 변경 완료');
  }
}

function addNewAPI() {
  const name = prompt('API 이름을 입력하세요:');
  if (!name || !name.trim()) return;
  
  const url = prompt('API URL을 입력하세요:');
  if (!url || !url.trim()) return;
  
  const apiKey = prompt('API Key를 입력하세요:\n(선택사항)', '');
  
  const newAPI = {
    id: 'custom-' + Date.now(),
    name: name.trim(),
    url: url.trim(),
    apiKey: apiKey.trim(),
    isActive: false,
    lastSync: null,
    errorMsg: '동기화 필요',
    source: name.trim().split(' ')[0],
    eventCount: 0
  };
  
  const apiList = loadAPIs();
  apiList.push(newAPI);
  saveAPIs(apiList);
  
  renderAPICards();
  showNotification('✅ 새 API 추가 완료!');
}

// ==============================
// 동기화 히스토리
// ==============================
function addSyncHistory(apiName, eventCount, status) {
  const history = loadSyncHistory();
  history.unshift({
    apiName,
    eventCount,
    status,
    timestamp: new Date().toISOString()
  });
  
  if (history.length > 50) history.length = 50;
  saveSyncHistory(history);
}

function renderSyncHistory() {
  const history = loadSyncHistory();
  const tbody = document.getElementById('syncHistoryBody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">동기화 기록이 없습니다.</td></tr>';
    return;
  }
  
  history.slice(0, 5).forEach(item => {
    const row = document.createElement('tr');
    const timeDiff = getTimeDifference(item.timestamp);
    const source = item.apiName.includes('대전') ? '대전광역시' : 
                   item.apiName.includes('부산') ? '부산광역시' : '기타';
    
    row.innerHTML = `
      <td>🎉 ${item.apiName}</td>
      <td><span class="event-source">${source}</span></td>
      <td>${item.eventCount}개 이벤트</td>
      <td>${item.status}</td>
      <td>${timeDiff}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// ==============================
// 회원 관리
// ==============================
function renderUsers(filteredUsers = null) {
  const users = filteredUsers || loadUsers();
  const tbody = document.getElementById('userTableBody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    const statusClass = user.status === 'active' ? 'status-active' : 'status-inactive';
    const statusText = user.status === 'active' ? '정상' : '정지';
    
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.joinDate}</td>
      <td><span class="api-status ${statusClass}">● ${statusText}</span></td>
      <td style="color: ${user.warningCount > 0 ? '#e74c3c' : '#666'};">⚠️ ${user.warningCount}회</td>
      <td>
        <button class="action-btn" style="font-size: 12px; padding: 6px 12px;" onclick="sendWarning('${user.id}')">⚠️ 경고</button>
        <button class="action-btn ${user.status === 'active' ? 'delete-btn' : ''}" style="font-size: 12px; padding: 6px 12px;" onclick="toggleUserStatus('${user.id}')">
          ${user.status === 'active' ? '🚫 정지' : '✅ 해제'}
        </button>
        <button class="action-btn" style="font-size: 12px; padding: 6px 12px;" onclick="viewUserDetail('${user.id}')">👁️ 상세</button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

function sendWarning(userId) {
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) return;
  
  const reason = prompt(`"${user.name}"님에게 경고를 보냅니다.\n\n경고 사유를 입력하세요:`);
  
  if (reason && reason.trim()) {
    user.warningCount = (user.warningCount || 0) + 1;
    
    // 경고 3회 이상 시 자동 정지
    if (user.warningCount >= 3) {
      user.status = 'suspended';
      alert(`경고 누적 3회로 "${user.name}"님의 계정이 자동 정지되었습니다.`);
    }
    
    saveUsers(users);
    renderUsers();
    
    showNotification(`⚠️ ${user.name}님에게 경고 전송 완료 (누적 ${user.warningCount}회)`);
    console.log(`경고 전송: ${user.name} (${user.email}) - 사유: ${reason}`);
  }
}

function toggleUserStatus(userId) {
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) return;
  
  const newStatus = user.status === 'active' ? 'suspended' : 'active';
  const action = newStatus === 'suspended' ? '정지' : '해제';
  
  if (confirm(`"${user.name}"님의 계정을 ${action}하시겠습니까?`)) {
    user.status = newStatus;
    saveUsers(users);
    renderUsers();
    
    showNotification(`${newStatus === 'suspended' ? '🚫' : '✅'} ${user.name}님 계정 ${action} 완료`);
  }
}

function viewUserDetail(userId) {
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) return;
  
  alert(`회원 상세 정보\n\nID: ${user.id}\n이름: ${user.name}\n이메일: ${user.email}\n가입일: ${user.joinDate}\n상태: ${user.status === 'active' ? '정상' : '정지'}\n경고 횟수: ${user.warningCount}회\n마지막 로그인: ${user.lastLogin}`);
}

function searchUsers() {
  const input = document.getElementById('userSearchInput');
  const query = input.value.trim().toLowerCase();
  
  if (!query) {
    renderUsers();
    return;
  }
  
  const users = loadUsers();
  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(query) || 
    u.email.toLowerCase().includes(query)
  );
  
  renderUsers(filtered);
  showNotification(`🔍 검색 결과: ${filtered.length}명`);
}

function loadMoreUsers() {
  showNotification('📋 모든 회원이 표시되었습니다.');
}

// ==============================
// 다크모드
// ==============================
function changeTheme(theme) {
  console.log('테마 변경:', theme);
  localStorage.setItem(THEME_KEY, theme);
  
  if (theme === 'dark') {
    document.body.style.cssText = `
      background-color: #1a1a1a;
      color: #e0e0e0;
    `;
    
    document.querySelector('.sidebar').style.cssText = `
      background-color: #0d1117;
    `;
    
    document.querySelectorAll('.header, .stat-card, .api-section, .user-section, .recent-events, .settings-section').forEach(el => {
      el.style.backgroundColor = '#161b22';
      el.style.color = '#e0e0e0';
    });
    
    document.querySelectorAll('.api-card, .event-table').forEach(el => {
      el.style.backgroundColor = '#0d1117';
      el.style.borderColor = '#30363d';
    });
    
    showNotification('🌙 다크 모드로 변경되었습니다.');
  } else {
    document.body.style.cssText = '';
    document.querySelector('.sidebar').style.cssText = '';
    
    document.querySelectorAll('.header, .stat-card, .api-section, .user-section, .recent-events, .settings-section, .api-card, .event-table').forEach(el => {
      el.style.backgroundColor = '';
      el.style.color = '';
      el.style.borderColor = '';
    });
    
    showNotification('☀️ 라이트 모드로 변경되었습니다.');
  }
}

function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
  if (radio) {
    radio.checked = true;
    if (theme === 'dark') changeTheme('dark');
  }
}

// ==============================
// 메뉴 네비게이션
// ==============================
function initMenu() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      
      const menu = item.dataset.menu;
      
      // 모든 섹션 숨기기
      document.getElementById('apiSection').style.display = 'none';
      document.getElementById('userSection').style.display = 'none';
      document.getElementById('settingsSection').style.display = 'none';
      document.getElementById('recentEvents').style.display = 'none';
      
      // 선택한 메뉴 섹션 표시
      if (menu === 'dashboard') {
        document.getElementById('apiSection').style.display = 'block';
        document.getElementById('recentEvents').style.display = 'block';
      } else if (menu === 'api') {
        document.getElementById('apiSection').style.display = 'block';
        document.getElementById('recentEvents').style.display = 'block';
      } else if (menu === 'users') {
        document.getElementById('userSection').style.display = 'block';
        renderUsers();
      } else if (menu === 'settings') {
        document.getElementById('settingsSection').style.display = 'block';
      }
    });
  });
}

// ==============================
// 통계 업데이트
// ==============================
function updateStats() {
  const apiList = loadAPIs();
  const users = loadUsers();
  
  const totalEvents = apiList.reduce((sum, api) => sum + api.eventCount, 0);
  const activeUsers = users.filter(u => u.status === 'active').length;
  
  document.getElementById('statApiCount').textContent = apiList.length;
  document.getElementById('statEventCount').textContent = totalEvents;
  document.getElementById('statUserCount').textContent = activeUsers;
  document.getElementById('statReportCount').textContent = users.filter(u => u.warningCount > 0).length;
}

// ==============================
// 날짜 업데이트
// ==============================
function updateDate() {
  const dateElement = document.querySelector('.header-date');
  if (!dateElement) return;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[now.getDay()];
  
  dateElement.textContent = `${year}. ${month}. ${day} (${weekday})`;
}

// ==============================
// 알림 함수
// ==============================
function showNotification(message) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; bottom: 30px; right: 30px; 
    background: rgba(0,0,0,.85); color: #fff; padding: 16px 32px; border-radius: 8px;
    font-size: 15px; font-weight: 500; z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,.3);
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
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
  
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1000);
}

// ==============================
// 관리자 정보 로드
// ==============================
function loadAdminInfo() {
  const userName = localStorage.getItem('userName') || '관리자';
  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl) {
    adminNameEl.textContent = userName;
  }
}

// ==============================
// 관리자 권한 확인
// ==============================
function checkAdminAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  if (!isLoggedIn || !isAdmin) {
    showNotification('관리자 권한이 필요합니다');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
    return false;
  }
  
  return true;
}

// ==============================
// 초기화
// ==============================
function init() {
  console.log('=== 관리자 대시보드 초기화 ===');
  
  // 관리자 권한 확인
  if (!checkAdminAuth()) return;
  
  // 관리자 정보 로드
  loadAdminInfo();
  
  updateDate();
  renderAPICards();
  renderSyncHistory();
  initMenu();
  loadTheme();
  updateStats();
  
  console.log('초기화 완료');
}

// ==============================
// 전역 함수 등록
// ==============================
window.syncAPI = syncAPI;
window.toggleAPIStatus = toggleAPIStatus;
window.deleteAPI = deleteAPI;
window.openAPISettings = openAPISettings;
window.addNewAPI = addNewAPI;
window.sendWarning = sendWarning;
window.toggleUserStatus = toggleUserStatus;
window.viewUserDetail = viewUserDetail;
window.searchUsers = searchUsers;
window.loadMoreUsers = loadMoreUsers;
window.changeTheme = changeTheme;
window.handleLogout = handleLogout;

document.addEventListener('DOMContentLoaded', init);

console.log('Event Manage JavaScript 로드 완료 - 학번: 202300771');