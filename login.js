// 학번: 202300771 이름: 박성준
// login.js - JSON 백엔드(auth.php) 연동

const BACKEND_BASE = '/TP/backend';
const AUTH_API = `${BACKEND_BASE}/auth.php`;   // ✅ 로그인/로그아웃/세션 체크 PHP

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const kakaoBtn = document.getElementById('kakaoLogin');
if (kakaoBtn) {
    kakaoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        kakaoLogin();
    });
}

// ===== Kakao Login 설정 =====
const KAKAO_JS_KEY = 'da44a1042ae86541c1884b3934a5adce';

if (window.Kakao && !Kakao.isInitialized()) {
    Kakao.init(KAKAO_JS_KEY);
    console.log('✅ Kakao SDK 초기화 완료:', Kakao.isInitialized());
}

function kakaoLogin() {
    if (!window.Kakao) {
        showNotification('Kakao SDK가 로드되지 않았습니다.');
        return;
    }

    Kakao.Auth.authorize({
        redirectUri: 'http://localhost/TP/kakao_callback.html',
        scope: 'profile_nickname',
        throughTalk: false,
        // ★ 매번 로그인 창/계정 선택을 강제로 띄우기
        prompt: 'login'          // or 'select_account'
    });
}




// 소셜 로그인 공통 처리 (provider: 'kakao' | 'google')
async function socialLogin(provider, payload) {
    const submitBtn = loginForm.querySelector('.btn-primary');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${AUTH_API}?action=social_login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,      // 'kakao' or 'google'
                ...payload     // provider별로 다른 데이터
            })
        });

        const data = await response.json();

        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        if (!response.ok || !data.success) {
            showNotification(data.message || '소셜 로그인에 실패했습니다.');
            return;
        }

        const user   = data.data.user;
        const isAdmin = data.data.isAdmin ? true : false;

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUserEmail', user.email);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');

        showNotification(`환영합니다, ${user.name}님! 😊`);

        setTimeout(() => {
            window.location.href = isAdmin ? 'event_manage.html' : 'main_page.html';
        }, 800);

    } catch (error) {
        console.error('소셜 로그인 오류:', error);
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        showNotification('소셜 로그인 중 오류가 발생했습니다.');
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = emailInput.value.trim();   // auth.php도 id 필드를 사용함
    const password = passwordInput.value;
    
    if (!id || !password) {
        showNotification('아이디와 비밀번호를 입력해주세요.');
        return;
    }
    
    const submitBtn = loginForm.querySelector('.btn-primary');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    try {
        // ✅ auth.php로 로그인 요청
        const response = await fetch(`${AUTH_API}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password })
        });

        // HTTP 에러 처리 (401, 500 등)
        if (!response.ok) {
            // auth.php는 sendError()도 JSON으로 내려주므로,
            // 가능하면 JSON을 한 번 시도해보고, 안 되면 일반 에러 처리
            let errData = null;
            try {
                errData = await response.json();
            } catch (e) {
                console.error('응답 JSON 파싱 실패:', e);
            }

            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            if (errData && errData.message) {
                showNotification(errData.message);
            } else {
                showNotification(`로그인 실패 (HTTP ${response.status})`);
            }
            passwordInput.value = '';
            return;
        }
        
        const data = await response.json();
        
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        if (data.success) {
            const user = data.data.user;          // auth.php: sendSuccess(['user' => $user, 'isAdmin' => ...])
            const isAdmin = data.data.isAdmin ? true : false;
            
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUserEmail', user.email);
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
            
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }
            
            showNotification(`환영합니다, ${user.name}님! 😊`);
            
            setTimeout(() => {
                if (isAdmin) {
                    window.location.href = 'event_manage.html';
                } else {
                    window.location.href = 'main_page.html';
                }
            }, 1000);
        } else {
            // sendError로 들어온 경우
            showNotification(data.message || '로그인 실패');
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        showNotification('로그인 중 오류가 발생했습니다');
    }
});

function showNotification(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; top: 100px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,.85); color: white; padding: 16px 32px;
        border-radius: 50px; font-size: 15px; z-index: 10000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const style = document.createElement('style');
style.textContent = `
    .btn-primary.loading { position: relative; color: transparent !important; }
    .btn-primary.loading::after {
        content: ''; position: absolute; width: 20px; height: 20px;
        top: 50%; left: 50%; margin: -10px 0 0 -10px;
        border: 3px solid rgba(255,255,255,.3); border-radius: 50%;
        border-top-color: white; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    console.log('로그인 페이지 로드 완료 (JSON 백엔드)');
    
    // 이미 로그인된 경우 자동 리다이렉트
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = localStorage.getItem('isAdmin') === 'true' 
            ? 'event_manage.html' 
            : 'main_page.html';
    }
    
    emailInput.focus();
});
