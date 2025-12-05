// 학번: 202300771 이름: 박성준
// event_list.js - 이벤트 목록 페이지 (완전판)

// ==================== 전역 변수 ====================
let allEvents = []; // 전체 이벤트 데이터
let filteredEvents = []; // 필터링된 이벤트
let currentPage = 1;
const itemsPerPage = 12;

// ==================== DOM 요소 ====================
const eventGrid = document.getElementById('eventGrid');
const resultCount = document.getElementById('resultCount');
const searchInput = document.querySelector('.search-input');
const searchBtn = document.querySelector('.search-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortSelect = document.querySelector('.sort-select');
const detailFilterBtn = document.querySelector('.detail-filter-btn');
const detailFilterPanel = document.getElementById('detailFilterPanel');
const regionSelect = document.querySelector('.region-select');
const priceSelect = document.querySelector('.price-select');
const dateInputs = document.querySelectorAll('.date-input');
const applyFilterBtn = document.querySelector('.apply-filter-btn');
const resetFilterBtn = document.querySelector('.reset-filter-btn');

// ==================== 사용자 관심사 가져오기 ====================
function getUserInterests() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];
    
    const userDataStr = localStorage.getItem(`userData_${userId}`);
    if (!userDataStr) return [];
    
    const userData = JSON.parse(userDataStr);
    return userData.profile?.interests || [];
  } catch (e) {
    console.error('관심사 가져오기 오류:', e);
    return [];
  }
}

// ==================== 날짜 파싱 유틸리티 ====================

/**
 * YYYYMMDD 형식을 Date 객체로 변환
 */
function parseEventStartDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  const y = parseInt(yyyymmdd.slice(0, 4));
  const m = parseInt(yyyymmdd.slice(4, 6)) - 1;
  const d = parseInt(yyyymmdd.slice(6, 8));
  return new Date(y, m, d);
}

/**
 * 날짜 순 정렬 (최신순)
 */
function sortByDateDescending(events) {
  return events.sort((a, b) => {
    const dateA = parseEventStartDate(a.eventstartdate);
    const dateB = parseEventStartDate(b.eventstartdate);
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return dateB - dateA;
  });
}

/**
 * 별점순 정렬 (랜덤)
 */
function sortByRating(events) {
  return events.sort(() => Math.random() - 0.5);
}

// ==================== API 호출 함수 ====================

async function fetchDaejeonFestivals() {
  const today = new Date();
  const lastYear = new Date();
  const nextYear = new Date();
  lastYear.setFullYear(today.getFullYear() - 1);
  nextYear.setFullYear(today.getFullYear() + 1);

  const formatYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const url = new URL('https://apis.data.go.kr/B551011/KorService2/searchFestival2');
  url.searchParams.set('serviceKey', '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6');
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'TEST');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('areaCode', '3');
  url.searchParams.set('eventStartDate', formatYYYYMMDD(lastYear));
  url.searchParams.set('eventEndDate', formatYYYYMMDD(nextYear));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`대전 축제 API 호출 실패: HTTP ${res.status}`);

  const json = await res.json();
  const header = json.response?.header;
  if (!header || header.resultCode !== '0000') {
    throw new Error(header?.resultMsg || '대전 축제 API 응답 에러');
  }

  const items = json.response?.body?.items?.item || [];
  return normalizeFestivalData(items, 'daejeon');
}

async function fetchBusanFestivals() {
  const today = new Date();
  const lastYear = new Date();
  const nextYear = new Date();
  lastYear.setFullYear(today.getFullYear() - 1);
  nextYear.setFullYear(today.getFullYear() + 1);

  const formatYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const url = new URL('https://apis.data.go.kr/B551011/KorService2/searchFestival2');
  url.searchParams.set('serviceKey', '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6');
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'TEST');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('areaCode', '6');
  url.searchParams.set('eventStartDate', formatYYYYMMDD(lastYear));
  url.searchParams.set('eventEndDate', formatYYYYMMDD(nextYear));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`부산 축제 API 호출 실패: HTTP ${res.status}`);

  const json = await res.json();
  const header = json.response?.header;
  if (!header || header.resultCode !== '0000') {
    throw new Error(header?.resultMsg || '부산 축제 API 응답 에러');
  }

  const items = json.response?.body?.items?.item || [];
  return normalizeFestivalData(items, 'busan');
}

async function fetchSeoulFestivals() {
  const today = new Date();
  const lastYear = new Date();
  const nextYear = new Date();
  lastYear.setFullYear(today.getFullYear() - 1);
  nextYear.setFullYear(today.getFullYear() + 1);

  const formatYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const url = new URL('https://apis.data.go.kr/B551011/KorService2/searchFestival2');
  url.searchParams.set('serviceKey', '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6');
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'TEST');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('areaCode', '1');
  url.searchParams.set('eventStartDate', formatYYYYMMDD(lastYear));
  url.searchParams.set('eventEndDate', formatYYYYMMDD(nextYear));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`서울 축제 API 호출 실패: HTTP ${res.status}`);

  const json = await res.json();
  const header = json.response?.header;
  if (!header || header.resultCode !== '0000') {
    throw new Error(header?.resultMsg || '서울 축제 API 응답 에러');
  }

  const items = json.response?.body?.items?.item || [];
  return normalizeFestivalData(items, 'seoul');
}

function normalizeFestivalData(items, region) {
  const formatTourDate = (yyyymmdd) => {
    if (!yyyymmdd || yyyymmdd.length !== 8) return '';
    const y = yyyymmdd.slice(0, 4);
    const m = Number(yyyymmdd.slice(4, 6));
    const d = Number(yyyymmdd.slice(6, 8));
    return `${y}.${m}.${d}`;
  };

  const formatTourDateRange = (start, end) => {
    const s = formatTourDate(start);
    const e = formatTourDate(end);
    if (s && e) return `${s} ~ ${e}`;
    if (s && !e) return s;
    if (!s && e) return e;
    return '';
  };

  return items.map((f, idx) => {
    const title = (f.title || '').toLowerCase();
    const catText = `${f.cat1 || ''} ${f.cat2 || ''} ${f.cat3 || ''}`.toLowerCase();
    const searchText = `${title} ${catText}`;

    const categories = [];
    if (searchText.includes('음악') || searchText.includes('뮤직') || searchText.includes('콘서트'))
      categories.push('음악');
    if (searchText.includes('미술') || searchText.includes('전시') || searchText.includes('갤러리'))
      categories.push('미술');
    if (searchText.includes('스포츠') || searchText.includes('체육') || searchText.includes('경기'))
      categories.push('스포츠');
    if (searchText.includes('음식') || searchText.includes('푸드') || searchText.includes('맛'))
      categories.push('푸드');
    if (searchText.includes('공연') || searchText.includes('연극') || searchText.includes('뮤지컬'))
      categories.push('공연');
    if (searchText.includes('역사') || searchText.includes('유적') || searchText.includes('전통'))
      categories.push('역사');
    if (searchText.includes('문화재') || searchText.includes('문화유산'))
      categories.push('문화');
    if (searchText.includes('체험') || searchText.includes('워크숍'))
      categories.push('체험');
    if (searchText.includes('자연') || searchText.includes('생태') || searchText.includes('환경'))
      categories.push('자연');

    if (!categories.includes('축제')) {
      categories.push('축제');
    }

    const categoryLabel = categories[0] || '축제';

    let imageUrl = f.firstimage || f.firstimage2 || '';
    if (imageUrl && imageUrl.startsWith('http://')) {
      imageUrl = imageUrl.replace('http://', 'https://');
    }

    return {
      id: region + '-' + (f.contentid || (idx + 1)),
      regionCode: region,
      title: f.title || '제목 없음',
      dateText: formatTourDateRange(f.eventstartdate, f.eventenddate),
      eventstartdate: f.eventstartdate,
      eventenddate: f.eventenddate,
      locationText: f.addr1 || f.addr2 || '',
      summary: f.overview || '',
      host: '',
      topic: '',
      address: (f.addr1 || '') + (f.addr2 ? ' ' + f.addr2 : ''),
      priceText: '무료',
      categoryKey: 'festival',
      categoryLabel,
      categories,
      imageUrl
    };
  });
}

// ==================== 카드 렌더링 ====================

function renderEventCards(events) {
  if (!eventGrid) return;

  if (events.length === 0) {
    eventGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <p style="font-size: 48px; margin-bottom: 20px;">🔍</p>
        <p style="font-size: 18px; color: #666;">검색 결과가 없습니다.</p>
        <p style="font-size: 14px; color: #999; margin-top: 10px;">다른 검색어나 필터를 시도해보세요.</p>
      </div>
    `;
    return;
  }

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageEvents = events.slice(startIdx, endIdx);

  eventGrid.innerHTML = pageEvents.map(event => `
    <article class="event-card" onclick="goToDetail('${event.id}')">
      <div class="event-image">
        ${event.imageUrl 
          ? `<img src="${event.imageUrl}" alt="${event.title}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Cdefs%3E%3ClinearGradient id=%22grad%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 style=%22stop-color:%23667eea;stop-opacity:1%22 /%3E%3Cstop offset=%22100%25%22 style=%22stop-color:%23764ba2;stop-opacity:1%22 /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23grad)%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2272%22 fill=%22white%22%3E🎪%3C/text%3E%3C/svg%3E';">` 
          : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 72px;">🎪</div>`
        }
        <span class="event-badge">${event.categoryLabel}</span>
      </div>
      <div class="event-content">
        <h3 class="event-title">${event.title}</h3>
        <div class="event-info">
          <span class="event-date">${event.dateText}</span>
          <span class="event-location">${event.locationText}</span>
        </div>
        <div class="event-footer">
          <span class="event-price">${event.priceText}</span>
          <button class="like-btn" onclick="toggleLike(event, '${event.id}')">♡</button>
        </div>
      </div>
    </article>
  `).join('');
}

// ==================== 필터링 ====================

function applyFilters() {
  let result = [...allEvents];

  // 1. 검색어 필터
  const searchTerm = searchInput?.value.toLowerCase().trim();
  if (searchTerm) {
    result = result.filter(event => 
      event.title.toLowerCase().includes(searchTerm) ||
      event.locationText.toLowerCase().includes(searchTerm) ||
      event.summary.toLowerCase().includes(searchTerm)
    );
  }

  // 2. 지역 필터
  const selectedRegion = regionSelect?.value;
  if (selectedRegion) {
    result = result.filter(event => event.regionCode === selectedRegion);
  }

  // 3. 가격 필터
  const selectedPrice = priceSelect?.value;
  if (selectedPrice === 'free') {
    result = result.filter(event => event.priceText.includes('무료'));
  } else if (selectedPrice === 'paid') {
    result = result.filter(event => !event.priceText.includes('무료'));
  }

  // 4. 날짜 범위 필터
  if (dateInputs && dateInputs.length === 2) {
    const startDateStr = dateInputs[0].value;
    const endDateStr = dateInputs[1].value;
    
    if (startDateStr || endDateStr) {
      result = result.filter(event => {
        if (!event.eventstartdate) return false;
        
        const eventDate = parseEventStartDate(event.eventstartdate);
        if (!eventDate) return false;
        
        if (startDateStr) {
          const startDate = new Date(startDateStr);
          if (eventDate < startDate) return false;
        }
        
        if (endDateStr) {
          const endDate = new Date(endDateStr);
          if (eventDate > endDate) return false;
        }
        
        return true;
      });
    }
  }

  // 5. 정렬
  const sortBy = sortSelect?.value || 'latest';
  if (sortBy === 'latest') {
    result = sortByDateDescending([...result]);
  } else if (sortBy === 'rating') {
    result = sortByRating([...result]);
  }

  filteredEvents = result;
  currentPage = 1;
  updateDisplay();
}

// 내 취향 필터
function applyMyInterestsFilter() {
  const userInterests = getUserInterests();
  
  if (userInterests.length === 0) {
    alert('마이페이지에서 관심사를 설정해주세요!');
    filteredEvents = [...allEvents];
  } else {
    filteredEvents = allEvents.filter(event => {
      return event.categories.some(cat => userInterests.includes(cat));
    });
    
    if (filteredEvents.length === 0) {
      alert('관심사와 일치하는 이벤트가 없습니다.');
      filteredEvents = [...allEvents];
    }
  }
  
  // 정렬 적용
  const sortBy = sortSelect?.value || 'latest';
  if (sortBy === 'latest') {
    filteredEvents = sortByDateDescending([...filteredEvents]);
  } else if (sortBy === 'rating') {
    filteredEvents = sortByRating([...filteredEvents]);
  }
  
  currentPage = 1;
  updateDisplay();
}

// ==================== 표시 업데이트 ====================

function updateDisplay() {
  renderEventCards(filteredEvents);
  updateResultCount();
  updatePagination();
}

function updateResultCount() {
  if (resultCount) {
    resultCount.textContent = filteredEvents.length;
  }
}

function updatePagination() {
  const pagination = document.querySelector('.pagination');
  if (!pagination) return;

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  
  let html = `
    <button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
  `;

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) html += `<span class="page-dots">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-dots">...</span>`;
    html += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  html += `
    <button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
  `;

  pagination.innerHTML = html;
}

// ==================== 이벤트 핸들러 ====================

function changePage(page) {
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  updateDisplay();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToDetail(eventId) {
  window.location.href = `event_detail.html?id=${encodeURIComponent(eventId)}`;
}

function toggleLike(event, eventId) {
  event.stopPropagation();
  const btn = event.target;
  
  if (btn.textContent === '♡') {
    btn.textContent = '♥';
    btn.classList.add('active');
  } else {
    btn.textContent = '♡';
    btn.classList.remove('active');
  }
}

function goToNotifications() {
  alert('🔔 알림 기능은 준비 중입니다.');
}

// ==================== 초기화 ====================

async function initEventListPage() {
  try {
    console.log('이벤트 데이터 로딩 시작...');
    
    if (eventGrid) {
      eventGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <p style="font-size: 64px; margin-bottom: 20px;">⏳</p>
          <p style="font-size: 20px; color: #667eea; font-weight: 600;">이벤트 정보를 불러오는 중...</p>
          <p style="font-size: 14px; color: #94a3b8; margin-top: 10px;">잠시만 기다려주세요</p>
        </div>
      `;
    }

    const [daejeon, busan, seoul] = await Promise.all([
      fetchDaejeonFestivals().catch(err => {
        console.error('대전 축제 로드 실패:', err);
        return [];
      }),
      fetchBusanFestivals().catch(err => {
        console.error('부산 축제 로드 실패:', err);
        return [];
      }),
      fetchSeoulFestivals().catch(err => {
        console.error('서울 축제 로드 실패:', err);
        return [];
      })
    ]);

    allEvents = [...daejeon, ...busan, ...seoul];
    allEvents = sortByDateDescending(allEvents);
    filteredEvents = [...allEvents];

    console.log('전체 이벤트 로드 완료:', allEvents.length);
    updateDisplay();

  } catch (error) {
    console.error('초기화 오류:', error);
    if (eventGrid) {
      eventGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <p style="font-size: 64px; margin-bottom: 20px;">❌</p>
          <p style="font-size: 20px; color: #ef4444; font-weight: 600;">데이터를 불러오는 중 오류가 발생했습니다</p>
          <button onclick="location.reload()" style="margin-top: 24px; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 15px; font-weight: 600;">다시 시도</button>
        </div>
      `;
    }
  }
}

// ==================== 이벤트 리스너 ====================

document.addEventListener('DOMContentLoaded', () => {
  // 검색
  if (searchBtn) {
    searchBtn.addEventListener('click', applyFilters);
  }
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') applyFilters();
    });
  }

  // 필터 버튼
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const category = btn.dataset.category;
      if (category === 'all') {
        filteredEvents = [...allEvents];
        applyFilters();
      } else if (category === 'my-interests') {
        applyMyInterestsFilter();
      }
    });
  });

  // 정렬
  if (sortSelect) {
    sortSelect.addEventListener('change', applyFilters);
  }

  // 상세 필터 토글
  if (detailFilterBtn && detailFilterPanel) {
    detailFilterBtn.addEventListener('click', () => {
      const isHidden = detailFilterPanel.style.display === 'none' || !detailFilterPanel.style.display;
      detailFilterPanel.style.display = isHidden ? 'block' : 'none';
    });
  }

  // 필터 적용
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      applyFilters();
      if (detailFilterPanel) {
        detailFilterPanel.style.display = 'none';
      }
    });
  }

  // 필터 초기화
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (regionSelect) regionSelect.value = '';
      if (priceSelect) priceSelect.value = '';
      if (sortSelect) sortSelect.value = 'latest';
      if (dateInputs) {
        dateInputs.forEach(input => input.value = '');
      }
      
      filteredEvents = [...allEvents];
      applyFilters();
      
      if (detailFilterPanel) {
        detailFilterPanel.style.display = 'none';
      }
    });
  }

  initEventListPage();
});

console.log('Event List JavaScript 로드 완료 - 학번: 202300771');