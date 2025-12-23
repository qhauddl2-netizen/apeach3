// 인증 및 사용자 관리 시스템 (서버 API 사용)

const API_URL = ''; // 상대 경로 사용 (같은 서버)
let currentUser = null;
let gameData = { users: [], scores: [] };

// 데이터 로드 (서버에서)
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/rankings`);
        const data = await response.json();
        // 서버에서 랭킹만 받아오므로 scores 형태로 변환
        gameData.scores = data.rankings || [];
    } catch (error) {
        console.log('서버 연결 실패, 로컬 데이터 사용');
        restoreGameData();
    }
}

// 데이터 저장 (서버 API 사용 - 실제로는 각 API 호출에서 자동 저장됨)
function saveData() {
    // 서버가 자동으로 data.json에 저장하므로 별도 작업 불필요
    // localStorage에도 백업
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

// 로그인 처리 (서버 API 사용)
async function login(nickname, password) {
    if (!nickname || !password) {
        showMessage('닉네임과 비밀번호를 입력해주세요.', 'error');
        return;
    }

    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
        showMessage('비밀번호는 4자리 숫자여야 합니다.', 'error');
        return;
    }

    try {
        // 서버 API로 로그인 요청
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname, password })
        });

        const result = await response.json();

        if (response.ok) {
            // 로그인 성공
            currentUser = { nickname, password };
            localStorage.setItem('marioUser', JSON.stringify(currentUser));
            showMessage(result.message, 'success');
            setTimeout(() => {
                showGameScreen();
            }, 500);
        } else {
            // 로그인 실패
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        showMessage('서버에 연결할 수 없습니다. 서버를 시작해주세요.', 'error');
    }
}

// 로그아웃
function logout() {
    currentUser = null;
    localStorage.removeItem('marioUser');
    location.reload();
}

// 점수 저장 (서버 API 사용)
async function saveScore(score) {
    if (!currentUser) return;

    try {
        // 서버 API로 점수 저장 요청
        const response = await fetch(`${API_URL}/save-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nickname: currentUser.nickname,
                password: currentUser.password,
                score: score
            })
        });

        const result = await response.json();

        if (response.ok) {
            // 로컬 데이터도 업데이트
            gameData.scores.push({
                nickname: currentUser.nickname,
                score: score,
                date: new Date().toISOString()
            });
            saveData(); // localStorage 백업
            return result;
        } else {
            console.error('점수 저장 실패:', result.message);
            return { message: '점수 저장 실패', score };
        }
    } catch (error) {
        console.error('점수 저장 오류:', error);
        // 서버 연결 실패 시 localStorage에만 저장
        gameData.scores.push({
            nickname: currentUser.nickname,
            score: score,
            date: new Date().toISOString()
        });
        saveData();
        return { message: '점수가 로컬에 저장되었습니다.', score };
    }
}

// 랭킹 가져오기 (서버 API 사용)
async function getRankings() {
    try {
        const response = await fetch(`${API_URL}/rankings`);
        const data = await response.json();
        return data.rankings || [];
    } catch (error) {
        console.error('랭킹 조회 오류:', error);
        // 서버 연결 실패 시 로컬 데이터 사용
        const userBestScores = {};
        gameData.scores.forEach(scoreEntry => {
            if (!userBestScores[scoreEntry.nickname] ||
                userBestScores[scoreEntry.nickname].score < scoreEntry.score) {
                userBestScores[scoreEntry.nickname] = scoreEntry;
            }
        });

        const rankings = Object.values(userBestScores)
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);

        return rankings;
    }
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
