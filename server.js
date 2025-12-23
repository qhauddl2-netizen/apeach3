const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'data.json');

// 데이터 파일 초기화
function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            users: [],
            scores: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

// 데이터 읽기
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('데이터 읽기 오류:', error);
        return { users: [], scores: [] };
    }
}

// 데이터 쓰기
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('데이터 쓰기 오류:', error);
        return false;
    }
}

// 로그인 API
app.post('/login', (req, res) => {
    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ message: '닉네임과 비밀번호를 입력해주세요.' });
    }

    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
        return res.status(400).json({ message: '비밀번호는 4자리 숫자여야 합니다.' });
    }

    const data = readData();
    const existingUser = data.users.find(u => u.nickname === nickname);

    if (existingUser) {
        // 기존 사용자 - 비밀번호 확인
        if (existingUser.password === password) {
            res.json({ message: '로그인 성공!', nickname });
        } else {
            res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        }
    } else {
        // 신규 사용자 - 회원가입
        data.users.push({ nickname, password });
        if (writeData(data)) {
            res.json({ message: '회원가입 및 로그인 성공!', nickname });
        } else {
            res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    }
});

// 점수 저장 API
app.post('/save-score', (req, res) => {
    const { nickname, password, score } = req.body;

    if (!nickname || !password || score === undefined) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    }

    const data = readData();
    const user = data.users.find(u => u.nickname === nickname && u.password === password);

    if (!user) {
        return res.status(401).json({ message: '인증 실패' });
    }

    // 점수 저장
    data.scores.push({
        nickname,
        score,
        date: new Date().toISOString()
    });

    if (writeData(data)) {
        res.json({ message: '점수가 저장되었습니다.', score });
    } else {
        res.status(500).json({ message: '점수 저장에 실패했습니다.' });
    }
});

// 랭킹 조회 API
app.get('/rankings', (req, res) => {
    const data = readData();

    // 사용자별 최고 점수만 추출
    const userBestScores = {};
    data.scores.forEach(scoreEntry => {
        if (!userBestScores[scoreEntry.nickname] ||
            userBestScores[scoreEntry.nickname].score < scoreEntry.score) {
            userBestScores[scoreEntry.nickname] = scoreEntry;
        }
    });

    // 배열로 변환 후 점수 내림차순 정렬
    const rankings = Object.values(userBestScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50); // 상위 50명만

    res.json({ rankings });
});

// 서버 시작
initDataFile();
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행중입니다.`);
});
