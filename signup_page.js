// 학번: 202300771 이름: 박성준
// signup_page.js - 회원가입 (백엔드 연동)

// ==============================
// API 엔드포인트
// ==============================
const API_BASE = '/TP/backend';  // ← 수정됨: /backend → /TP/backend
const USER_API = `${API_BASE}/user_api.php`;

// ==============================
// DOM 요소
// ==============================
const signupForm = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const agreeCheckbox = document.getElementById('agreeTerms');

// ==============================
// 회원가입 처리
// ==============================
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const agreeTerms = agreeCheckbox.checked;

        // 유효성 검사
        if (!name) {
            showNotification('이름을 입력해주세요.');
            nameInput.focus();
            return;
        }
        
        if (!validateEmail(email)) {
            showNotification('올바른 이메일 주소를 입력해주세요.');
            emailInput.focus();
            return;
        }
        
        if (password.length < 4) {
            showNotification('비밀번호는 최소 4자 이상이어야 합니다.');
            passwordInput.focus();
            return;
        }
        
        if (password !== confirmPassword) {
            showNotification('비밀번호가 일치하지 않습니다.');
            confirmPasswordInput.focus();
            return;
        }
        
        if (!agreeTerms) {
            showNotification('이용약관에 동의해주세요.');
            return;
        }

        // 로딩 상태
        const submitBtn = signupForm.querySelector('.btn-primary');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // PHP 백엔드로 회원가입 요청
            const response = await fetch(`${USER_API}?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: email.split('@')[0], // 이메일 앞부분을 ID로 사용
                    name,
                    email,
                    password
                })
            });

            const data = await response.json();

            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            if (data.success) {
                // 회원가입 성공
                console.log('회원가입 성공:', data.data);
                
                // localStorage에도 백업 (호환성)
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                users.push({
                    id: data.data.id,
                    name: data.data.name,
                    email: data.data.email
                });
                localStorage.setItem('users', JSON.stringify(users));
                
                showNotification('회원가입이 완료되었습니다! 로그인해주세요 🎉');
                
                // 로그인 페이지로 이동
                setTimeout(() => {
                    window.location.href = 'login.html?registered=true';
                }, 1500);
                
            } else {
                // 회원가입 실패
                showNotification(data.message || '회원가입에 실패했습니다.');
                
                if (data.message.includes('아이디')) {
                    emailInput.focus();
                } else if (data.message.includes('이메일')) {
                    emailInput.focus();
                }
            }

        } catch (error) {
            console.error('회원가입 오류:', error);
            
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            showNotification('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    });
}

// ==============================
// 유틸리티
// ==============================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showNotification(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 16px 32px;
        border-radius: 50px;
        font-size: 15px;
        font-weight: 500;
        z-index: 10000;
        animation: slideDown 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==============================
// 애니메이션 CSS
// ==============================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
    }
    
    .btn-primary.loading {
        position: relative;
        color: transparent;
    }
    
    .btn-primary.loading::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        top: 50%;
        left: 50%;
        margin-left: -10px;
        margin-top: -10px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ==============================
// 페이지 로드 시 초기화
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    console.log('회원가입 페이지 로드 완료 (백엔드 연동)');
    
    // 이미 로그인된 경우 메인으로 리다이렉트
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        showNotification('이미 로그인되어 있습니다');
        setTimeout(() => {
            window.location.href = 'main_page.html';
        }, 1000);
    }
});

console.log('Signup JavaScript 로드 완료 (백엔드 연동) - 학번: 202300771');