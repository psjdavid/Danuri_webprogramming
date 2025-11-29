// 학번: 202300771 이름: 박성준
// login.js - 간단한 JSON 백엔드 연동

const API_URL = './simple_backend.php';

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!id || !password) {
        showNotification('아이디와 비밀번호를 입력해주세요.');
        return;
    }
    
    const submitBtn = loginForm.querySelector('.btn-primary');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password })
        });
        
        const data = await response.json();
        
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        if (data.success) {
            const user = data.data.user;
            
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUserEmail', user.email);
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('isAdmin', data.data.isAdmin ? 'true' : 'false');
            
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('rememberMe', 'true');
            }
            
            showNotification(`환영합니다, ${user.name}님! 😊`);
            
            setTimeout(() => {
                if (data.data.isAdmin) {
                    window.location.href = 'event_manage.html';
                } else {
                    window.location.href = 'main_page.html';
                }
            }, 1000);
        } else {
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
    
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = localStorage.getItem('isAdmin') === 'true' 
            ? 'event_manage.html' 
            : 'main_page.html';
    }
    
    emailInput.focus();
});

console.log('Login JavaScript 로드 완료 (JSON 백엔드) - 학번: 202300771');