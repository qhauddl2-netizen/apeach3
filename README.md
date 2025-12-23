# 어피치 마리오 게임

슈퍼 마리오 스타일의 웹 게임입니다.

## 시작하기

### 권장 방법 (서버 사용 - data.json에 저장)

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **서버 시작**
   ```bash
   node server.js
   ```

3. **브라우저에서 접속**
   - http://localhost:3000 으로 접속하세요

모든 데이터는 `data.json` 파일과 브라우저의 localStorage에 저장됩니다!

### 간단한 방법 (서버 없이 - localStorage만 사용)

1. `index.html` 파일을 브라우저로 드래그 앤 드롭하거나
2. Live Server (VSCode 확장) 등을 사용하여 실행하세요

**주의**: 서버 없이 실행하면 서버 연결 오류가 표시되며, localStorage에만 데이터가 저장됩니다.

## 게임 방법

### 로그인
- 닉네임과 4자리 숫자 비밀번호를 입력하세요
- 신규 사용자는 자동으로 회원가입됩니다
- 로그인 정보는 브라우저에 저장됩니다

### 조작법
- **← →** : 좌우 이동
- **SPACE** : 점프

### 게임 규칙
- **복숭아** 수집: 10점
- **코인** 수집: 100점 (10% 확률로 출현)
- **적 제거**: 100점 (위에서 점프로 밟기)
- **생명**: 3개 (적과 충돌하면 감소)
- 모든 아이템을 수집하면 새로운 아이템이 랜덤 위치에 생성됩니다

### 점수 및 랭킹
- 게임 오버 시 자동으로 점수가 저장됩니다
- 상위 5명의 랭킹이 표시됩니다
- 전체 랭킹 버튼으로 상위 50명의 랭킹을 확인할 수 있습니다

## 필요한 이미지 파일

`img/` 폴더에 다음 이미지들을 배치해주세요:

- `me.png` - 기본 캐릭터
- `me_left.png` - 왼쪽 이동 캐릭터
- `me_right.png` - 오른쪽 이동 캐릭터
- `me_eat.png` - 먹는 동작 캐릭터
- `coin.png` - 코인
- `peach.png` - 복숭아
- `pang.png` - 적

## 파일 구조

```
mario/
├── index.html          # 메인 HTML
├── style.css           # 스타일시트
├── game.js             # 게임 로직
├── auth.js             # 인증 및 사용자 관리
├── server.js           # Node.js 백엔드 서버
├── package.json        # 패키지 설정
├── data.json           # 사용자 및 점수 데이터 (자동 생성)
└── img/                # 이미지 폴더
    ├── me.png
    ├── me_left.png
    ├── me_right.png
    ├── me_eat.png
    ├── coin.png
    ├── peach.png
    └── pang.png
```

## 데이터 저장

### 서버 사용 시 (권장)
- 모든 사용자 정보와 점수는 **data.json 파일**에 저장됩니다
- 로그인 시: 닉네임과 비밀번호를 data.json에서 확인
- 회원가입 시: 새 사용자를 data.json에 추가
- 게임 종료 시: 점수를 해당 닉네임으로 data.json에 저장
- localStorage에도 백업으로 저장됩니다

### 서버 미사용 시
- 브라우저의 **localStorage**에만 저장됩니다
- 서버 연결 오류 메시지가 표시될 수 있습니다

### 저장되는 데이터
- **사용자 정보**: 닉네임, 비밀번호
- **점수 기록**: 닉네임별 모든 게임 점수
- **랭킹**: 자동으로 계산되어 표시됩니다

### data.json 구조
```javascript
{
  "users": [
    {
      "nickname": "플레이어1",
      "password": "1234"
    }
  ],
  "scores": [
    {
      "nickname": "플레이어1",
      "score": 1500,
      "date": "2025-12-23T..."
    }
  ]
}
```

### 데이터 초기화
- 서버 사용 시: `data.json` 파일을 삭제하거나 내용을 `{"users":[], "scores":[]}` 로 변경
- localStorage: 브라우저 개발자 도구 > Application > Local Storage에서 데이터 삭제
