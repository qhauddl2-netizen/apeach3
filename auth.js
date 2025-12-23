// Firebase 기반 인증/점수 저장 (Firestore) + 로컬 폴백

let currentUser = null;
let gameData = { scores: [] };

function saveData() {
    localStorage.setItem('marioGameData', JSON.stringify(gameData));
}

function restoreGameData() {
    const savedData = localStorage.getItem('marioGameData');
    if (savedData) {
        try {
            gameData = JSON.parse(savedData);
        } catch (e) {
            gameData = { scores: [] };
        }
    }
}

function checkLocalAuth() {
    const savedUser = localStorage.getItem('marioUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showGameScreen();
    }
}

// show message helper
function showMessage(message, type) {
    const messageEl = document.getElementById('loginMessage');
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = `login-message ${type}`;
}

function showSignupMessage(message, type) {
    const messageEl = document.getElementById('signupMessage');
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = `login-message ${type}`;
}

function showGameScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    if (currentUser && document.getElementById('currentUser')) {
        document.getElementById('currentUser').textContent = `플레이어: ${currentUser.nickname}`;
    }
}

function closeRankingScreen() {
    document.getElementById('rankingScreen').classList.add('hidden');
}

// Firebase helpers available on window (set in index.html)
function hasFirestore() {
    return window.db && window.firebaseFns;
}

function hasAuth() {
    return window.auth && window.firebaseFns && window.firebaseFns.signInWithEmailAndPassword;
}

// 로그인
async function login(email, password) {
    if (!email || !password) {
        showMessage('이메일과 비밀번호를 입력해주세요.', 'error');
        return;
    }

    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
        showMessage('비밀번호는 4자리 숫자여야 합니다.', 'error');
        return;
    }

    // Use Firebase Auth if available
    if (hasAuth()) {
        const auth = window.auth;
        const fns = window.firebaseFns;
        try {
            console.debug('Firebase signIn attempt', { email });
            const res = await fns.signInWithEmailAndPassword(auth, email, password);
            const user = res.user;
            currentUser = { uid: user.uid, email: user.email, nickname: user.displayName || '' };
            localStorage.setItem('marioUser', JSON.stringify(currentUser));
            showMessage('로그인 성공', 'success');
            setTimeout(showGameScreen, 300);
            return;
        } catch (err) {
            console.error('Firebase signIn error', err.code, err);
            if (err && err.code) {
                if (err.code === 'auth/wrong-password') {
                    showMessage('비밀번호가 틀렸습니다.', 'error');
                    return;
                }
                if (err.code === 'auth/user-not-found') {
                    showMessage('등록되지 않은 이메일입니다. 회원가입을 진행해주세요.', 'error');
                    return;
                }
                if (err.code === 'auth/invalid-email') {
                    showMessage('유효하지 않은 이메일 형식입니다.', 'error');
                    return;
                }
                if (err.code === 'auth/invalid-credential') {
                    showMessage('인증 자격이 잘못되었습니다. Firebase 설정을 확인하세요.', 'error');
                    return;
                }
            }
            showMessage('로그인 실패: ' + (err.message || err.code), 'error');
            return;
        }
    }

    // Local fallback
    const users = (gameData.users || []);
    const found = users.find(u => u.email === email && u.password === password);
    if (found) {
        currentUser = { email: found.email, nickname: found.nickname || '' };
        localStorage.setItem('marioUser', JSON.stringify(currentUser));
        showMessage('로그인 성공 (로컬)', 'success');
        setTimeout(showGameScreen, 300);
    } else {
        showMessage('이메일 또는 비밀번호가 일치하지 않습니다.', 'error');
    }
}

// 회원가입
async function signup(email, nickname, password, passwordConfirm) {
    if (!email || !nickname || !password || !passwordConfirm) {
        showSignupMessage('모든 필드를 입력해주세요.', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showSignupMessage('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }

    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
        showSignupMessage('비밀번호는 4자리 숫자여야 합니다.', 'error');
        return;
    }

    // Use Firebase Auth if available
    if (hasAuth()) {
        const auth = window.auth;
        const fns = window.firebaseFns;
        try {
            console.debug('Firebase signup attempt', { email, nickname });
            const createRes = await fns.createUserWithEmailAndPassword(auth, email, password);
            // set displayName
            try {
                await fns.updateProfile(createRes.user, { displayName: nickname });
            } catch (e) {
                console.warn('updateProfile failed', e);
            }
            // create profile in Firestore
            if (hasFirestore()) {
                const { doc, setDoc } = window.firebaseFns;
                const db = window.db;
                await setDoc(doc(db, 'users', createRes.user.uid), {
                    email: email,
                    displayName: nickname,
                    createdAt: new Date().toISOString()
                });
            }
            currentUser = { uid: createRes.user.uid, email, nickname };
            localStorage.setItem('marioUser', JSON.stringify(currentUser));
            showSignupMessage('회원가입 성공! 로그인됩니다.', 'success');
            setTimeout(showGameScreen, 500);
            return;
        } catch (err) {
            console.error('Firebase signup error', err.code, err);
            if (err && err.code) {
                if (err.code === 'auth/email-already-in-use') {
                    showSignupMessage('이미 가입된 이메일입니다.', 'error');
                    return;
                }
                if (err.code === 'auth/invalid-email') {
                    showSignupMessage('유효하지 않은 이메일 형식입니다.', 'error');
                    return;
                }
                if (err.code === 'auth/weak-password') {
                    showSignupMessage('비밀번호가 너무 약합니다.', 'error');
                    return;
                }
            }
            showSignupMessage('회원가입 실패: ' + (err.message || err.code), 'error');
            return;
        }
    }

    // Local fallback
    const users = (gameData.users || []);
    if (users.find(u => u.email === email)) {
        showSignupMessage('이미 가입된 이메일입니다.', 'error');
        return;
    }
    users.push({ email, password, nickname });
    gameData.users = users;
    saveData();
    currentUser = { email, nickname };
    localStorage.setItem('marioUser', JSON.stringify(currentUser));
    showSignupMessage('회원가입 성공 (로컬)! 로그인됩니다.', 'success');
    setTimeout(showGameScreen, 500);
}

async function logout() {
    if (hasAuth()) {
        try {
            await window.firebaseFns.signOut(window.auth);
        } catch (e) {
            console.warn('Firebase signOut failed', e);
        }
    }
    currentUser = null;
    localStorage.removeItem('marioUser');
    location.reload();
}

// Save score to Firestore (or local fallback)
async function saveScore(score) {
    if (!currentUser) return;

    const entry = { score: score, date: new Date().toISOString() };
    if (currentUser) {
        entry.nickname = currentUser.nickname || '';
        entry.email = currentUser.email || '';
        entry.uid = currentUser.uid || '';
    }

    if (hasFirestore()) {
        const { collection, addDoc, serverTimestamp } = window.firebaseFns;
        const db = window.db;
        try {
            await addDoc(collection(db, 'scores'), { nickname: entry.nickname, email: entry.email, uid: entry.uid, score: entry.score, createdAt: serverTimestamp() });
            // local backup
            gameData.scores.push(entry);
            saveData();
            return { message: '점수 저장 완료', score };
        } catch (err) {
            console.error('Firestore 점수 저장 오류:', err);
            gameData.scores.push(entry);
            saveData();
            return { message: '로컬에 저장됨(업로드 실패)', score };
        }
    } else {
        // local fallback
        gameData.scores.push(entry);
        saveData();
        return { message: '로컬에 저장됨', score };
    }
}

// Get rankings (prefer Firestore)
async function getRankings() {
    // Try Firestore: fetch top N and dedupe by nickname keeping best score
    if (hasFirestore()) {
        const { collection, query, orderBy, limit, getDocs } = window.firebaseFns;
        const db = window.db;
        try {
            const q = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(200));
            const snap = await getDocs(q);
            const rows = [];
            snap.forEach(doc => {
                const data = doc.data();
                rows.push({ nickname: data.nickname, score: data.score, date: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString() });
            });

            // Deduplicate to keep best per nickname
            const best = {};
            for (const r of rows) {
                if (!best[r.nickname] || best[r.nickname].score < r.score) {
                    best[r.nickname] = r;
                }
            }
            const rankings = Object.values(best).sort((a, b) => b.score - a.score).slice(0, 50);
            return rankings;
        } catch (err) {
            console.error('Firestore 랭킹 조회 오류:', err);
            // fallthrough to local
        }
    }

    // Local fallback
    const userBestScores = {};
    gameData.scores.forEach(scoreEntry => {
        if (!userBestScores[scoreEntry.nickname] || userBestScores[scoreEntry.nickname].score < scoreEntry.score) {
            userBestScores[scoreEntry.nickname] = scoreEntry;
        }
    });

    const rankings = Object.values(userBestScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

    return rankings;
}

// Ranking screen
async function showRankingScreen() {
    const rankings = await getRankings();
    const rankingList = document.getElementById('fullRankingList');

    if (!rankingList) return;

    if (rankings.length === 0) {
        rankingList.innerHTML = '<p>아직 랭킹 정보가 없습니다.</p>';
    } else {
        let html = '<table class="ranking-table"><thead><tr><th>순위</th><th>닉네임</th><th>점수</th><th>날짜</th></tr></thead><tbody>';
        rankings.forEach((item, index) => {
            const isCurrentUser = currentUser && item.nickname === currentUser.nickname;
            const rowClass = isCurrentUser ? 'current-user' : '';
            const date = item.date ? new Date(item.date).toLocaleDateString('ko-KR') : '';
            html += `<tr class="${rowClass}">\n                <td>${index + 1}</td>\n                <td>${item.nickname}</td>\n                <td>${item.score}</td>\n                <td>${date}</td>\n            </tr>`;
        });
        html += '</tbody></table>';
        rankingList.innerHTML = html;
    }

    document.getElementById('rankingScreen').classList.remove('hidden');
}

// 초기화 및 이벤트 바인딩
document.addEventListener('DOMContentLoaded', async () => {
    restoreGameData();
    checkLocalAuth();

    // 모드 토글
    const loginModeBtn = document.getElementById('loginModeBtn');
    const signupModeBtn = document.getElementById('signupModeBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    loginModeBtn.addEventListener('click', () => {
        loginModeBtn.classList.add('active');
        signupModeBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    signupModeBtn.addEventListener('click', () => {
        signupModeBtn.classList.add('active');
        loginModeBtn.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // 로그인 이벤트
    document.getElementById('loginSubmitBtn').addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        login(email, password);
    });

    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            login(email, password);
        }
    });

    // 회원가입 이벤트
    document.getElementById('signupSubmitBtn').addEventListener('click', () => {
        const email = document.getElementById('signupEmail').value.trim();
        const nickname = document.getElementById('signupNickname').value.trim();
        const password = document.getElementById('signupPassword').value.trim();
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value.trim();
        signup(email, nickname, password, passwordConfirm);
    });

    document.getElementById('signupPasswordConfirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const email = document.getElementById('signupEmail').value.trim();
            const nickname = document.getElementById('signupNickname').value.trim();
            const password = document.getElementById('signupPassword').value.trim();
            const passwordConfirm = document.getElementById('signupPasswordConfirm').value.trim();
            signup(email, nickname, password, passwordConfirm);
        }
    });

    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 랭킹 보기 버튼
    document.getElementById('viewRankingBtn').addEventListener('click', showRankingScreen);

    // 랭킹 닫기 버튼
    document.getElementById('closeRankingBtn').addEventListener('click', closeRankingScreen);
});
