// 학번: 202300771 이름: 박성준
// main_page.js - 메인 페이지 (최신 TourAPI 버전)

// ==============================
// Google Maps 변수
// ==============================
let map;
let markers = [];
let currentEvents = [];
let userLocation = null;
let currentRadius = 30; // 기본 반경 30km
let allEventsCache = []; // 전체 이벤트 캐시
let userMarker = null; // 현재 위치 마커
let infoWindow = null; // InfoWindow 객체

// ==============================
// 거리 계산 함수 (Haversine formula)
// ==============================
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // km 단위
}

// ==============================
// 사용자 위치 가져오기
// ==============================
function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation을 지원하지 않는 브라우저입니다.');
      resolve({ lat: 36.5, lng: 127.8 });
      return;
    }

    console.log('위치 권한 요청 중...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('✅ 사용자 위치 획득 성공:', location);
        showNotification('📍 현재 위치를 찾았습니다!');
        resolve(location);
      },
      (error) => {
        console.error('❌ 위치 정보 가져오기 실패:', error.message);
        console.log('기본 위치 사용: 대한민국 중심');
        showNotification('⚠️ 위치 권한이 없어 기본 위치를 사용합니다.');
        resolve({ lat: 36.5, lng: 127.8 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// ==============================
// 🔥 최신 TourAPI로 축제 데이터 가져오기
// ==============================

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
  url.searchParams.set('areaCode', '3'); // 대전
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
  url.searchParams.set('areaCode', '6'); // 부산
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
  url.searchParams.set('areaCode', '1'); // 서울
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

// ==============================
// 데이터 정규화
// ==============================
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
    return '일정 미정';
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
      locationText: f.addr1 || f.addr2 || '장소 미정',
      address: (f.addr1 || '') + (f.addr2 ? ' ' + f.addr2 : ''),
      priceText: '무료',
      categoryLabel,
      categories,
      imageUrl,
      // 🔥 좌표 정보 (mapy=위도, mapx=경도)
      lat: parseFloat(f.mapy) || null,
      lng: parseFloat(f.mapx) || null
    };
  }).filter(event => event.lat && event.lng); // 좌표 있는 것만 필터링
}

// ==============================
// Google Maps 초기화
// ==============================
async function initMap() {
  console.log('Google Maps 초기화 시작');

  // 사용자 위치 가져오기
  userLocation = await getUserLocation();
  console.log('사용자 위치:', userLocation);

  // 지도 생성
  map = new google.maps.Map(document.getElementById('map'), {
    center: userLocation,
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true
  });

  console.log('지도 생성 완료');

  // 🔥 InfoWindow 생성
  infoWindow = new google.maps.InfoWindow();

  // 🔥 현재 위치 마커 추가
  userMarker = new google.maps.Marker({
    position: userLocation,
    map: map,
    title: '현재 위치',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3
    },
    zIndex: 1000
  });

  // 현재 위치 마커 클릭 시
  userMarker.addListener('click', () => {
    infoWindow.setContent(`
      <div style="padding: 10px; font-family: sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1a73e8;">📍 현재 위치</h3>
        <p style="margin: 0; font-size: 14px; color: #5f6368;">여기에 계십니다</p>
      </div>
    `);
    infoWindow.open(map, userMarker);
  });

  // 이벤트 데이터 로드
  await loadAllEvents();

  // 반경 변경 이벤트
  document.getElementById('radiusSelect').addEventListener('change', (e) => {
    currentRadius = parseInt(e.target.value);
    console.log('반경 변경:', currentRadius, 'km');
    filterAndDisplayEvents();
  });

  // 슬라이더 토글
  document.getElementById('toggleSliderBtn').addEventListener('click', toggleSlider);
}

window.initMap = initMap;

// ==============================
// 모든 이벤트 로드
// ==============================
async function loadAllEvents() {
  try {
    console.log('이벤트 데이터 로딩 시작...');

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

    allEventsCache = [...daejeon, ...busan, ...seoul];
    console.log('전체 이벤트 로드 완료:', allEventsCache.length);

    filterAndDisplayEvents();

  } catch (error) {
    console.error('이벤트 로드 오류:', error);
    showNotification('❌ 이벤트 데이터를 불러오는 중 오류가 발생했습니다.');
  }
}

// ==============================
// 필터링 및 표시
// ==============================
function filterAndDisplayEvents() {
  if (!userLocation) {
    console.warn('사용자 위치 정보가 없습니다.');
    return;
  }

  console.log(`반경 ${currentRadius}km 내 이벤트 필터링...`);

  // 반경 내 이벤트 필터링
  currentEvents = allEventsCache.filter(event => {
    if (!event.lat || !event.lng) return false;
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      event.lat,
      event.lng
    );
    
    event.distance = distance; // 거리 정보 저장
    return distance <= currentRadius;
  });

  // 거리순 정렬
  currentEvents.sort((a, b) => a.distance - b.distance);

  console.log('필터링된 이벤트:', currentEvents.length);

  // 마커 및 카드 표시
  displayMarkers();
  displayEventCards();

  if (currentEvents.length === 0) {
    showNotification(`⚠️ 반경 ${currentRadius}km 내에 이벤트가 없습니다.`);
  } else {
    showNotification(`📍 반경 ${currentRadius}km 내 ${currentEvents.length}개 이벤트 발견!`);
  }
}

// ==============================
// 마커 표시
// ==============================
function displayMarkers() {
  // 기존 마커 제거
  markers.forEach(marker => marker.setMap(null));
  markers = [];

  // 새 마커 생성
  currentEvents.forEach(event => {
    // 🔥 기본 구글맵 마커 사용
    const marker = new google.maps.Marker({
      position: { lat: event.lat, lng: event.lng },
      map: map,
      title: event.title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#667eea',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    // 🔥 마커 클릭 시 InfoWindow 표시
    marker.addListener('click', () => {
      const infoContent = `
        <div style="padding: 12px; max-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="margin-bottom: 10px;">
            <span style="display: inline-block; padding: 4px 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 11px; font-weight: 700; border-radius: 6px;">
              ${event.categoryLabel}
            </span>
            <span style="display: inline-block; margin-left: 8px; padding: 4px 10px; background: #f0f4ff; color: #667eea; font-size: 11px; font-weight: 700; border-radius: 6px;">
              ${event.distance.toFixed(1)}km
            </span>
          </div>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #1a1a2e; line-height: 1.4;">
            ${event.title}
          </h3>
          <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
            📅 ${event.dateText}
          </div>
          <div style="margin-bottom: 12px; font-size: 13px; color: #64748b;">
            📍 ${event.locationText}
          </div>
          <button onclick="goToEventDetail('${event.id}')" style="width: 100%; padding: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
            상세보기
          </button>
        </div>
      `;
      
      infoWindow.setContent(infoContent);
      infoWindow.open(map, marker);
      
      // 지도 중심 이동
      map.panTo(marker.getPosition());
    });

    markers.push(marker);
  });

  console.log('마커 표시 완료:', markers.length);
}

// ==============================
// 🔥 이벤트 카드 표시 (개선된 디자인)
// ==============================
function displayEventCards() {
  const container = document.getElementById('event-cards');
  
  if (currentEvents.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #999;">
        <p style="font-size: 48px; margin-bottom: 10px;">🔍</p>
        <p style="font-size: 16px;">주변에 이벤트가 없습니다</p>
        <p style="font-size: 14px; margin-top: 5px;">반경을 늘려보세요</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentEvents.map(event => `
    <div class="event-card" onclick="goToEventDetail('${event.id}')">
      <div class="event-card-image">
        ${event.imageUrl 
          ? `<img src="${event.imageUrl}" alt="${event.title}" 
                 onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:48px;\\'>🎪</div>';">` 
          : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:48px;">🎪</div>`
        }
        <span class="event-card-badge">${event.categoryLabel}</span>
        <span class="event-card-distance">${event.distance.toFixed(1)}km</span>
      </div>
      <div class="event-card-content">
        <h4 class="event-card-title">${event.title}</h4>
        <div class="event-card-info">
          <span class="event-card-date">📅 ${event.dateText}</span>
          <span class="event-card-location">📍 ${event.locationText}</span>
        </div>
      </div>
    </div>
  `).join('');

  console.log('이벤트 카드 표시 완료:', currentEvents.length);
}

// ==============================
// 유틸리티 함수
// ==============================

function goToEventDetail(eventId) {
  window.location.href = `event_detail.html?id=${encodeURIComponent(eventId)}`;
}

function scrollToEventCard(eventId) {
  const card = Array.from(document.querySelectorAll('.event-card'))
    .find(card => card.onclick.toString().includes(eventId));
  
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    card.style.animation = 'highlight 0.5s ease';
  }
}

function moveToCurrentLocation() {
  if (map && userLocation) {
    map.setCenter(userLocation);
    map.setZoom(13);
    showNotification('📍 현재 위치로 이동했습니다');
  }
}

function toggleSlider() {
  const slider = document.querySelector('.event-slider');
  const btn = document.getElementById('toggleSliderBtn');
  const cards = document.getElementById('event-cards');
  
  if (slider.classList.contains('collapsed')) {
    slider.classList.remove('collapsed');
    cards.style.display = 'flex';
    btn.textContent = '↓';
  } else {
    slider.classList.add('collapsed');
    cards.style.display = 'none';
    btn.textContent = '↑';
  }
}

function handleSearch(event) {
  if (event.key === 'Enter') {
    const query = event.target.value.trim();
    if (query) {
      window.location.href = `event_list.html?search=${encodeURIComponent(query)}`;
    }
  }
}

// 알림 페이지로 이동
function goToNotifications() {
  // 이미 알림 페이지면 굳이 이동 안 해도 되지만,
  // 새로고침 느낌으로 그냥 보내도 문제 없음
  window.location.href = 'notification.html';
}


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

// 애니메이션 키프레임
(function injectStyles() {
  if (document.getElementById('main-page-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'main-page-styles';
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translate(-50%, 20px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes slideDown {
      from { opacity: 1; transform: translate(-50%, 0); }
      to { opacity: 0; transform: translate(-50%, 20px); }
    }
    @keyframes highlight {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3); }
    }
  `;
  document.head.appendChild(style);
})();

console.log('Main Page JavaScript 로드 완료 - 학번: 202300771');