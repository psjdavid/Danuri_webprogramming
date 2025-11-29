// -------------------- DOM --------------------
const detailFilterBtn = document.querySelector('.detail-filter-btn');
const detailFilterPanel = document.getElementById('detailFilterPanel');
const filterBtns = document.querySelectorAll('.filter-btn');
const viewBtns = document.querySelectorAll('.view-btn');
const eventGrid = document.getElementById('eventGrid');
const searchInput = document.querySelector('.search-input');
const searchBtn = document.querySelector('.search-btn');
const sortSelect = document.querySelector('.sort-select');
const resetFilterBtn = document.querySelector('.reset-filter-btn');
const applyFilterBtn = document.querySelector('.apply-filter-btn');
const resultCountStrong = document.querySelector('.result-count strong');
const paginationContainer = document.querySelector('.pagination'); // 페이지네이션 컨테이너
const ITEMS_PER_PAGE = 30;    // 한 페이지당 30개
let currentPage = 1;          // 현재 페이지
let lastFilteredIndices = []; // 필터 적용 후 살아있는 카드들의 인덱스

// -------------------- 대전 / 부산 축제 API 설정 --------------------
// 대전 축제 API
const DAEJEON_FESTIVAL_API_URL =
  'https://apis.data.go.kr/6300000/openapi2022/festv/getfestv';

const DAEJEON_API_KEY =
  '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6';

// 부산 축제 API
const BUSAN_FESTIVAL_API_URL =
  'https://apis.data.go.kr/6260000/FestivalService/getFestivalKr';

const BUSAN_API_KEY =
  '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6';

let allFestivalEvents = []; // API에서 받은 축제 데이터
let cards = [];             // DOM에 그려진 카드 메타정보
let userInterests = [];     // 사용자 관심사

// -------------------- 사용자 관심사 로드 --------------------
async function loadUserInterests() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('로그인 안됨 - 기본 관심사 사용');
      userInterests = ['음악', '미술', '스포츠', '푸드', '자연'];
      return;
    }

    const API_URL = './simple_backend.php';
    const res = await fetch(`${API_URL}?action=get_profile&userId=${userId}`);
    const data = await res.json();

    if (data.success && data.data.profile?.interests) {
      userInterests = data.data.profile.interests;
      console.log('✅ 사용자 관심사 로드:', userInterests);
    } else {
      userInterests = ['음악', '미술', '스포츠', '푸드', '자연'];
      console.log('프로필에 관심사 없음 - 기본값 사용');
    }
  } catch (error) {
    console.error('관심사 로드 실패:', error);
    userInterests = ['음악', '미술', '스포츠', '푸드', '자연'];
  }
}

// -------------------- 관심사 매칭 함수 --------------------
function matchesInterests(eventTitle, eventDescription) {
  if (!userInterests || userInterests.length === 0) return false;
  
  // 관심사별 키워드 맵 (중복 제거 및 명확화)
  const interestKeywords = {
    '음악': ['음악', '뮤직', '콘서트', '뮤지션', '밴드', '노래', '가수', 'music', 'concert', '라이브'],
    '미술': ['미술', '회화', '조각', '그림', '화가', '작가', 'art', 'painting'],
    '스포츠': ['스포츠', '경기', '운동', '마라톤', '축구', '야구', '농구', '배구', 'sports', 'game', '체육'],
    '푸드': ['푸드', '음식', '먹거리', '맛집', '요리', '미식', '식도락', 'food', 'gourmet', '쿠킹'],
    '자연': ['자연', '생태', '숲', '산', '바다', '공원', '힐링', 'nature', 'eco', '환경'],
    '공연': ['공연', '연극', '뮤지컬', '무용', '오페라', 'performance', 'show', '무대'],
    '전시': ['전시', '박물관', '미술관', '갤러리', '전람회', 'exhibition', 'museum', 'gallery'],
    '축제': ['축제', '페스티벌', '페스타', '축전', 'festival', 'festa'],
    '체험': ['체험', '참여', '워크숍', '만들기', 'experience', 'workshop', '실습'],
    '교육': ['교육', '강연', '세미나', '특강', '강의', 'education', 'lecture', '수업'],
    '문화': ['문화', '예술', '전통', 'culture', 'traditional', '문화재'],
    '역사': ['역사', '유적', '유물', '고적', 'history', 'heritage', '역사관'],
    '기술': ['기술', '테크', 'IT', '과학', '로봇', 'tech', 'science', '혁신'],
    '패션': ['패션', '의류', '디자인', '스타일', 'fashion', 'style', '옷'],
    '여행': ['여행', '관광', '투어', 'travel', 'tour', 'trip', '탐방']
  };
  
  const searchText = (eventTitle + ' ' + eventDescription).toLowerCase();
  
  return userInterests.some(interest => {
    const keywords = interestKeywords[interest] || [interest];
    return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  });
}

// -------------------- 상태 --------------------
// 상세 필터 상태
const filterState = {
  startDate: null,   // '2025-04-01' 같은 문자열 또는 null
  endDate: null,
  region: '',        // '', 'daejeon' | 'seoul' | 'busan' | 'gyeonggi'
  price: ''          // '', 'free' | 'paid'
};

let currentCategory = 'all';
let currentSearchTerm = '';

// -------------------- 날짜/지역/가격 관련 유틸 --------------------

// 카드 날짜 텍스트 → Date 범위
function parseCardDateRange(koreanDateText) {
  if (!koreanDateText) return null;
  const cleaned = koreanDateText.replace(/\s/g, '');
  const range = cleaned.split('~');

  const toDate = (s, yearHint) => {
    // "2021.10.2" / "2021.4.2" / "4.2" 등
    const m = s.match(/(?:(\d{4})\.)?(\d{1,2})\.(\d{1,2})/);
    if (!m) return null;
    const y = m[1] ? Number(m[1]) : (yearHint || new Date().getFullYear());
    const mm = Number(m[2]) - 1;
    const dd = Number(m[3]);
    return new Date(y, mm, dd);
  };

  if (range.length === 1) {
    const d = toDate(range[0]);
    return d ? { start: d, end: d } : null;
  } else {
    const first = toDate(range[0]);
    const second = toDate(range[1], first ? first.getFullYear() : undefined);
    if (!first || !second) return null;
    return { start: first, end: second };
  }
}

// "부산광역시" / "부산" / "busan" → "부산" / "busan" 처럼 정규화
function normalizeRegionName(str) {
  if (!str) return '';
  return str
    .toString()
    .replace(/\s/g, '')             // 공백 제거
    .replace(/광역시|특별시|도/g, '') // 행정구역 꼬리표 제거
    .toLowerCase();
}

// 카드의 지역(locationText)이 선택한 region과 매칭되는지
function matchRegion(locationText, regionValue) {
  if (!regionValue) return true;

  const locNorm = normalizeRegionName(locationText || '');
  const selNorm = normalizeRegionName(regionValue || '');

  if (!selNorm) return true;

  return locNorm.includes(selNorm);
}

// 카드의 가격 텍스트가 무료/유료와 맞는지
function matchPrice(priceText, priceValue) {
  if (!priceValue) return true;
  const t = (priceText || '').replace(/\s/g, '');
  if (priceValue === 'free') return /무료/.test(t);
  if (priceValue === 'paid') return !/무료/.test(t);
  return true;
}

// 날짜 교집합 판단: 카드 기간과 선택 범위가 겹치면 true
function dateRangesIntersect(cardRange, startStr, endStr) {
  if (!cardRange) return true;                // 카드에 날짜가 없으면 통과
  if (!startStr && !endStr) return true;      // 상세 날짜 미선택이면 통과

  const selStart = startStr ? new Date(startStr) : null;
  const selEnd   = endStr ? new Date(endStr) : null;

  const cStart = cardRange.start;
  const cEnd   = cardRange.end;

  if (selStart && selEnd) {
    return cStart <= selEnd && cEnd >= selStart;
  }
  if (selStart && !selEnd) return cEnd >= selStart;
  if (!selStart && selEnd) return cStart <= selEnd;

  return true;
}

// -------------------- 알림/애니메이션 --------------------
function showNotification(message) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,.85); color: #fff; padding: 16px 32px; border-radius: 50px;
    font-size: 15px; font-weight: 500; z-index: 10000; animation: slideUp .3s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,.3); backdrop-filter: blur(10px);
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideDown .3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2600);
}

// 애니메이션 주입(중복 방지)
(() => {
  if (document.getElementById('event-list-anim-style')) return;
  const style = document.createElement('style');
  style.id = 'event-list-anim-style';
  style.textContent = `
    @keyframes slideUp { from {opacity:0; transform:translate(-50%,20px)} to {opacity:1; transform:translate(-50%,0)} }
    @keyframes slideDown { from {opacity:1; transform:translate(-50%,0)} to {opacity:0; transform:translate(-50%,20px)} }
  `;
  document.head.appendChild(style);
})();

// -------------------- 네비 / 공통 --------------------
window.goToNotifications = function () {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    alert('로그인이 필요한 서비스입니다.');
    window.location.href = 'login.html?next=notification.html';
    return;
  }

  if (!/notification\.html$/.test(location.pathname)) {
    window.location.href = 'notification.html';
  }
};

const createMobileMenu = () => {
  const nav = document.querySelector('.nav');
  const headerActions = document.querySelector('.header-actions');
  if (window.innerWidth <= 768) {
    nav.style.display = 'none';
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
    document.querySelector('.mobile-menu-btn')?.remove();
  }
};

window.addEventListener('resize', createMobileMenu);

// -------------------- 카드 메타 재구성 --------------------
// [수정] 기존 링크에서 ID를 추출하여 사용
function rebuildCardsFromDOM() {
  const cardElements = Array.from(document.querySelectorAll('.event-card'));

  cards = cardElements.map((card, idx) => {
    const title = card.querySelector('.card-title')?.textContent?.trim() || '';
    const badgeText = card.querySelector('.card-badge')?.textContent?.trim() || '';
    const infoSpans = card.querySelectorAll('.card-info .info-item span:nth-child(2)');
    const dateText = infoSpans[0]?.textContent?.trim() || '';
    const locationText = infoSpans[1]?.textContent?.trim() || '';
    const priceText = infoSpans[2]?.textContent?.trim() || '';
    const linkEl = card.querySelector('.card-link');
    const regionCode = card.dataset.region || '';

    // 카테고리 텍스트 → 키 매핑
    const badgeToKey = (t) => {
      const n = t.replace(/\s/g, '');
      if (/문화|공연/i.test(n)) return 'culture';
      if (/음악/i.test(n)) return 'music';
      if (/스포츠/i.test(n)) return 'sports';
      if (/푸드|야시장/i.test(n)) return 'food';
      if (/전시/i.test(n)) return 'exhibition';
      if (/축제/i.test(n)) return 'festival';
      if (/체험/i.test(n)) return 'experience';
      return 'etc';
    };

    let id = String(idx + 1); // 기본값
    if (linkEl && linkEl.href) {
      const match = linkEl.href.match(/[?&]id=([^&]+)/);
      if (match) {
        id = match[1]; // 기존 ID 유지 (예: 'daejeon-1', 'busan-2')
      }
    }

    return {
      id,
      el: card,
      regionCode,
      title,
      categoryKey: badgeToKey(badgeText || '축제'),
      categoryLabel: badgeText || '축제',
      dateText,
      locationText,
      priceText
    };
  });
}

// -------------------- 북마크 / 카드 호버 --------------------
function attachBookmarkHandlers() {
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle('active');
      const cardTitle = btn.closest('.event-card')?.querySelector('.card-title')?.textContent || '이벤트';
      if (btn.classList.contains('active')) {
        btn.textContent = '♥';
        showNotification(`"${cardTitle}"을(를) 찜했습니다!`);
      } else {
        btn.textContent = '♡';
        showNotification(`"${cardTitle}"을(를) 찜 해제했습니다.`);
      }
    });
  });
}

function attachCardHoverEffects() {
  document.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px)';
      card.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });
}

// -------------------- 필터링 --------------------
function applyFilters(resetPage = false) {
  const { startDate, endDate, region, price } = filterState;

  // 검색/필터가 바뀌면 1페이지부터 다시
  if (resetPage) {
    currentPage = 1;
  }

  const filteredIndices = [];

  // --- 1) 필터링 (카테고리 + 검색어 + 날짜 + 지역 + 가격) ---
  cards.forEach((c, idx) => {
    let show = true;

    // 1) 카테고리
    if (currentCategory === 'my-interests') {
      // 내 취향 필터: 관심사 매칭 확인
      // 카드의 실제 내용만 가져오기 (카테고리 라벨 제외)
      const titleText = c.title || '';
      const locationText = c.locationText || '';
      const dateText = c.dateText || '';
      
      // categoryLabel은 제외! (왼쪽 상단의 "축제" 라벨)
      const searchContent = `${titleText} ${locationText} ${dateText}`;
      
      const matched = matchesInterests(titleText, searchContent);
      
      // 디버깅용 로그 (처음 5개만)
      if (idx < 5) {
        console.log(`[${idx}] ${titleText}:`, matched ? '✅매칭' : '❌제외', 
                    `| 관심사: [${userInterests.join(', ')}]`);
      }
      
      if (!matched) {
        show = false;
      }
    } else if (currentCategory !== 'all' && c.categoryKey !== currentCategory) {
      show = false;
    }

    // 2) 검색어 (제목/카테고리/장소/가격/날짜 통합 검색)
    if (show && currentSearchTerm) {
      const term = currentSearchTerm.toLowerCase();
      const haystack = [
        c.title || '',
        c.categoryLabel || '',
        c.locationText || '',
        c.priceText || '',
        c.dateText || ''
      ].join(' ').toLowerCase();

      if (!haystack.includes(term)) {
        show = false;
      }
    }

    // 3) 날짜: 내가 고른 범위와 하루라도 겹치는지
    if (show && (startDate || endDate)) {
      const range = parseCardDateRange(c.dateText);
      if (!dateRangesIntersect(range, startDate, endDate)) {
        show = false;
      }
    }

    // 4) 지역
    if (show && region) {
      if (!matchRegion(c.locationText, region)) {
        show = false;
      }
    }

    // 5) 가격
    if (show && price) {
      if (!matchPrice(c.priceText, price)) {
        show = false;
      }
    }

    if (show) {
      filteredIndices.push(idx);
    }
  });

  // 필터 결과 저장
  lastFilteredIndices = filteredIndices;
  const totalVisible = filteredIndices.length;

  if (resultCountStrong) {
    resultCountStrong.textContent = String(totalVisible);
  }

  // --- 2) 페이지 계산 ---
  const totalPages = Math.max(1, Math.ceil(totalVisible / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;

  // 일단 전체 카드 숨기고
  cards.forEach((c) => {
    if (c.el) c.el.style.display = 'none';
  });

  // 현재 페이지에 해당하는 카드만 보여주기
  lastFilteredIndices.forEach((cardIdx, pos) => {
    if (pos >= startIdx && pos < endIdx) {
      const card = cards[cardIdx];
      if (card && card.el) {
        card.el.style.display = 'block';
      }
    }
  });

  // 페이지 버튼 다시 그리기
  renderPagination(totalPages);
}

// -------------------- 카테고리 필터 --------------------
filterBtns.forEach((btn) => {
  btn.addEventListener('click', async () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    currentCategory = btn.getAttribute('data-category') || 'all';
    
    // 내 취향 필터 선택 시 관심사 다시 로드
    if (currentCategory === 'my-interests') {
      await loadUserInterests();
      console.log('내 취향 필터: 관심사 새로고침', userInterests);
    }
    
    applyFilters(true); // 1페이지부터 다시

    const categoryName = btn.textContent.trim();
    showNotification(`"${categoryName}" 카테고리가 선택되었습니다.`);
  });
});

// -------------------- 검색 --------------------
searchBtn.addEventListener('click', () => {
  currentSearchTerm = searchInput.value.trim();
  applyFilters(true);
  if (currentSearchTerm) {
    showNotification(`"${currentSearchTerm}" 검색 결과를 표시합니다.`);
  }
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// -------------------- 상세 필터 --------------------
detailFilterBtn.addEventListener('click', () => {
  const isVisible = detailFilterPanel.style.display === 'block';
  detailFilterPanel.style.display = isVisible ? 'none' : 'block';
});

resetFilterBtn.addEventListener('click', () => {
  filterState.startDate = null;
  filterState.endDate = null;
  filterState.region = '';
  filterState.price = '';

  document.querySelectorAll('.date-input').forEach((inp) => (inp.value = ''));
  document.querySelector('.region-select').value = '';
  document.querySelector('.price-select').value = '';

  applyFilters(true);
  showNotification('상세 필터가 초기화되었습니다.');
});

applyFilterBtn.addEventListener('click', () => {
  const [startDateInput, endDateInput] = document.querySelectorAll('.date-input');
  const regionSelect = document.querySelector('.region-select');
  const priceSelect = document.querySelector('.price-select');

  filterState.startDate = startDateInput.value || null;
  filterState.endDate = endDateInput.value || null;
  filterState.region = regionSelect.value || '';
  filterState.price = priceSelect.value || '';

  applyFilters(true);
  detailFilterPanel.style.display = 'none';
  showNotification('상세 필터가 적용되었습니다.');
});

// -------------------- 보기 모드(시연) --------------------
viewBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    viewBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const viewMode = btn.getAttribute('data-view');
    if (viewMode === 'list') {
      eventGrid.style.gridTemplateColumns = '1fr';
      showNotification('리스트 뷰로 전환되었습니다.');
    } else {
      eventGrid.style.gridTemplateColumns = '';
      showNotification('그리드 뷰로 전환되었습니다.');
    }
  });
});

// -------------------- 정렬(시연) --------------------
sortSelect.addEventListener('change', (e) => {
  const sortType = e.target.value;
  showNotification(`${e.target.options[e.target.selectedIndex].text}(으)로 정렬됩니다`);
  console.log('정렬(시연):', sortType);
});

// -------------------- 실제 페이지네이션 --------------------
function goToPage(page) {
  currentPage = page;
  applyFilters(); // resetPage=false, 현재 페이지 유지
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPagination(totalPages) {
  if (!paginationContainer) return;

  paginationContainer.innerHTML = '';

  // 공통 버튼 생성 함수
  const createBtn = (label, page, options = {}) => {
    const btn = document.createElement('button');
    btn.className = 'page-btn';
    btn.textContent = label;

    if (options.disabled) {
      btn.disabled = true;
    }
    if (options.active) {
      btn.classList.add('active');
    }

    if (!options.disabled && page != null) {
      btn.addEventListener('click', () => {
        goToPage(page);
      });
    }

    paginationContainer.appendChild(btn);
  };

  // 이전 버튼
  createBtn('‹', currentPage - 1, {
    disabled: currentPage === 1
  });

  // 페이지 번호 버튼 (1 ~ totalPages)
  for (let p = 1; p <= totalPages; p++) {
    createBtn(String(p), p, {
      active: p === currentPage
    });
  }

  // 다음 버튼
  createBtn('›', currentPage + 1, {
    disabled: currentPage === totalPages
  });
}

// -------------------- 대전 축제 API 연동 --------------------
async function fetchDaejeonFestivals() {
  const url = new URL(DAEJEON_FESTIVAL_API_URL);
  url.searchParams.set('serviceKey', DAEJEON_API_KEY);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '50');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`대전 축제 API 호출 실패: HTTP ${res.status}`);
  }

  const json = await res.json();
  console.log('대전 축제 API 응답:', json);

  const header = json.response?.header;
  if (!header || (header.resultCode !== 'C00' && header.resultCode !== '00')) {
    throw new Error(header?.resultMsg || '대전 축제 API 응답 에러');
  }

  const items = json.response?.body?.items || [];

  return items.map((r, idx) => {
    // 제목과 topic에서 여러 카테고리 자동 분류
    const topic = (r.festvTpic || '').toLowerCase();
    const title = (r.festvNm || '').toLowerCase();
    const summary = (r.festvSumm || '').toLowerCase();
    const searchText = `${topic} ${title} ${summary}`;
    
    const categories = [];
    
    // 각 키워드 검색
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
    
    // 축제는 항상 포함
    if (!categories.includes('축제')) {
      categories.push('축제');
    }
    
    // 첫 번째 카테고리를 대표 라벨로
    const categoryLabel = categories[0] || '축제';
    
    return {
      id: 'daejeon-' + (idx + 1),
      regionCode: 'daejeon',
      title: r.festvNm || '제목 없음',
      dateText: r.festvPrid || '',
      locationText: r.festvPlcNm || r.festvAddr || '',
      summary: r.festvSumm || '',
      host: r.festvHostNm || '',
      topic: r.festvTpic || '',
      address: (r.festvAddr || '') + (r.festvDtlAddr ? ' ' + r.festvDtlAddr : ''),
      priceText: '무료',
      categoryKey: 'festival',
      categoryLabel: categoryLabel,
      categories: categories  // ← 전체 카테고리 배열 추가
    };
  });
}

// -------------------- 부산 축제 API 연동 --------------------
async function fetchBusanFestivals() {
  const url = new URL(BUSAN_FESTIVAL_API_URL);
  url.searchParams.set('serviceKey', BUSAN_API_KEY);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '50');
  url.searchParams.set('resultType', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`부산 축제 API 호출 실패: HTTP ${res.status}`);
  }

  const json = await res.json();
  console.log('부산 축제 API 응답:', json);

  let items = [];

  // case 1: 공통 구조
  if (Array.isArray(json.response?.body?.items)) {
    const header = json.response?.header;
    if (header && header.resultCode && header.resultCode !== '00' && header.resultCode !== 'C00') {
      throw new Error(header.resultMsg || '부산 축제 API 응답 에러');
    }
    items = json.response.body.items;
  }
  // case 2: getFestivalKr.item 구조
  else if (Array.isArray(json.getFestivalKr?.item)) {
    const header = json.getFestivalKr.header;
    if (header && header.resultCode && header.resultCode !== '00' && header.resultCode !== 'C00') {
      throw new Error(header.resultMsg || '부산 축제 API 응답 에러');
    }
    items = json.getFestivalKr.item;
  }
  // case 3: getFestivalKr.body.items 구조
  else if (Array.isArray(json.getFestivalKr?.body?.items)) {
    const header = json.getFestivalKr.header;
    if (header && header.resultCode && header.resultCode !== '00' && header.resultCode !== 'C00') {
      throw new Error(header.resultMsg || '부산 축제 API 응답 에러');
    }
    items = json.getFestivalKr.body.items;
  } else {
    console.warn('부산 축제 items 배열을 찾지 못했습니다:', json);
    return [];
  }

  return items.map((r, idx) => {
    // 제목과 topic에서 여러 카테고리 자동 분류
    const topic = (r.festvTpic || '').toLowerCase();
    const title = (r.festvNm || r.title || r.MAIN_TITLE || '').toLowerCase();
    const summary = (r.festvSumm || r.SUBTITLE || '').toLowerCase();
    const searchText = `${topic} ${title} ${summary}`;
    
    const categories = [];
    
    // 각 키워드 검색
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
    
    // 축제는 항상 포함
    if (!categories.includes('축제')) {
      categories.push('축제');
    }
    
    // 첫 번째 카테고리를 대표 라벨로
    const categoryLabel = categories[0] || '축제';
    
    return {
      id: 'busan-' + (idx + 1),
      regionCode: 'busan',
      title: r.festvNm || r.title || r.MAIN_TITLE || '제목 없음',
      dateText: r.festvPrid || r.period || r.USAGE_DAY_WEEK_AND_TIME || '',
      locationText: r.festvPlcNm || r.addr1 || r.ADDR1 || r.festvAddr || '',
      summary: r.festvSumm || r.SUBTITLE || '',
      host: r.festvHostNm || '',
      topic: r.festvTpic || '',
      address: (r.festvAddr || r.addr1 || r.ADDR1 || '') +
              (r.festvDtlAddr ? ' ' + r.festvDtlAddr : ''),
      priceText: '무료',
      categoryKey: 'festival',
      categoryLabel: categoryLabel,
      categories: categories  // ← 전체 카테고리 배열 추가
    };
  });
}

// -------------------- 카드 렌더링 --------------------
function renderEvents(events) {
  eventGrid.innerHTML = '';

  events.forEach(ev => {
    const article = document.createElement('article');
    article.className = 'event-card';

    // regionCode가 있으면 data-region 속성으로 저장 (지역 필터용)
    if (ev.regionCode) {
      article.dataset.region = ev.regionCode;
    }

    // 메인 페이지와 동일한 로직으로 지역별 대표 이미지 지정
    let imageSrc = 'asset/daejeon.png';
    if (ev.id && ev.id.startsWith('busan-')) {
      imageSrc = 'asset/busan.png';
    } else if (ev.id && ev.id.startsWith('daejeon-')) {
      imageSrc = 'asset/daejeon.png';
    }

    // 카테고리 배지 텍스트 생성
    const categories = ev.categories || [ev.categoryLabel];
    const badgeText = categories.length > 1 
      ? `${categories[0]} 외 ${categories.length - 1}개` 
      : categories[0];

    article.innerHTML = `
      <div class="card-image">
        <img src="${imageSrc}" alt="${ev.title}">
        <span class="card-badge category-badge" data-categories='${JSON.stringify(categories)}'>${badgeText}</span>
        <button class="bookmark-btn">♡</button>
      </div>
      <a href="event_detail.html?id=${ev.id}" class="card-link">
        <div class="card-content">
          <h3 class="card-title">🎪 ${ev.title}</h3>
          <div class="card-info">
            <div class="info-item">
              <span class="info-icon">📅</span>
              <span>${ev.dateText || '일정 미정'}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">📍</span>
              <span>${ev.locationText || ev.address || '축제 장소 미정'}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">💰</span>
              <span class="price-free">${ev.priceText}</span>
            </div>
          </div>
          <div class="card-footer">
            <div class="participants">
              <span class="participant-icon">👥</span>
              <span>100명 참여</span>
            </div>
            <div class="rating">
              <span>⭐ 4.8</span>
            </div>
          </div>
        </div>
      </a>
    `;

    eventGrid.appendChild(article);
  });
}

// -------------------- 날짜 정렬 유틸 --------------------
function sortByDate(events) {
  return events.sort((a, b) => {
    const dateA = parseCardDateRange(a.dateText);
    const dateB = parseCardDateRange(b.dateText);
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return dateB.start-dateA.start;
  });
}

// -------------------- 초기화 --------------------
async function initEventListPage() {
  createMobileMenu();

  // 사용자 관심사 로드
  await loadUserInterests();

  // URL 파라미터에서 검색/카테고리 적용
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search') || '';
  const category = urlParams.get('category') || 'all';

  if (searchQuery) {
    searchInput.value = searchQuery;
    currentSearchTerm = searchQuery;
  }
  currentCategory = category;

  const categoryBtn = document.querySelector(`[data-category="${currentCategory}"]`);
  if (categoryBtn) {
    filterBtns.forEach(b => b.classList.remove('active'));
    categoryBtn.classList.add('active');
  }

  // 대전 + 부산 축제 데이터 가져오기
  let combinedEvents = [];

  try {
    const daejeon = await fetchDaejeonFestivals();
    combinedEvents = combinedEvents.concat(daejeon);
  } catch (e) {
    console.error('대전 축제 API 오류:', e);
    showNotification('대전 축제 데이터를 불러오지 못했습니다.');
  }

  try {
    const busan = await fetchBusanFestivals();
    combinedEvents = combinedEvents.concat(busan);
  } catch (e) {
    console.error('부산 축제 API 오류:', e);
    showNotification('부산 축제 데이터를 불러오지 못했습니다.');
  }

  if (combinedEvents.length > 0) {
    const sortedEvents = sortByDate(combinedEvents);
    allFestivalEvents = combinedEvents;
    renderEvents(combinedEvents);
    showNotification('대전/부산 축제 데이터를 API에서 불러왔습니다.');
  } else {
    console.warn('API에서 받은 축제 데이터가 없습니다. 하드코딩 카드 유지.');
    // 실패하면 event_list.html 하드코딩 카드 사용
  }

  // 렌더링된 카드 기준으로 메타 재구성 + 핸들러 + 필터
  rebuildCardsFromDOM();
  attachBookmarkHandlers();
  attachCardHoverEffects();
  attachCategoryBadgeHandlers();  // ← 카테고리 배지 핸들러 추가
  applyFilters(true);
}

// -------------------- 카테고리 배지 클릭 핸들러 --------------------
function attachCategoryBadgeHandlers() {
  const badges = document.querySelectorAll('.category-badge');
  console.log('카테고리 배지 개수:', badges.length);
  
  badges.forEach((badge, idx) => {
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log(`배지 ${idx} 클릭됨`);
      
      const categoriesStr = badge.getAttribute('data-categories');
      console.log('카테고리 데이터:', categoriesStr);
      
      if (!categoriesStr) {
        console.warn('카테고리 데이터 없음!');
        return;
      }
      
      try {
        const categories = JSON.parse(categoriesStr);
        const eventTitle = badge.closest('.event-card').querySelector('.card-title').textContent.replace('🎪 ', '');
        console.log('파싱된 카테고리:', categories);
        console.log('이벤트 제목:', eventTitle);
        
        showCategoryModal(categories, eventTitle);
      } catch (error) {
        console.error('카테고리 파싱 오류:', error);
      }
    });
  });
}

// -------------------- 카테고리 모달 --------------------
function showCategoryModal(categories, eventTitle) {
  console.log('=== 모달 표시 ===');
  console.log('카테고리:', categories);
  console.log('제목:', eventTitle);
  
  // 기존 모달 제거
  const existingModal = document.querySelector('.category-modal');
  if (existingModal) existingModal.remove();
  
  // 카테고리 아이콘 매핑
  const categoryIcons = {
    '음악': '🎵',
    '미술': '🎨',
    '스포츠': '⚽',
    '푸드': '🍜',
    '공연': '🎭',
    '전시': '🖼️',
    '축제': '🎪',
    '체험': '✨',
    '교육': '📚',
    '문화': '🏛️',
    '역사': '📜',
    '기술': '💻',
    '패션': '👗',
    '여행': '✈️',
    '자연': '🌿'
  };
  
  const modal = document.createElement('div');
  modal.className = 'category-modal';
  modal.innerHTML = `
    <div class="category-modal-overlay"></div>
    <div class="category-modal-content">
      <div class="category-modal-header">
        <h3>📋 이벤트 카테고리</h3>
        <button class="category-modal-close">✕</button>
      </div>
      <div class="category-modal-body">
        <p class="category-event-title">${eventTitle}</p>
        <p class="category-description">이 이벤트는 다음 카테고리로 분류됩니다:</p>
        <div class="category-tags">
          ${categories.map(cat => `
            <span class="category-tag">
              <span class="category-icon">${categoryIcons[cat] || '🎪'}</span>
              <span class="category-name">${cat}</span>
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 애니메이션
  setTimeout(() => modal.classList.add('active'), 10);
  
  // 닫기 이벤트
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };
  
  modal.querySelector('.category-modal-close').addEventListener('click', closeModal);
  modal.querySelector('.category-modal-overlay').addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('이벤트 목록 페이지 로드 완료');
  initEventListPage();
});

console.log('Event List JavaScript 로드 완료 - 학번: 202300771');