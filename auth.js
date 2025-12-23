// 인증 및 사용자 관리 시스템 (로컬 JSON 파일 사용)

let currentUser = null;
let gameData = { users: [], scores: [] };

// 데이터 로드
async function loadData() {
    try {
        const response = await fetch('data.json');
        gameData = await response.json();
    } catch (error) {
        console.log('데이터 파일 로드 실패, 기본 데이터 사용');
        gameData = { users: [], scores: [] };
    }
}

// 데이터 저장 (localStorage 사용)
function saveData() {
    localStorage.setItem('marioGameData', JSON.stringify(gameData));
}

// 로컬 스토리지에서 게임 데이터 복원
function restoreGameData() {
    const savedData = localStorage.getItem('marioGameData');
    if (savedData) {
        gameData = JSON.parse(savedData);
    }
}

// 로컬 스토리지에서 사용자 정보 확인
function checkLocalAuth() {
    const savedUser = localStorage.getItem('marioUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showGameScreen();
    }
}

// 로그인 처리
async function login(nickname, password) {
    if (!nickname || !password) {
        showMessage('닉네임과 비밀번호를 입력해주세요.', 'error');
        return;
    }

    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
        showMessage('비밀번호는 4자리 숫자여야 합니다.', 'error');
        return;
    }

    // 기존 사용자 찾기
    const existingUser = gameData.users.find(u => u.nickname === nickname);

    if (existingUser) {
        // 기존 사용자 - 비밀번호 확인
        if (existingUser.password === password) {
            currentUser = { nickname, password };
            localStorage.setItem('marioUser', JSON.stringify(currentUser));
            showMessage('로그인 성공!', 'success');
            setTimeout(() => {
                showGameScreen();
            }, 500);
        } else {
            showMessage('비밀번호가 일치하지 않습니다.', 'error');
        }
    } else {
        // 신규 사용자 - 회원가입
        gameData.users.push({ nickname, password });
        saveData();

        currentUser = { nickname, password };
        localStorage.setItem('marioUser', JSON.stringify(currentUser));
        showMessage('회원가입 및 로그인 성공!', 'success');
        setTimeout(() => {
            showGameScreen();
        }, 500);
    }
}

// 로그아웃
function logout() {
    currentUser = null;
    localStorage.removeItem('marioUser');
    location.reload();
}

// 점수 저장
async function saveScore(score) {
    if (!currentUser) return;

    // 점수 저장
    gameData.scores.push({
        nickname: currentUser.nickname,
        score: score,
        date: new Date().toISOString()
    });

    saveData();
    return { message: '점수가 저장되었습니다.', score };
}

// 랭킹 가져오기
async function getRankings() {
    // 사용자별 최고 점수만 추출
    const userBestScores = {};
    gameData.scores.forEach(scoreEntry => {
        if (!userBestScores[scoreEntry.nickname] ||
            userBestScores[scoreEntry.nickname].score < scoreEntry.score) {
            userBestScores[scoreEntry.nickname] = scoreEntry;
        }
    });

    // 배열로 변환 후 점수 내림차순 정렬
    const rankings = Object.values(userBestScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50); // 상위 50명만

    return rankings;
}

// 메시지 표시
function showMessage(message, type) {
    const messageEl = document.getElementById('loginMessage');
    messageEl.textContent = message;
    messageEl.className = `login-message ${type}`;
}

// 게임 화면 표시
function showGameScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    document.getElementById('currentUser').textContent = `플레이어: ${currentUser.nickname}`;
}

// 랭킹 화면 표시
async function showRankingScreen() {
    const rankings = await getRankings();
    const rankingList = document.getElementById('fullRankingList');

    if (rankings.length === 0) {
        rankingList.innerHTML = '<p>아직 랭킹 정보가 없습니다.</p>';
    } else {
        let html = '<table class="ranking-table"><thead><tr><th>순위</th><th>닉네임</th><th>점수</th><th>날짜</th></tr></thead><tbody>';
        rankings.forEach((item, index) => {
            const isCurrentUser = currentUser && item.nickname === currentUser.nickname;
            const rowClass = isCurrentUser ? 'current-user' : '';
            const date = new Date(item.date).toLocaleDateString('ko-KR');
            html += `<tr class="${rowClass}">
                <td>${index + 1}</td>
                <td>${item.nickname}</td>
                <td>${item.score}</td>
                <td>${date}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        rankingList.innerHTML = html;
    }

    document.getElementById('rankingScreen').classList.remove('hidden');
}

// 랭킹 화면 닫기
function closeRankingScreen() {
    document.getElementById('rankingScreen').classList.add('hidden');
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', async () => {
    // 데이터 로드
    await loadData();
    restoreGameData();
    checkLocalAuth();

    // 로그인 버튼
    document.getElementById('loginBtn').addEventListener('click', () => {
        const nickname = document.getElementById('nickname').value.trim();
        const password = document.getElementById('password').value.trim();
        login(nickname, password);
    });

    // 엔터키로 로그인
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const nickname = document.getElementById('nickname').value.trim();
            const password = document.getElementById('password').value.trim();
            login(nickname, password);
        }
    });

    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 랭킹 보기 버튼
    document.getElementById('viewRankingBtn').addEventListener('click', showRankingScreen);

    // 랭킹 닫기 버튼
    document.getElementById('closeRankingBtn').addEventListener('click', closeRankingScreen);
});
