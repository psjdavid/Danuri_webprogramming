// logout.js - 학번: 202300771 이름: 박성준

// localStorage 완전 초기화
console.log('=== 로그아웃 시작 ===');

const keysToRemove = [
    'isLoggedIn',
    'userId',
    'currentUserEmail',
    'userName',
    'isAdmin',
    'rememberMe'
];

keysToRemove.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) {
        console.log(`삭제: ${key} = ${value}`);
        localStorage.removeItem(key);
    }
});

console.log('✅ localStorage 초기화 완료');
console.log('남은 항목:', Object.keys(localStorage));

// 로그인 페이지로 이동
function goToLogin() {
    window.location.href = 'login.html';
}

// 카운트다운
let countdown = 3;
const countdownElement = document.getElementById('countdownText');

const countdownInterval = setInterval(() => {
    countdown--;
    if (countdownElement) {
        countdownElement.textContent = countdown;
    }
    
    if (countdown <= 0) {
        clearInterval(countdownInterval);
        goToLogin();
    }
}, 1000);

console.log('Logout JavaScript 로드 완료 - 학번: 202300771');