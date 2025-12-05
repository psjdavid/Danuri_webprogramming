// 학번: 202300771 이름: 박성준
// event_detail.js - 이벤트 상세 페이지 (완전판)

// ==================== DOM ====================
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
const currentLocationText = document.getElementById('current-location-text');
const btnUseCurrentLocation = document.getElementById('btnUseCurrentLocation');
const btnRouteTransit = document.getElementById('btnRouteTransit');
const btnRouteDriving = document.getElementById('btnRouteDriving');
const btnRouteWalking = document.getElementById('btnRouteWalking');
const btnOpenParking = document.getElementById('btnOpenParking');
const routeSummaryEl = document.getElementById('routeSummary');

// ==================== Google Maps 변수 ====================
let detailMap = null;
let detailMarker = null;
let currentEventData = null;
let userLocationMarker = null;
let userLatLng = null;
let directionsService = null;
let directionsRenderer = null;

// ==================== 이미지 슬라이더 변수 ====================
let currentImageIndex = 0;
let imageUrls = [];

// ==================== localStorage 유틸 ====================
function getLikedEvents() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return {};
    
    const userDataStr = localStorage.getItem(`userData_${userId}`);
    if (!userDataStr) return {};
    
    const userData = JSON.parse(userDataStr);
    
    // 찜한 이벤트 목록을 객체로 변환
    const likedObj = {};
    if (userData.likedEvents && Array.isArray(userData.likedEvents)) {
      userData.likedEvents.forEach(event => {
        likedObj[event.id] = event;
      });
    }
    
    return likedObj;
  } catch (e) {
    console.error('likedEvents 가져오기 오류:', e);
    return {};
  }
}

function saveLikedEvents(likedObj) {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    const userDataStr = localStorage.getItem(`userData_${userId}`);
    if (!userDataStr) return;
    
    const userData = JSON.parse(userDataStr);
    
    // 객체를 배열로 변환
    userData.likedEvents = Object.values(likedObj);
    
    localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
    console.log('찜 목록 저장 완료:', userData.likedEvents);
  } catch (e) {
    console.error('likedEvents 저장 오류:', e);
  }
}

// 하트 UI 동기화
function syncLikeButtonState() {
  if (!likeBtn || !currentEventData) return;

  const likedEvents = getLikedEvents();
  const isLiked = !!likedEvents[currentEventData.id];

  if (isLiked) {
    likeBtn.classList.add('active');
    likeBtn.textContent = '♥';
    likeBtn.style.color = '#ff4757';
  } else {
    likeBtn.classList.remove('active');
    likeBtn.textContent = '♡';
    likeBtn.style.color = '#666';
  }
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

    // 🔥 이미지 URL 수집 (여러 개)
    const images = [];
    if (f.firstimage) images.push(f.firstimage.replace('http://', 'https://'));
    if (f.firstimage2) images.push(f.firstimage2.replace('http://', 'https://'));
    
    return {
      id: region + '-' + (f.contentid || (idx + 1)),
      title: f.title || '제목 없음',
      dateText: formatTourDateRange(f.eventstartdate, f.eventenddate),
      timeText: '상시',
      locationText: f.addr1 || f.addr2 || '',
      address: (f.addr1 || '') + (f.addr2 ? ' ' + f.addr2 : ''),
      priceText: '무료',
      summary: f.overview || '상세 설명 없음',
      host: '주최자 미정',
      topic: '',
      categoryKey: 'festival',
      categoryLabel: categoryLabel,
      categories: categories,
      lat: parseFloat(f.mapy) || null,
      lng: parseFloat(f.mapx) || null,
      rating: parseFloat((Math.random() * 0.5 + 4.5).toFixed(1)),
      participants: Math.floor(Math.random() * 3000 + 500),
      images: images // 🔥 이미지 배열
    };
  });
}

// ==================== Google Maps 초기화 ====================
async function initDetailMap() {
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
  
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: detailMap,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: '#FF6B6B',
      strokeWeight: 5
    }
  });

  console.log('Google Maps 초기화 완료');
  await initDetailPage();
}

window.initDetailMap = initDetailMap;

// 지도에 마커 표시
function displayMapMarker(eventData) {
  if (!detailMap) {
    console.warn('지도가 아직 초기화되지 않았습니다.');
    return;
  }
  
  // 좌표가 있으면 바로 마커 생성
  if (eventData.lat && eventData.lng) {
    const position = { lat: eventData.lat, lng: eventData.lng };
    createMarkerAtPosition(position, eventData.title);
    detailMap.setCenter(position);
    detailMap.setZoom(15);
    return;
  }
  
  // 좌표가 없으면 Geocoding 시도
  if (!eventData.address && !eventData.locationText) {
    console.warn('주소 정보가 없습니다.');
    return;
  }
  
  const geocoder = new google.maps.Geocoder();
  const address = eventData.address || eventData.locationText;
  
  geocoder.geocode({ address: address }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const position = results[0].geometry.location;
      createMarkerAtPosition(position, eventData.title);
      detailMap.setCenter(position);
      detailMap.setZoom(15);
    } else {
      console.warn('Geocoding 실패:', status);
      tryFallbackGeocoding(address);
    }
  });
}

function updateCurrentLocationText(text) {
  if (currentLocationText) {
    currentLocationText.textContent = text;
  }
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    showNotification('이 브라우저에서는 위치 정보를 사용할 수 없습니다.');
    return;
  }

  updateCurrentLocationText('현위치를 불러오는 중입니다...');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      userLatLng = new google.maps.LatLng(latitude, longitude);

      if (userLocationMarker) {
        userLocationMarker.setMap(null);
      }

      userLocationMarker = new google.maps.Marker({
        position: userLatLng,
        map: detailMap,
        title: '내 위치',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      if (detailMap) {
        detailMap.panTo(userLatLng);
        detailMap.setZoom(14);
      }

      updateCurrentLocationText(
        `현재 위치: 위도 ${latitude.toFixed(4)}, 경도 ${longitude.toFixed(4)}`
      );
      showNotification('📍 현위치를 불러왔습니다.');
    },
    (err) => {
      console.error('geolocation error:', err);
      updateCurrentLocationText('현위치를 가져오지 못했습니다. 위치 권한을 확인해 주세요.');
      showNotification('⚠️ 위치 정보를 가져오지 못했습니다.');
    }
  );
}

function requestRoute(travelMode) {
  if (!directionsService || !directionsRenderer) {
    console.warn('Directions 서비스가 초기화되지 않았습니다.');
    return;
  }

  if (!userLatLng) {
    showNotification('먼저 "현위치 불러오기"를 눌러주세요.');
    return;
  }

  if (!currentEventData && !detailMarker) {
    showNotification('목적지 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  let destinationLatLng = null;

  if (currentEventData && currentEventData.lat && currentEventData.lng) {
    destinationLatLng = new google.maps.LatLng(currentEventData.lat, currentEventData.lng);
  } else if (detailMarker) {
    destinationLatLng = detailMarker.getPosition();
  }

  if (!destinationLatLng) {
    showNotification('목적지 좌표를 찾을 수 없습니다.');
    return;
  }

  const request = {
    origin: userLatLng,
    destination: destinationLatLng,
    travelMode
  };

  if (travelMode === google.maps.TravelMode.TRANSIT) {
    request.transitOptions = {
      modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.SUBWAY]
    };
  }

  if (routeSummaryEl) {
    routeSummaryEl.textContent = '경로를 불러오는 중입니다...';
  }

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      const leg = result.routes[0].legs[0];
      const modeLabel =
        travelMode === google.maps.TravelMode.TRANSIT
          ? '대중교통'
          : travelMode === google.maps.TravelMode.DRIVING
          ? '자동차'
          : '도보';

      let html = `
        <div>
          <strong>${modeLabel}</strong> 기준 예상 소요시간은
          <strong>${leg.duration.text}</strong>,
          거리 <strong>${leg.distance.text}</strong> 입니다.
        </div>
      `;

      const arrivalTime = leg.arrival_time ? leg.arrival_time.text : null;
      const departureTime = leg.departure_time ? leg.departure_time.text : null;

      if (arrivalTime || departureTime) {
        html += '<div style="margin-top:4px;">';
        if (departureTime) html += `출발: ${departureTime} `;
        if (arrivalTime) html += ` / 도착: ${arrivalTime}`;
        html += '</div>';
      }

      const steps = leg.steps || [];
      if (steps.length) {
        html += '<ul style="margin-top:6px; padding-left:18px;">';
        steps.slice(0, 4).forEach((step) => {
          const inst = step.instructions
            ? step.instructions.replace(/<[^>]+>/g, '')
            : '';
          html += `<li>${inst || step.travel_mode}</li>`;
        });
        html += '</ul>';
      }

      if (routeSummaryEl) {
        routeSummaryEl.innerHTML = html;
      }
    } else {
      console.warn('Directions 요청 실패:', status);
      if (routeSummaryEl) {
        routeSummaryEl.textContent =
          '경로를 찾지 못했습니다. 다른 교통수단을 시도하거나, 구글 지도 앱에서 다시 시도해 주세요.';
      }
      showNotification('경로 정보를 불러오지 못했습니다.');
    }
  });
}

function openParkingInGoogleMaps() {
  let destLatLng = null;

  if (currentEventData && currentEventData.lat && currentEventData.lng) {
    destLatLng = { lat: currentEventData.lat, lng: currentEventData.lng };
  } else if (detailMarker) {
    const p = detailMarker.getPosition();
    destLatLng = { lat: p.lat(), lng: p.lng() };
  }

  if (!destLatLng) {
    showNotification('목적지 위치를 아직 불러오지 못했습니다.');
    return;
  }

  const url = `https://www.google.com/maps/search/%EC%A3%BC%EC%B0%A8%EC%9E%A5/@${destLatLng.lat},${destLatLng.lng},17z`;
  window.open(url, '_blank');
}


function tryFallbackGeocoding(address) {
  const region = address.match(/서울|부산|대전|대구|인천|광주|울산|세종/)?.[0];
  if (region) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: region }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const position = results[0].geometry.location;
        detailMap.setCenter(position);
        detailMap.setZoom(12);
      }
    });
  }
}

function createMarkerAtPosition(position, title) {
  if (detailMarker) {
    detailMarker.setMap(null);
  }
  
  detailMarker = new google.maps.Marker({
    position: position,
    map: detailMap,
    title: title,
    animation: google.maps.Animation.DROP
  });
}

// ==================== 이미지 슬라이더 ====================
function updateImageSlider(eventData) {
  const imageSlider = document.querySelector('.image-slider');
  if (!imageSlider) return;
  
  // 🔥 여러 이미지 수집
  imageUrls = eventData.images && eventData.images.length > 0 ? eventData.images : [];
  currentImageIndex = 0;
  
  if (imageUrls.length === 0) {
    // 이미지가 없으면 그라데이션
    useGradientBackground(imageSlider);
    return;
  }
  
  // 슬라이더 HTML 생성
  renderImageSlider(imageSlider);
}

function renderImageSlider(container) {
  const totalImages = imageUrls.length;
  
  container.innerHTML = `
    <div class="slider-wrapper" style="position: relative; width: 100%; height: 100%; overflow: hidden;">
      <div class="slider-track" style="display: flex; transition: transform 0.3s ease; height: 100%;">
        ${imageUrls.map((url, idx) => `
          <div class="slider-item" style="min-width: 100%; height: 100%; flex-shrink: 0;">
            <img src="${url}" alt="이미지 ${idx + 1}" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:48px;\\'>🎪</div>';">
          </div>
        `).join('')}
      </div>
      
      ${totalImages > 1 ? `
        <button class="slider-btn slider-prev" onclick="prevImage()" 
                style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); 
                       width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.9); 
                       border: none; cursor: pointer; font-size: 20px; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ‹
        </button>
        <button class="slider-btn slider-next" onclick="nextImage()"
                style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); 
                       width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.9); 
                       border: none; cursor: pointer; font-size: 20px; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ›
        </button>
      ` : ''}
      
      <div class="slide-indicator">${currentImageIndex + 1} / ${totalImages}</div>
    </div>
  `;
}

// 🔥 이미지 넘기기 함수
window.nextImage = function() {
  if (currentImageIndex < imageUrls.length - 1) {
    currentImageIndex++;
  } else {
    currentImageIndex = 0; // 마지막에서 처음으로
  }
  updateSliderPosition();
};

window.prevImage = function() {
  if (currentImageIndex > 0) {
    currentImageIndex--;
  } else {
    currentImageIndex = imageUrls.length - 1; // 처음에서 마지막으로
  }
  updateSliderPosition();
};

function updateSliderPosition() {
  const track = document.querySelector('.slider-track');
  const indicator = document.querySelector('.slide-indicator');
  
  if (track) {
    track.style.transform = `translateX(-${currentImageIndex * 100}%)`;
  }
  
  if (indicator) {
    indicator.textContent = `${currentImageIndex + 1} / ${imageUrls.length}`;
  }
}

function useGradientBackground(imageSlider) {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  ];
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
  
  imageSlider.style.height = '380px';
  imageSlider.style.display = 'flex';
  imageSlider.style.justifyContent = 'center';
  imageSlider.style.alignItems = 'center';
  imageSlider.innerHTML = `
    <div style="width: 100%; height: 100%; background: ${randomGradient}; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">
      🎪
    </div>
    <div class="slide-indicator">1 / 1</div>
  `;
}

// ==================== DOM 업데이트 ====================
function updateDOM(eventData) {
  currentEventData = eventData;
  
  detailTitle.textContent = eventData.title;
  detailCategory.textContent = eventData.categoryLabel;
  detailDate.textContent = eventData.dateText;
  detailTime.textContent = eventData.timeText || '시간 정보 없음';
  detailLocationMain.textContent = eventData.locationText;
  
  // 이미지 슬라이더 업데이트
  updateImageSlider(eventData);
  
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
  
  // 지도 표시
  if (detailMap) {
    displayMapMarker(eventData);
  } else {
    setTimeout(() => {
      if (detailMap) displayMapMarker(eventData);
    }, 1000);
  }

  // 하트 상태 동기화
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

// ==================== 이벤트 핸들러 ====================

// 🔥 찜하기 버튼
likeBtn.addEventListener('click', () => {
  if (!currentEventData) {
    likeBtn.classList.toggle('active');
    likeBtn.textContent = likeBtn.classList.contains('active') ? '♥' : '♡';
    return;
  }

  const likedEvents = getLikedEvents();
  const id = currentEventData.id;

  const willLike = !likeBtn.classList.contains('active');

  if (willLike) {
    likeBtn.classList.add('active');
    likeBtn.textContent = '♥';
    likeBtn.style.color = '#ff4757';

    likedEvents[id] = {
      id,
      title: currentEventData.title,
      date: currentEventData.dateText,
      location: currentEventData.locationText,
      image: currentEventData.images && currentEventData.images[0] ? currentEventData.images[0] : ''
    };
    saveLikedEvents(likedEvents);

    showNotification('✅ 관심 이벤트에 추가되었습니다!');
  } else {
    likeBtn.classList.remove('active');
    likeBtn.textContent = '♡';
    likeBtn.style.color = '#666';

    delete likedEvents[id];
    saveLikedEvents(likedEvents);

    showNotification('❌ 관심 이벤트에서 제거되었습니다.');
  }
});

// 공유 버튼
shareBtn.addEventListener('click', () => {
  if (navigator.share) {
    navigator.share({
      title: detailTitle.textContent,
      text: detailLocationMain.textContent,
      url: window.location.href,
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showNotification('🔗 링크가 복사되었습니다!');
  }
});

// 탭 메뉴
tabMenuItems.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    tabMenuItems.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((c) => (c.style.display = 'none'));

    tab.classList.add('active');
    tabContents[index].style.display = 'block';
  });
});

// 주소 복사 버튼
document.addEventListener('click', (e) => {
  if (e.target.id === 'copyAddressBtn' || e.target.textContent.includes('복사')) {
    const addressText = document.getElementById('detail-address').textContent;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addressText)
        .then(() => {
          showNotification('📋 주소가 복사되었습니다!');
        })
        .catch((err) => {
          console.error('복사 실패:', err);
        });
    }
  }
});

// 채팅방 입장 버튼
if (chatEnterBtn) {
  chatEnterBtn.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || (currentEventData && currentEventData.id) || '';

    if (currentEventData && eventId) {
      const cache = JSON.parse(localStorage.getItem('chatEventCache') || '{}');
      cache[eventId] = currentEventData;
      localStorage.setItem('chatEventCache', JSON.stringify(cache));
    }

    window.location.href = `chat_page.html?id=${encodeURIComponent(eventId)}`;
  });
}

// 알림 페이지로 이동
function goToNotifications() {
  // 이미 알림 페이지면 굳이 이동 안 해도 되지만,
  // 새로고침 느낌으로 그냥 보내도 문제 없음
  window.location.href = 'notification.html';
}


// ==================== 초기화 ====================
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
  let seoul = [];

  try {
    daejeon = await fetchDaejeonFestivals();
    console.log('대전 축제 로드 완료:', daejeon.length);
  } catch (e) {
    console.error('대전 축제 API 오류:', e);
  }

  try {
    busan = await fetchBusanFestivals();
    console.log('부산 축제 로드 완료:', busan.length);
  } catch (e) {
    console.error('부산 축제 API 오류:', e);
  }

  try {
    seoul = await fetchSeoulFestivals();
    console.log('서울 축제 로드 완료:', seoul.length);
  } catch (e) {
    console.error('서울 축제 API 오류:', e);
  }

  const allEvents = daejeon.concat(busan).concat(seoul);
  console.log('전체 이벤트 개수:', allEvents.length);
  
  const targetEvent = allEvents.find((event) => event.id === eventId);

  if (targetEvent) {
    console.log('찾은 이벤트:', targetEvent.title);
    updateDOM(targetEvent);
    showNotification('✅ 이벤트 상세 정보가 로드되었습니다.');
  } else {
    console.error('이벤트를 찾을 수 없습니다. ID:', eventId);
    alert(`⚠️ 이벤트 ID: ${eventId}에 해당하는 정보를 찾을 수 없습니다.`);
    window.location.href = 'event_list.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - Google Maps 로드 대기 중...');
});

// 위치정보 탭 버튼들 이벤트
if (btnUseCurrentLocation) {
  btnUseCurrentLocation.addEventListener('click', requestUserLocation);
}

if (btnRouteTransit) {
  btnRouteTransit.addEventListener('click', () =>
    requestRoute(google.maps.TravelMode.TRANSIT)
  );
}

if (btnRouteDriving) {
  btnRouteDriving.addEventListener('click', () =>
    requestRoute(google.maps.TravelMode.DRIVING)
  );
}

if (btnRouteWalking) {
  btnRouteWalking.addEventListener('click', () =>
    requestRoute(google.maps.TravelMode.WALKING)
  );
}

if (btnOpenParking) {
  btnOpenParking.addEventListener('click', openParkingInGoogleMaps);
}

console.log('Event Detail JavaScript 로드 완료 - 학번: 202300771');