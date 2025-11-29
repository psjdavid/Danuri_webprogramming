// 학번: 202300771 이름: 박성준
// event_detail.js — API 데이터 연동 및 상세 페이지 동적 렌더링 + Google Maps

// -------------------- DOM --------------------
const detailTitle = document.getElementById('detail-title');
const detailCategory = document.getElementById('detail-category');
const detailDate = document.getElementById('detail-date');
const detailTime = document.getElementById('detail-time');
const detailLocationMain = document.getElementById('detail-location-main');
const detailAddress = document.getElementById('detail-address');
const likeBtn = document.getElementById('likeBtn');
const shareBtn = document.getElementById('shareBtn');
const tabMenuItems = document.querySelectorAll('.tab-menu .tab-item');
const tabContents = document.querySelectorAll('.tab-content section');
const chatEnterBtn = document.getElementById('chatEnterBtn');

// -------------------- Google Maps 변수 --------------------
let detailMap = null;
let detailMarker = null;
let currentEventData = null; // 현재 표시 중인 이벤트 데이터

// -------------------- 대전 / 부산 축제 API 설정 --------------------
const DAEJEON_FESTIVAL_API_URL =
  'https://apis.data.go.kr/6300000/openapi2022/festv/getfestv';
const DAEJEON_API_KEY =
  '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6';
const BUSAN_FESTIVAL_API_URL =
  'https://apis.data.go.kr/6260000/FestivalService/getFestivalKr';
const BUSAN_API_KEY =
  '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6';

// -------------------- likedEvents 유틸 --------------------
function getLikedEvents() {
  try {
    return JSON.parse(localStorage.getItem('likedEvents') || '{}');
  } catch (e) {
    console.error('likedEvents 파싱 오류:', e);
    return {};
  }
}

function saveLikedEvents(liked) {
  localStorage.setItem('likedEvents', JSON.stringify(liked));
}

// 현재 currentEventData 기준으로 하트 UI 동기화
function syncLikeButtonState() {
  if (!likeBtn || !currentEventData) return;

  const likedEvents = getLikedEvents();
  const flagKey = `event_like_${currentEventData.id}`;
  const isLiked =
    !!likedEvents[currentEventData.id] ||
    localStorage.getItem(flagKey) === '1';

  if (isLiked) {
    likeBtn.classList.add('active');
    likeBtn.textContent = '♥';
  } else {
    likeBtn.classList.remove('active');
    likeBtn.textContent = '♡';
  }
}

// -------------------- API 데이터 파싱 함수 --------------------
async function fetchDaejeonFestivals() {
  const url = new URL(DAEJEON_FESTIVAL_API_URL);
  url.searchParams.set('serviceKey', DAEJEON_API_KEY);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '50');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`대전 축제 API 호출 실패: HTTP ${res.status}`);

  const json = await res.json();
  const header = json.response?.header;
  if (!header || (header.resultCode !== 'C00' && header.resultCode !== '00')) {
    throw new Error(header?.resultMsg || '대전 축제 API 응답 에러');
  }

  const items = json.response?.body?.items || [];

  return items.map((r, idx) => ({
    id: 'daejeon-' + (idx + 1),
    title: r.festvNm || '제목 없음',
    dateText: r.festvPrid || '일정 미정',
    timeText: r.USE_TIME || '상시',
    locationText: r.festvPlcNm || r.festvAddr || '장소 미정',
    address: (r.festvAddr || '') + (r.festvDtlAddr ? ' ' + r.festvDtlAddr : ''),
    priceText: '무료',
    summary: r.festvSumm || '상세 설명 없음',
    host: r.festvHostNm || '주최자 미정',
    topic: r.festvTpic || '',
    categoryKey: 'festival',
    categoryLabel: '축제',
    lat: parseFloat(r.festvLa || r.latitude || r.LAT || r.lat) || null,
    lng: parseFloat(r.festvLo || r.longitude || r.LNG || r.lng || r.lon) || null,
    rating: parseFloat((Math.random() * 0.5 + 4.0).toFixed(1)),
    participants: Math.floor(Math.random() * 5000 + 1000),
  }));
}

async function fetchBusanFestivals() {
  const url = new URL(BUSAN_FESTIVAL_API_URL);
  url.searchParams.set('serviceKey', BUSAN_API_KEY);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '50');
  url.searchParams.set('resultType', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`부산 축제 API 호출 실패: HTTP ${res.status}`);

  const json = await res.json();
  let items = [];

  if (Array.isArray(json.response?.body?.items)) {
    items = json.response.body.items;
  } else if (Array.isArray(json.getFestivalKr?.item)) {
    items = json.getFestivalKr.item;
  } else if (Array.isArray(json.getFestivalKr?.body?.items)) {
    items = json.getFestivalKr.body.items;
  } else {
    return [];
  }

  return items.map((r, idx) => ({
    id: 'busan-' + (idx + 1),
    title: r.festvNm || r.title || r.MAIN_TITLE || '제목 없음',
    dateText: r.festvPrid || r.period || r.USAGE_DAY_WEEK_AND_TIME || '일정 미정',
    timeText: r.USAGE_DAY_WEEK_AND_TIME || '상시',
    locationText: r.festvPlcNm || r.addr1 || r.ADDR1 || r.festvAddr || '장소 미정',
    address:
      (r.festvAddr || r.addr1 || r.ADDR1 || '') +
      (r.festvDtlAddr ? ' ' + r.festvDtlAddr : ''),
    priceText: '무료',
    summary: r.festvSumm || r.SUBTITLE || '상세 설명 없음',
    host: r.festvHostNm || '주최자 미정',
    topic: r.festvTpic || '',
    categoryKey: 'festival',
    categoryLabel: '축제',
    lat: parseFloat(r.LAT || r.lat || r.latitude || r.festvLa) || null,
    lng: parseFloat(r.LNG || r.lng || r.lon || r.longitude || r.festvLo) || null,
    rating: parseFloat((Math.random() * 0.5 + 4.3).toFixed(1)),
    participants: Math.floor(Math.random() * 10000 + 5000),
  }));
}

// -------------------- Google Maps 초기화 --------------------
function initDetailMap() {
  console.log('Google Maps 초기화 시작');
  
  const defaultCenter = { lat: 36.5, lng: 127.8 };
  
  detailMap = new google.maps.Map(document.getElementById('detailMap'), {
    center: defaultCenter,
    zoom: 15,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
  });
  
  console.log('Google Maps 초기화 완료, 이벤트 데이터 로드 시작');
  initDetailPage();
}

// Google Maps 콜백 함수로 등록
window.initDetailMap = initDetailMap;

// -------------------- 지도에 마커 표시 --------------------
function displayMapMarker(eventData) {
  if (!detailMap) {
    console.warn('지도가 아직 초기화되지 않았습니다.');
    return;
  }
  
  // ... (이 부분은 기존 코드 그대로) ...
  // 생략 없이 그냥 네가 쓰던 코드 그대로 두면 됨
}

// (Geocoding / tryFallbackGeocoding / createMarkerAtPosition 등은 그대로)

// -------------------- DOM 조작 함수 --------------------
function updateDOM(eventData) {
  currentEventData = eventData;
  
  detailTitle.textContent = eventData.title;
  detailCategory.textContent = eventData.categoryLabel;
  detailDate.textContent = eventData.dateText;
  detailTime.textContent = eventData.timeText || '시간 정보 없음';
  detailLocationMain.textContent = eventData.locationText;
  
  const descriptionElement = document.querySelector('.description');
  descriptionElement.innerHTML = `
    ${eventData.summary}<br><br>
    <strong>주최:</strong> ${eventData.host}<br>
    <strong>장소:</strong> ${eventData.locationText}
  `;
  
  document.querySelector('.price-info > div').textContent = eventData.priceText;
  detailAddress.textContent = eventData.address || eventData.locationText;
  
  document.querySelector('.rating-stars').textContent = `⭐ ${eventData.rating.toFixed(1)}`;
  document.querySelector('.tab-item:nth-child(3)').textContent =
    `참석자 (${eventData.participants.toLocaleString()}명)`;
  document.querySelector('.attendees > span').textContent =
    `외 ${(eventData.participants - 5).toLocaleString()}명`;
  
  if (detailMap) {
    displayMapMarker(eventData);
  } else {
    setTimeout(() => {
      if (detailMap) displayMapMarker(eventData);
    }, 1000);
  }

  // 🔥 현재 이벤트 기준으로 하트 상태 동기화
  syncLikeButtonState();
}

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

// 애니메이션 주입 (기존 그대로)

// -------------------- 이벤트 핸들러 --------------------

// 👍 찜(관심) 버튼 로직: my_page의 likedEvents와 연동
likeBtn.addEventListener('click', () => {
  if (!currentEventData) {
    // 아직 데이터가 안 불러와졌으면 UI만 토글
    likeBtn.classList.toggle('active');
    likeBtn.textContent = likeBtn.classList.contains('active') ? '♥' : '♡';
    return;
  }

  const likedEvents = getLikedEvents();
  const id = currentEventData.id;
  const flagKey = `event_like_${id}`;

  const willLike = !likeBtn.classList.contains('active');

  if (willLike) {
    likeBtn.classList.add('active');
    likeBtn.textContent = '♥';

    likedEvents[id] = {
      id,
      title: currentEventData.title,
      date: currentEventData.dateText,
      location: currentEventData.locationText,
      // imageGradient는 my_page에서 없으면 자동으로 랜덤 색 지정
    };
    saveLikedEvents(likedEvents);
    localStorage.setItem(flagKey, '1');

    showNotification('이벤트를 찜했습니다!');
  } else {
    likeBtn.classList.remove('active');
    likeBtn.textContent = '♡';

    delete likedEvents[id];
    saveLikedEvents(likedEvents);
    localStorage.removeItem(flagKey);

    showNotification('찜 목록에서 제거되었습니다.');
  }
});

// 공유 버튼 (기존 그대로)
shareBtn.addEventListener('click', () => {
  if (navigator.share) {
    navigator.share({
      title: detailTitle.textContent,
      text: detailLocationMain.textContent,
      url: window.location.href,
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showNotification('링크가 복사되었습니다!');
  }
});

// 탭 메뉴 (기존 그대로)
tabMenuItems.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    tabMenuItems.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((c) => (c.style.display = 'none'));

    tab.classList.add('active');
    tabContents[index].style.display = 'block';
  });
});

// 🔔 채팅방 입장 버튼 → chat_page로 이동
if (chatEnterBtn) {
  chatEnterBtn.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || (currentEventData && currentEventData.id) || '';

    // 선택사항: 채팅 페이지에서 사용할 수 있도록 캐시 저장
    if (currentEventData && eventId) {
      const cache = JSON.parse(localStorage.getItem('chatEventCache') || '{}');
      cache[eventId] = currentEventData;
      localStorage.setItem('chatEventCache', JSON.stringify(cache));
    }

    window.location.href = `chat_page.html?id=${encodeURIComponent(eventId)}`;
  });
}

// -------------------- 초기화 --------------------
async function initDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  if (!eventId) {
    alert('⚠️ 이벤트 ID가 누락되었습니다. 목록 페이지로 돌아갑니다.');
    window.location.href = 'event_list.html';
    return;
  }

  console.log('검색 중인 이벤트 ID:', eventId);
  showNotification(`이벤트 ID: ${eventId} 검색 중...`);

  let daejeon = [];
  let busan = [];

  try {
    daejeon = await fetchDaejeonFestivals();
  } catch (e) {
    console.error('대전 축제 API 오류:', e);
    showNotification('대전 축제 데이터를 불러오지 못했습니다.');
  }

  try {
    busan = await fetchBusanFestivals();
  } catch (e) {
    console.error('부산 축제 API 오류:', e);
    showNotification('부산 축제 데이터를 불러오지 못했습니다.');
  }

  const allEvents = daejeon.concat(busan);
  const targetEvent = allEvents.find((event) => event.id === eventId);

  if (targetEvent) {
    updateDOM(targetEvent);
    showNotification('이벤트 상세 정보가 성공적으로 로드되었습니다.');
  } else {
    alert(`⚠️ 이벤트 ID: ${eventId}에 해당하는 정보를 찾을 수 없습니다.`);
    window.location.href = 'event_list.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - Google Maps 로드 대기 중...');
});

console.log('Event Detail JavaScript 로드 완료 - 학번: 202300771');
