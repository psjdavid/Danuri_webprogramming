// 학번: 202300771 이름: 박성준
// main_page.js - 메인 페이지 + 사용자 위치 기반 주변 이벤트

// ==============================
// Google Maps 변수
// ==============================
let map;
let markers = [];
let currentEvents = [];
let userLocation = null;
let currentRadius = 30; // 기본 반경 30km
let allEventsCache = []; // 전체 이벤트 캐시

// ==============================
// 대전 / 부산 축제 API 설정
// ==============================
const DAEJEON_FESTIVAL_API_URL = 'https://apis.data.go.kr/6300000/openapi2022/festv/getfestv';
const DAEJEON_API_KEY = '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6';
const BUSAN_FESTIVAL_API_URL = 'https://apis.data.go.kr/6260000/FestivalService/getFestivalKr';
const BUSAN_API_KEY = '577f809b4049e298c064b73a321c74531af6a1ed55a7d711069d8e6f143619a6';

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
      // 기본 위치: 대한민국 중심
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
        // 실패 시 대한민국 중심
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
// API 데이터 가져오기
// ==============================
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
    locationText: r.festvPlcNm || r.festvAddr || '장소 미정',
    address: (r.festvAddr || '') + (r.festvDtlAddr ? ' ' + r.festvDtlAddr : ''),
    summary: r.festvSumm || '상세 설명 없음',
    host: r.festvHostNm || '주최자 미정',
    priceText: '무료',
    categoryLabel: '축제',
    lat: parseFloat(r.festvLa || r.latitude || r.LAT) || null,
    lng: parseFloat(r.festvLo || r.longitude || r.LNG) || null,
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
    locationText: r.festvPlcNm || r.addr1 || r.ADDR1 || r.festvAddr || '장소 미정',
    address: (r.festvAddr || r.addr1 || r.ADDR1 || '') + (r.festvDtlAddr ? ' ' + r.festvDtlAddr : ''),
    summary: r.festvSumm || r.SUBTITLE || '상세 설명 없음',
    host: r.festvHostNm || '주최자 미정',
    priceText: '무료',
    categoryLabel: '축제',
    lat: parseFloat(r.LAT || r.lat || r.latitude) || null,
    lng: parseFloat(r.LNG || r.lng || r.longitude) || null,
  }));
}

// ==============================
// Geocoding으로 위경도 보완
// ==============================
async function geocodeEvent(event) {
  if (event.lat && event.lng) {
    return event;
  }

  if (!event.address && !event.locationText) {
    console.warn('주소 정보 없음:', event.title);
    return event;
  }

  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    const address = event.address || event.locationText;

    setTimeout(() => {
      geocoder.geocode({ 
        address: address,
        region: 'KR'
      }, (results, status) => {
        if (status === 'OK' && results[0]) {
          event.lat = results[0].geometry.location.lat();
          event.lng = results[0].geometry.location.lng();
          console.log('  ✅ Geocoding 성공:', event.title);
        } else {
          console.warn('  ❌ Geocoding 실패:', event.title);
        }
        resolve(event);
      });
    }, 200);
  });
}

// ==============================
// 주변 이벤트 필터링
// ==============================
async function getNearbyEvents(allEvents, userLat, userLng, maxDistance) {
  console.log('=== 주변 이벤트 필터링 시작 ===');
  console.log('사용자 위치:', userLat, userLng);
  console.log('최대 거리:', maxDistance, 'km');
  console.log('전체 이벤트 수:', allEvents.length);

  // 샘플 로그
  if (allEvents.length > 0) {
    console.log('첫 번째 이벤트 샘플:');
    const sample = allEvents[0];
    console.log('  제목:', sample.title);
    console.log('  위도:', sample.lat, '경도:', sample.lng);
    console.log('  주소:', sample.address || sample.locationText);
  }

  // Geocoding (최대 15개)
  const eventsWithCoords = [];
  let geocodedCount = 0;
  const MAX_GEOCODE = 15;

  for (const event of allEvents) {
    if (!event.lat || !event.lng) {
      if (geocodedCount < MAX_GEOCODE) {
        console.log(`Geocoding 시도 (${geocodedCount + 1}/${MAX_GEOCODE}):`, event.title);
        const geocoded = await geocodeEvent(event);
        eventsWithCoords.push(geocoded);
        if (geocoded.lat && geocoded.lng) geocodedCount++;
      } else {
        eventsWithCoords.push(event);
      }
    } else {
      eventsWithCoords.push(event);
    }
  }

  console.log('위경도 있는 이벤트 수:', eventsWithCoords.filter(e => e.lat && e.lng).length);

  // 거리 계산 및 필터링
  const nearby = eventsWithCoords
    .filter(ev => ev.lat && ev.lng)
    .map(ev => {
      const distance = calculateDistance(userLat, userLng, ev.lat, ev.lng);
      return { ...ev, distance };
    })
    .filter(ev => ev.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  console.log('✅ 주변 이벤트 수:', nearby.length);
  if (nearby.length > 0) {
    console.log('가장 가까운 이벤트:', nearby[0].title, `(${nearby[0].distance.toFixed(1)}km)`);
  }
  
  return nearby;
}

// ==============================
// Google Maps 초기화
// ==============================
async function initMap() {
  console.log('Google Maps 초기화 시작');

  // 사용자 위치 가져오기
  userLocation = await getUserLocation();
  console.log('사용자 위치 설정 완료:', userLocation);

  // 지도 생성
  map = new google.maps.Map(document.getElementById('map'), {
    center: userLocation,
    zoom: 12,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
  });

  // 사용자 위치 마커 (파란색)
  new google.maps.Marker({
    position: userLocation,
    map: map,
    title: '내 위치',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#FFF',
      strokeWeight: 2,
    }
  });

  // 이벤트 데이터 로드
  await loadEvents();
}

window.initMap = initMap;

// ==============================
// 이벤트 데이터 로드
// ==============================
async function loadEvents() {
  console.log('이벤트 데이터 로드 시작');
  
  let allEvents = [];

  try {
    const daejeon = await fetchDaejeonFestivals();
    allEvents = allEvents.concat(daejeon);
    console.log('대전 축제:', daejeon.length, '개');
  } catch (e) {
    console.error('대전 축제 API 오류:', e);
  }

  try {
    const busan = await fetchBusanFestivals();
    allEvents = allEvents.concat(busan);
    console.log('부산 축제:', busan.length, '개');
  } catch (e) {
    console.error('부산 축제 API 오류:', e);
  }

  console.log('전체 이벤트:', allEvents.length, '개');

  // 테스트 데이터 추가
  if (allEvents.length === 0) {
    console.warn('⚠️ API 실패, 테스트 데이터 사용');
    allEvents = [
      {
        id: 'test-1',
        title: '서울 벚꽃 축제',
        dateText: '2025.04.01 ~ 2025.04.10',
        locationText: '여의도 한강공원',
        address: '서울특별시 영등포구 여의동로',
        categoryLabel: '축제',
        lat: 37.5289,
        lng: 126.9366
      },
      {
        id: 'test-2',
        title: '대전 과학축제',
        dateText: '2025.05.01 ~ 2025.05.07',
        locationText: '대전 엑스포과학공원',
        address: '대전광역시 유성구 대덕대로',
        categoryLabel: '축제',
        lat: 36.3736,
        lng: 127.3840
      }
    ];
  }

  // 전체 데이터 캐싱
  allEventsCache = allEvents;

  // 필터링 및 렌더링
  await filterAndRenderEvents();
}

// ==============================
// 필터링 및 렌더링
// ==============================
async function filterAndRenderEvents() {
  console.log('=== 필터링 및 렌더링 시작 ===');
  console.log('사용자 위치:', userLocation);
  console.log('현재 반경:', currentRadius, 'km');
  console.log('캐시된 이벤트 수:', allEventsCache.length);

  if (!userLocation) {
    console.error('❌ 사용자 위치가 없습니다!');
    currentEvents = allEventsCache;
  } else if (allEventsCache.length > 0) {
    currentEvents = await getNearbyEvents(allEventsCache, userLocation.lat, userLocation.lng, currentRadius);
    console.log(`${currentRadius}km 이내 이벤트:`, currentEvents.length, '개');
  } else {
    console.warn('캐시된 이벤트가 없습니다.');
    currentEvents = [];
  }

  // 렌더링
  renderMarkers(currentEvents);
  renderEventCards(currentEvents);
}

// ==============================
// 지도 마커 렌더링
// ==============================
function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}

function renderMarkers(events) {
  if (!map) return;
  clearMarkers();

  events.forEach((ev) => {
    if (!ev.lat || !ev.lng) return;

    const marker = new google.maps.Marker({
      position: { lat: ev.lat, lng: ev.lng },
      map,
      title: ev.title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#FF6B6B',
        fillOpacity: 1,
        strokeColor: '#FFF',
        strokeWeight: 2,
      }
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; max-width: 200px;">
          <h3 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold;">${ev.title}</h3>
          <p style="margin: 0; font-size: 12px; color: #666;">📍 ${ev.locationText}</p>
          ${ev.distance ? `<p style="margin: 5px 0 0 0; font-size: 11px; color: #999;">🚶 ${ev.distance.toFixed(1)}km</p>` : ''}
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
      map.panTo(marker.getPosition());
    });

    marker.addListener('dblclick', () => {
      goToEventDetail(ev.id);
    });

    markers.push(marker);
  });

  console.log('마커', markers.length, '개 표시 완료');
}

// ==============================
// 이벤트 카드 렌더링
// ==============================
function renderEventCards(events) {
  const container = document.getElementById('event-cards');
  if (!container) return;

  container.innerHTML = '';

  if (!events.length) {
    container.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">주변에 이벤트가 없습니다.</p>';
    return;
  }

  events.slice(0, 10).forEach((ev) => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.cssText = 'cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;';

    const distanceText = ev.distance ? `🚶 ${ev.distance.toFixed(1)}km` : '';

    let imageSrc = 'asset/daejeon.png';
    if (ev.id && ev.id.startsWith('busan-')) {
      imageSrc = 'asset/busan.png';
    } else if (ev.id && ev.id.startsWith('daejeon-')) {
      imageSrc = 'asset/daejeon.png';
    }

    card.innerHTML = `
      <div class="event-image">
        <img src="${imageSrc}" alt="${ev.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
      </div>
      <div class="event-info">
        <div class="event-title" style="font-weight: bold; margin-bottom: 8px;">${ev.title}</div>
        <div class="event-details" style="font-size: 13px; color: #666;">
          ${ev.dateText ? `<div>📅 ${ev.dateText}</div>` : ''}
          ${ev.locationText ? `<div>📍 ${ev.locationText}</div>` : ''}
          ${distanceText ? `<div style="color: #4CAF50; font-weight: 500;">${distanceText}</div>` : ''}
        </div>
      </div>
    `;

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });

    card.addEventListener('click', () => {
      goToEventDetail(ev.id);
    });

    container.appendChild(card);
  });

  console.log('이벤트 카드', events.slice(0, 10).length, '개 렌더링 완료');
}

// ==============================
// 이벤트 상세 페이지로 이동
// ==============================
function goToEventDetail(eventId) {
  if (!eventId) return;
  console.log('이벤트 상세로 이동:', eventId);
  window.location.href = `event_detail.html?id=${eventId}`;
}

// ==============================
// 현재 위치로 이동
// ==============================
window.moveToCurrentLocation = function() {
  if (!map || !userLocation) return;
  map.panTo(userLocation);
  map.setZoom(14);
  showNotification('📍 현재 위치로 이동했습니다.');
};

// ==============================
// 검색 기능
// ==============================
window.handleSearch = function(event) {
  if (event.key === 'Enter') {
    const query = event.target.value.trim();
    if (query) {
      window.location.href = `event_list.html?search=${encodeURIComponent(query)}`;
    }
  }
};

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
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,.85); color: #fff; padding: 16px 32px; border-radius: 50px;
    font-size: 15px; font-weight: 500; z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,.3);
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2600);
}

// ==============================
// 알림 페이지 이동
// ==============================
window.goToNotifications = function() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    alert('로그인이 필요한 서비스입니다.');
    window.location.href = 'login.html?next=notification.html';
    return;
  }
  window.location.href = 'notification.html';
};

// ==============================
// 페이지 로드 시 실행
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Main Page DOMContentLoaded');
  
  // 반경 선택 이벤트
  const radiusSelect = document.getElementById('radiusSelect');
  if (radiusSelect) {
    radiusSelect.addEventListener('change', async (e) => {
      currentRadius = parseInt(e.target.value);
      console.log('반경 변경:', currentRadius, 'km');
      showNotification(`📍 반경 ${currentRadius}km로 변경되었습니다.`);
      await filterAndRenderEvents();
    });
  }
  
  // 슬라이더 토글 기능
  const toggleBtn = document.getElementById('toggleSliderBtn');
  const slider = document.querySelector('.event-slider');
  
  if (toggleBtn && slider) {
    toggleBtn.addEventListener('click', () => {
      slider.classList.toggle('collapsed');
      toggleBtn.textContent = slider.classList.contains('collapsed') ? '↑' : '↓';
    });
  }
});

console.log('Main Page JavaScript 로드 완료 - 학번: 202300771');