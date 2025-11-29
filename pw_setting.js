// 학번: 202300771 이름: 박성준
// password_reset.js - 비밀번호 찾기 페이지 인터랙션 처리

// 현재 단계
let currentStep = 1;
let userEmail = '';
let verificationCode = '';
let timerInterval = null;

// DOM 요소 선택
const steps = document.querySelectorAll('.step');
const stepContents = document.querySelectorAll('.step-content');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const verifyCodeBtn = document.getElementById('verifyCodeBtn');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const goToLoginBtn = document.getElementById('goToLoginBtn');
const resendCodeBtn = document.getElementById('resendCodeBtn');
const emailInput = document.getElementById('email');
const codeInputs = document.querySelectorAll('.code-input');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');

// 단계 이동
function goToStep(stepNumber) {
    // 단계 업데이트
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        if (stepNum < stepNumber) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // 콘텐츠 표시
    stepContents.forEach((content, index) => {
        if (index + 1 === stepNumber) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    currentStep = stepNumber;
    console.log('현재 단계:', currentStep);
}

// Step 1: 이메일 인증 코드 발송
sendCodeBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    
    // 이메일 유효성 검사
    if (!validateEmail(email)) {
        showError('emailError', '올바른 이메일 주소를 입력해주세요.');
        return;
    }

    // 로딩 상태
    sendCodeBtn.classList.add('loading');
    sendCodeBtn.disabled = true;

    // 서버에 인증 코드 발송 요청 시뮬레이션
    setTimeout(() => {
        userEmail = email;
        verificationCode = generateCode(); // 실제로는 서버에서 생성
        console.log('발송된 인증 코드:', verificationCode); // 개발용

        sendCodeBtn.classList.remove('loading');
        sendCodeBtn.disabled = false;

        showNotification(`${email}로 인증 코드가 발송되었습니다.`);
        document.getElementById('emailDisplay').textContent = email;
        
        // 다음 단계로
        goToStep(2);
        startTimer(180); // 3분 타이머
        
        // 첫 번째 입력창에 포커스
        codeInputs[0].focus();
    }, 1500);
});

// Step 2: 인증 코드 확인
verifyCodeBtn.addEventListener('click', () => {
    const code = Array.from(codeInputs).map(input => input.value).join('');
    
    if (code.length !== 6) {
        showError('codeError', '6자리 인증 코드를 모두 입력해주세요.');
        return;
    }

    // 로딩 상태
    verifyCodeBtn.classList.add('loading');
    verifyCodeBtn.disabled = true;

    // 인증 코드 확인 시뮬레이션
    setTimeout(() => {
        verifyCodeBtn.classList.remove('loading');
        verifyCodeBtn.disabled = false;

        // 개발용: 실제로는 서버에서 확인
        if (code === verificationCode || code === '123456') {
            clearInterval(timerInterval);
            showNotification('인증이 완료되었습니다.');
            goToStep(3);
            newPasswordInput.focus();
        } else {
            showError('codeError', '인증 코드가 올바르지 않습니다. 다시 확인해주세요.');
            codeInputs.forEach(input => input.value = '');
            codeInputs[0].focus();
        }
    }, 1000);
});

// Step 3: 비밀번호 재설정
resetPasswordBtn.addEventListener('click', () => {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // 비밀번호 유효성 검사
    if (!validatePassword(newPassword)) {
        showError('passwordError', '비밀번호는 8자 이상이며, 영문, 숫자, 특수문자를 포함해야 합니다.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('passwordError', '비밀번호가 일치하지 않습니다.');
        return;
    }

    // 로딩 상태
    resetPasswordBtn.classList.add('loading');
    resetPasswordBtn.disabled = true;

    // 비밀번호 변경 시뮬레이션
    setTimeout(() => {
        resetPasswordBtn.classList.remove('loading');
        resetPasswordBtn.disabled = false;

        showNotification('비밀번호가 성공적으로 변경되었습니다.');
        goToStep(4);
    }, 1500);
});

// Step 4: 로그인 페이지로 이동
goToLoginBtn.addEventListener('click', () => {
    window.location.href = 'login.html';
});

// 인증 코드 재발송
resendCodeBtn.addEventListener('click', () => {
    resendCodeBtn.disabled = true;
    resendCodeBtn.textContent = '발송 중...';

    setTimeout(() => {
        verificationCode = generateCode();
        console.log('재발송된 인증 코드:', verificationCode);
        
        showNotification('인증 코드가 재발송되었습니다.');
        codeInputs.forEach(input => input.value = '');
        codeInputs[0].focus();
        
        resendCodeBtn.disabled = false;
        resendCodeBtn.textContent = '인증 코드 재발송';
        
        clearInterval(timerInterval);
        startTimer(180);
    }, 1000);
});

// 인증 코드 입력 처리
codeInputs.forEach((input, index) => {
    // 숫자만 입력
    input.addEventListener('input', (e) => {
        const value = e.target.value;
        
        // 숫자가 아닌 경우 제거
        if (!/^\d$/.test(value)) {
            e.target.value = '';
            return;
        }

        // 자동으로 다음 입력창으로 이동
        if (value && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }

        // 모든 코드가 입력되면 자동 확인
        const allFilled = Array.from(codeInputs).every(input => input.value);
        if (allFilled) {
            verifyCodeBtn.focus();
        }
    });

    // 백스페이스로 이전 입력창으로 이동
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
            codeInputs[index - 1].focus();
        }
    });

    // 붙여넣기 처리
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        
        if (/^\d+$/.test(pastedData)) {
            pastedData.split('').forEach((char, i) => {
                if (codeInputs[i]) {
                    codeInputs[i].value = char;
                }
            });
            
            if (pastedData.length === 6) {
                verifyCodeBtn.focus();
            }
        }
    });
});

// 타이머 시작
function startTimer(seconds) {
    let timeLeft = seconds;
    const timerElement = document.getElementById('timer');

    timerInterval = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerElement.textContent = `${minutes}:${String(secs).padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElement.textContent = '만료됨';
            timerElement.style.color = '#ef4444';
            showError('codeError', '인증 시간이 만료되었습니다. 코드를 재발송해주세요.');
            verifyCodeBtn.disabled = true;
        } else if (timeLeft <= 30) {
            timerElement.style.color = '#ef4444';
        }
    }, 1000);
}

// 비밀번호 표시/숨김 토글
togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetInput = document.getElementById(targetId);
        
        if (targetInput.type === 'password') {
            targetInput.type = 'text';
            btn.textContent = '🙈';
        } else {
            targetInput.type = 'password';
            btn.textContent = '👁️';
        }
    });
});

// 비밀번호 강도 체크
newPasswordInput.addEventListener('input', () => {
    const password = newPasswordInput.value;
    const strength = checkPasswordStrength(password);
    
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text strong');
    
    strengthFill.className = 'strength-fill';
    
    if (strength.score === 0) {
        strengthText.textContent = '-';
    } else if (strength.score <= 2) {
        strengthFill.classList.add('weak');
        strengthText.textContent = '약함';
        strengthText.style.color = '#ef4444';
    } else if (strength.score <= 3) {
        strengthFill.classList.add('medium');
        strengthText.textContent = '보통';
        strengthText.style.color = '#f59e0b';
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = '강함';
        strengthText.style.color = '#10b981';
    }

    // 요구사항 체크
    updateRequirement('req-length', password.length >= 8);
    updateRequirement('req-letter', /[a-zA-Z]/.test(password));
    updateRequirement('req-number', /\d/.test(password));
    updateRequirement('req-special', /[!@#$%^&*(),.?":{}|<>]/.test(password));
});

// 요구사항 업데이트
function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    if (isValid) {
        element.classList.add('valid');
    } else {
        element.classList.remove('valid');
    }
}

// 비밀번호 강도 계산
function checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    
    return { score };
}

// 이메일 유효성 검사
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 비밀번호 유효성 검사
function validatePassword(password) {
    return password.length >= 8 &&
           /[a-zA-Z]/.test(password) &&
           /\d/.test(password) &&
           /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

// 인증 코드 생성 (개발용)
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 에러 메시지 표시
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 5000);
}

// 알림 토스트 표시
function showNotification(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 16px 32px;
        border-radius: 50px;
        font-size: 15px;
        font-weight: 500;
        z-index: 10000;
        animation: slideUp 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 애니메이션 CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
    }
`;
document.head.appendChild(style);

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('비밀번호 찾기 페이지 로드 완료');
    
    // 첫 번째 입력창에 포커스
    if (emailInput) {
        emailInput.focus();
    }
    
    // URL 파라미터에서 이메일 가져오기 (선택적)
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam && emailInput) {
        emailInput.value = emailParam;
    }
});

// 뒤로가기 방지 (선택적)
window.addEventListener('popstate', (e) => {
    if (currentStep > 1 && currentStep < 4) {
        if (confirm('진행 중인 작업이 있습니다. 정말 나가시겠습니까?')) {
            // 나가기 허용
        } else {
            window.history.pushState(null, '', window.location.href);
        }
    }
});

window.history.pushState(null, '', window.location.href);