const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game variables
let score = 0;
let coins = 0;
let lives = 3;
let gameRunning = true;
let gamePaused = false;
let keys = {};

// 이전 프레임의 키 상태 (2단 점프를 위해 점프 키를 누른 순간만 감지)
let prevKeys = {};

// 아래 버튼 누름 지속 시간 관리
let downButtonTimer = 0;

// Player images
const playerImages = {
    idle: new Image(),
    left: new Image(),
    right: new Image(),
    eat: new Image()
};

playerImages.idle.src = 'img/me.png';
playerImages.left.src = 'img/me_left.png';
playerImages.right.src = 'img/me_right.png';
playerImages.eat.src = 'img/me_eat.png';

// Coin and enemy images
const coinImage = new Image();
coinImage.src = 'img/coin.png';

const peachImage = new Image();
peachImage.src = 'img/peach.png';

const enemyImage = new Image();
enemyImage.src = 'img/pang.png';

let imagesLoaded = 0;
const totalImages = 7;

// Load all images before starting
const allImages = [...Object.values(playerImages), coinImage, peachImage, enemyImage];
allImages.forEach(img => {
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            gameLoop();
        }
    };
    img.onerror = () => {
        console.warn('이미지를 불러올 수 없습니다. 기본 모양으로 표시됩니다.');
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            gameLoop();
        }
    };
});

// Player object
// 모바일 디바이스 감지
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 window.innerWidth <= 768;

// 모바일에서는 속도를 1/3로 감소
const speedMultiplier = isMobile ? 0.5 : 1.0;

const player = {
    x: 100,
    y: 400,
    width: 64,
    height: 64,
    velocityX: 0,
    velocityY: 0,
    speed: 5 * speedMultiplier,
    jumpPower: 10,
    onGround: false,
    direction: 0,
    currentImage: 'idle',
    isEating: false,
    eatingTimer: 0,
    isHit: false,
    hitTimer: 0,
    invincible: false,
    invincibleTimer: 0,
    jumpsRemaining: 3  // 3단 점프를 위한 점프 횟수
};

// Gravity
const gravity = 0.6;
const maxFallSpeed = 15;

// Enemy spawning
let enemySpawnTimer = 0;
let enemySpawnInterval = 600; // 10초마다 (60fps 기준)

// Ground platforms
const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#8b6d4d' },
    { x: 200, y: 450, width: 150, height: 20, color: '#d2691e' },
    { x: 450, y: 350, width: 150, height: 20, color: '#d2691e' },
    { x: 100, y: 300, width: 100, height: 20, color: '#d2691e' },
    { x: 600, y: 400, width: 150, height: 20, color: '#d2691e' }
];

// Function to create random collectible
function createCollectible() {
    const isCoin = Math.random() < 0.1; // 10% chance for coin
    return {
        x: Math.random() * (canvas.width - 100) + 50,
        y: Math.random() * (canvas.height - 200) + 100,
        collected: false,
        type: isCoin ? 'coin' : 'peach',
        points: isCoin ? 100 : 10
    };
}

// Collectibles (coins and peaches)
const collectibles = [];
for (let i = 0; i < 8; i++) {
    collectibles.push(createCollectible());
}

// Enemies
const enemies = [
    { x: 300, y: 520, width: 40, height: 40, velocityX: 2 * speedMultiplier, direction: 1, velocityY: 0, isFlying: false },
    { x: 500, y: 320, width: 40, height: 40, velocityX: 1.5 * speedMultiplier, direction: 1, velocityY: 1, isFlying: true },
    { x: 150, y: 200, width: 40, height: 40, velocityX: 2.5 * speedMultiplier, direction: 1, velocityY: -1, isFlying: true },
    { x: 650, y: 520, width: 40, height: 40, velocityX: 1.8 * speedMultiplier, direction: -1, velocityY: 0, isFlying: false },
    { x: 400, y: 250, width: 40, height: 40, velocityX: 2.2 * speedMultiplier, direction: 1, velocityY: 0.5, isFlying: true },
    { x: 200, y: 520, width: 40, height: 40, velocityX: 1.9 * speedMultiplier, direction: 1, velocityY: 0, isFlying: false },
    { x: 550, y: 150, width: 40, height: 40, velocityX: 2.1 * speedMultiplier, direction: -1, velocityY: -0.5, isFlying: true },
    { x: 700, y: 520, width: 40, height: 40, velocityX: 1.7 * speedMultiplier, direction: -1, velocityY: 0, isFlying: false }
];

// Stars
const stars = [
    { x: Math.random() * 600 + 100, y: Math.random() * 300 + 100, collected: false }
];

// Hearts (생명 회복 아이템)
const hearts = [
    { x: Math.random() * 600 + 100, y: Math.random() * 300 + 100, collected: false }
];

// Keyboard events
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // 아래 방향키를 누르면 타이머 설정
    if (e.code === 'ArrowDown') {
        downButtonTimer = 30; // 0.5초 (60fps 기준)
    }
});

document.addEventListener('keyup', (e) => {
    // 아래 방향키는 즉시 해제하지 않고 타이머가 관리
    if (e.code !== 'ArrowDown') {
        keys[e.code] = false;
    }
});

// Mobile touch controls
function setupMobileControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const downBtn = document.getElementById('downBtn');
    const jumpBtn = document.getElementById('jumpBtn');

    // 왼쪽 버튼
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['ArrowLeft'] = true;
    });
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['ArrowLeft'] = false;
    });

    // 오른쪽 버튼
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['ArrowRight'] = true;
    });
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['ArrowRight'] = false;
    });

    // 아래 버튼 - 짧게 눌러도 일정 시간 동안 유지
    downBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['ArrowDown'] = true;
        downButtonTimer = 30; // 0.5초 (60fps 기준)
    });
    downBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        // touchend 시에는 즉시 해제하지 않고 타이머가 관리
    });

    // 점프 버튼
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Space'] = true;
    });
    jumpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Space'] = false;
    });

    // 마우스 클릭도 지원 (데스크톱에서 테스트용)
    leftBtn.addEventListener('mousedown', () => keys['ArrowLeft'] = true);
    leftBtn.addEventListener('mouseup', () => keys['ArrowLeft'] = false);

    rightBtn.addEventListener('mousedown', () => keys['ArrowRight'] = true);
    rightBtn.addEventListener('mouseup', () => keys['ArrowRight'] = false);

    downBtn.addEventListener('mousedown', () => {
        keys['ArrowDown'] = true;
        downButtonTimer = 30; // 0.5초 (60fps 기준)
    });
    downBtn.addEventListener('mouseup', () => {
        // mouseup 시에는 즉시 해제하지 않고 타이머가 관리
    });

    jumpBtn.addEventListener('mousedown', () => keys['Space'] = true);
    jumpBtn.addEventListener('mouseup', () => keys['Space'] = false);
}

// 페이지 로드 시 모바일 컨트롤 설정
setupMobileControls();

// Restart button
document.getElementById('restartBtn').addEventListener('click', () => {
    location.reload();
});

// Close game over button
document.getElementById('closeGameOverBtn').addEventListener('click', () => {
    document.querySelector('.game-over').classList.add('hidden');
    gameRunning = true;
});

// Update player
function updatePlayer() {
    // Update hit timer - 피격 중에는 아래로 떨어지기만 함
    if (player.isHit) {
        player.hitTimer--;
        if (player.hitTimer <= 0) {
            player.isHit = false;
            // 피격 후 무적 시간 시작 (생명이 남아있을 때만)
            if (lives > 0) {
                player.invincible = true;
                player.invincibleTimer = 120; // 2초 무적
            }
        }
        // 피격 중에는 중력만 적용
        player.velocityY += gravity;
        if (player.velocityY > maxFallSpeed) {
            player.velocityY = maxFallSpeed;
        }
        player.y += player.velocityY;

        // 생명이 0이면 좌우 이동 불가
        if (lives <= 0) {
            player.velocityX = 0;
        }

        return; // 피격 중에는 조작 불가
    }

    // Update invincible timer
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.invincible = false;
        }
    }

    // Update eating timer
    if (player.isEating) {
        player.eatingTimer--;
        if (player.eatingTimer <= 0) {
            player.isEating = false;
        }
    }

    // Horizontal movement
    if (keys['ArrowLeft']) {
        player.velocityX = -player.speed;
        player.direction = -1;
        if (!player.isEating) {
            player.currentImage = 'left';
        }
    } else if (keys['ArrowRight']) {
        player.velocityX = player.speed;
        player.direction = 1;
        if (!player.isEating) {
            player.currentImage = 'right';
        }
    } else {
        player.velocityX = 0;
        if (!player.isEating) {
            player.currentImage = 'idle';
        }
    }

    // Jump (2단 점프 지원) - Space 키를 새로 누른 순간만 점프
    if (keys['Space'] && !prevKeys['Space'] && player.jumpsRemaining > 0) {
        player.velocityY = -player.jumpPower;
        player.onGround = false;
        player.jumpsRemaining--;
    }

    // Apply gravity
    player.velocityY += gravity;
    if (player.velocityY > maxFallSpeed) {
        player.velocityY = maxFallSpeed;
    }

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Boundary check
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Check if fell off screen
    if (player.y > canvas.height) {
        loseLife();
    }
}

// Check collisions with platforms
function checkPlatformCollisions() {
    player.onGround = false;

    platforms.forEach(platform => {
        // 아래 방향키를 누르고 있으면 플랫폼 통과 (바닥 제외)
        const isPressingDown = keys['ArrowDown'];
        const isGroundPlatform = platform.y >= 500; // 바닥 플랫폼은 통과 불가

        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + 20 &&
            player.velocityY >= 0) {

            // 아래 방향키를 누르고 있고 바닥이 아니면 통과
            if (isPressingDown && !isGroundPlatform) {
                return; // 플랫폼 통과
            }

            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
            player.jumpsRemaining = 3;  // 착지시 점프 횟수 초기화 (3단 점프)
        }
    });
}

// Spawn new enemy
function spawnEnemy() {
    const spawnX = Math.random() > 0.5 ? canvas.width : 0;
    const isFlying = Math.random() > 0.4; // 60% 확률로 날아다니는 적

    let spawnY;
    let velocityY = 0;

    if (isFlying) {
        // 하늘에서 날아다니는 적
        spawnY = Math.random() * 300 + 100; // 100~400 높이
        velocityY = (Math.random() - 0.5) * 2; // 위아래로 움직임
    } else {
        // 바닥에서 걷는 적
        spawnY = 520;
    }

    const newEnemy = {
        x: spawnX,
        y: spawnY,
        width: 40,
        height: 40,
        velocityX: (2 + Math.random() * 2) * speedMultiplier,
        velocityY: velocityY,
        direction: spawnX === 0 ? 1 : -1,
        isFlying: isFlying,
        initialY: spawnY
    };
    enemies.push(newEnemy);
}

// Update enemies
function updateEnemies() {
    // Spawn timer
    enemySpawnTimer++;
    if (enemySpawnTimer >= enemySpawnInterval) {
        spawnEnemy();
        enemySpawnTimer = 0;
        // 시간이 지날수록 더 자주 생성 (최소 30프레임까지)
        if (enemySpawnInterval > 30) {
            enemySpawnInterval -= 3;
        }
    }

    // Remove off-screen enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].x < -200 || enemies[i].x > canvas.width + 200) {
            enemies.splice(i, 1);
        }
    }

    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];

        // 좌우 이동
        enemy.x += enemy.velocityX * enemy.direction;

        // 날아다니는 적은 위아래로도 이동
        if (enemy.isFlying) {
            enemy.y += enemy.velocityY;

            // 위아래 범위 제한 (100~450)
            if (enemy.y < 100 || enemy.y > 450) {
                enemy.velocityY *= -1;
            }

            // 가끔 방향 변경
            if (Math.random() < 0.01) {
                enemy.velocityY = (Math.random() - 0.5) * 3;
            }
        }

        // Bounce off edges
        if (enemy.x <= 0) {
            enemy.x = 0; // 왼쪽 경계에 위치 고정
            enemy.direction *= -1;
        } else if (enemy.x + enemy.width >= canvas.width) {
            enemy.x = canvas.width - enemy.width; // 오른쪽 경계에 위치 고정
            enemy.direction *= -1;
        }

        // Check collision with player (무적 시간이 아닐 때만)
        if (!player.invincible && !player.isHit &&
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {

            // Check if player jumped on enemy
            // 플레이어의 하단 1/2 영역이 적의 상단에 닿으면 적을 제거
            const playerBottomHalf = player.y + player.height / 2;
            const enemyTopHalf = enemy.y + enemy.height / 2;

            // 플레이어가 위에서 아래로 내려오는 중이고,
            // 플레이어의 하단 1/2 영역이 적의 상단 영역에 있으면 밟기 성공
            if (player.velocityY > 0 && playerBottomHalf < enemyTopHalf) {
                enemy.x = -1000; // Remove enemy
                score += 100;
                player.velocityY = -10; // Bounce
                // 5초 후에 새로운 적 생성
                setTimeout(() => {
                    if (gameRunning) { // 게임이 실행 중일 때만 생성
                        spawnEnemy();
                    }
                }, 10000);
                break; // 적을 밟았으면 더 이상 충돌 체크 안함
            } else {
                loseLife();
                break; // 피격당했으면 더 이상 충돌 체크 안함
            }
        }
    }
}

// Collect collectibles (coins and peaches)
function collectCollectibles() {
    let allCollected = true;

    collectibles.forEach(item => {
        if (!item.collected) {
            allCollected = false;

            if (player.x < item.x + 30 &&
                player.x + player.width > item.x &&
                player.y < item.y + 30 &&
                player.y + player.height > item.y) {

                item.collected = true;
                score += item.points;

                if (item.type === 'coin') {
                    coins++;
                }

                // Trigger eating animation
                player.isEating = true;
                player.eatingTimer = 20;
                player.currentImage = 'eat';
            }
        }
    });

    // Respawn all collectibles if all are collected
    if (allCollected) {
        collectibles.length = 0;
        for (let i = 0; i < 8; i++) {
            collectibles.push(createCollectible());
        }

        // 30% 확률로 새로운 별 생성
        if (Math.random() < 0.3) {
            stars.push({
                x: Math.random() * 600 + 100,
                y: Math.random() * 300 + 100,
                collected: false
            });
        }

        // 30% 확률로 새로운 하트 생성
        if (Math.random() < 0.3) {
            hearts.push({
                x: Math.random() * 600 + 100,
                y: Math.random() * 300 + 100,
                collected: false
            });
        }
    }
}

// Collect stars
function collectStars() {
    stars.forEach(star => {
        if (!star.collected &&
            player.x < star.x + 25 &&
            player.x + player.width > star.x &&
            player.y < star.y + 25 &&
            player.y + player.height > star.y) {

            star.collected = true;
            score += 500;
        }
    });
}

// Collect hearts
function collectHearts() {
    hearts.forEach(heart => {
        if (!heart.collected &&
            player.x < heart.x + 30 &&
            player.x + player.width > heart.x &&
            player.y < heart.y + 30 &&
            player.y + player.height > heart.y) {

            heart.collected = true;
            lives++; // 생명 +1
            updateScoreDisplay();
        }
    });
}

// Lose a life
function loseLife() {
    // 피격 모션 시작 - 바닥으로 떨어지게
    player.isHit = true;
    player.hitTimer = 90; // 1.5초 피격 모션
    player.velocityX = 0;
    player.velocityY = -5; // 살짝 위로 튕김

    lives--;
    updateScoreDisplay();

    if (lives <= 0) {
        // 게임 오버 시 딜레이 추가
        setTimeout(() => {
            gameOver();
        }, 2000); // 2초 후 게임 오버
    } else {
        // 피격 후 1.5초 뒤 위치 리셋
        setTimeout(() => {
            resetPlayerPosition();
        }, 1500);
    }
}

// Reset player position
function resetPlayerPosition() {
    player.x = 100;
    player.y = 400;
    player.velocityX = 0;
    player.velocityY = 0;
}

// Game over
async function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;

    // 점수 저장
    if (typeof saveScore === 'function') {
        try {
            await saveScore(score);
            console.log('점수 저장 성공:', score);

            // 랭킹 표시
            try {
                const rankings = await getRankings();
                displayRankingPreview(rankings);
            } catch (rankingErr) {
                console.error('랭킹 조회 오류:', rankingErr);
                document.getElementById('rankingDisplay').innerHTML = '<p>랭킹을 불러올 수 없습니다.</p>';
            }
        } catch (saveErr) {
            console.error('점수 저장 오류:', saveErr);
            alert('점수 저장 실패: ' + (saveErr.message || saveErr));
        }
    }

    document.querySelector('.game-over').classList.remove('hidden');
}

// 랭킹 미리보기 표시
function displayRankingPreview(rankings) {
    const rankingDisplay = document.getElementById('rankingDisplay');

    if (!rankings || rankings.length === 0) {
        rankingDisplay.innerHTML = '<p>랭킹 정보를 불러올 수 없습니다.</p>';
        return;
    }

    // 현재 사용자의 순위 찾기
    let userRank = -1;
    if (currentUser) {
        userRank = rankings.findIndex(r => r.nickname === currentUser.nickname) + 1;
    }

    let html = '<h3>상위 랭킹</h3><table class="ranking-table"><thead><tr><th>순위</th><th>닉네임</th><th>점수</th></tr></thead><tbody>';

    // 상위 5명만 표시
    const topRankings = rankings.slice(0, 5);
    topRankings.forEach((item, index) => {
        const isCurrentUser = currentUser && item.nickname === currentUser.nickname;
        const rowClass = isCurrentUser ? 'current-user' : '';
        html += `<tr class="${rowClass}">
            <td>${index + 1}</td>
            <td>${item.nickname}</td>
            <td>${item.score}</td>
        </tr>`;
    });

    html += '</tbody></table>';

    if (userRank > 0) {
        html += `<p style="margin-top: 10px; color: #ffd700;">당신의 순위: ${userRank}위</p>`;
    }

    rankingDisplay.innerHTML = html;
}

// Draw player
function drawPlayer() {
    const currentImg = playerImages[player.currentImage];

    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;

    // 무적 상태일 때 깜빡임 효과
    if (player.invincible && Math.floor(player.invincibleTimer / 10) % 2 === 0) {
        return; // 깜빡임 효과
    }

    // 피격 상태일 때는 회전하면서 떨어지는 효과
    if (player.isHit) {
        ctx.save();
        // 회전 중심을 캐릭터 중앙으로 이동
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        // 타이머에 따라 회전 (계속 회전)
        const rotationAngle = (90 - player.hitTimer) * 0.1;
        ctx.rotate(rotationAngle);

        // 이미지 그리기 (중앙 기준)
        if (currentImg && currentImg.complete && currentImg.naturalHeight !== 0) {
            ctx.drawImage(currentImg, -player.width / 2, -player.height / 2, player.width, player.height);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        }
        ctx.restore();
        return;
    }

    // Draw image if loaded, otherwise draw rectangle
    if (currentImg && currentImg.complete && currentImg.naturalHeight !== 0) {
        ctx.drawImage(currentImg, player.x, player.y, player.width, player.height);
    } else {
        // Fallback to rectangle if image not loaded
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // Draw simple face
        ctx.fillStyle = '#fff';
        const faceOffset = player.direction > 0 ? 16 : 8;
        ctx.fillRect(player.x + faceOffset, player.y + 16, 12, 12);
        ctx.fillRect(player.x + faceOffset + 20, player.y + 16, 12, 12);
    }
}

// Draw platforms
function drawPlatforms() {
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

        // Add brick pattern
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        const brickWidth = 30;
        const numBricks = Math.ceil(platform.width / brickWidth);

        for (let i = 0; i < numBricks; i++) {
            const x = platform.x + (i * brickWidth);
            const width = Math.min(brickWidth, platform.x + platform.width - x);
            ctx.strokeRect(x, platform.y, width, platform.height);
        }
    });
}

// Draw collectibles
function drawCollectibles() {
    collectibles.forEach(item => {
        if (!item.collected) {
            if (item.type === 'coin') {
                if (coinImage && coinImage.complete && coinImage.naturalHeight !== 0) {
                    ctx.drawImage(coinImage, item.x, item.y, 30, 30);
                } else {
                    // Fallback to circle if image not loaded
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(item.x + 15, item.y + 15, 12, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Peach
                if (peachImage && peachImage.complete && peachImage.naturalHeight !== 0) {
                    ctx.drawImage(peachImage, item.x, item.y, 30, 30);
                } else {
                    // Fallback to pink circle
                    ctx.fillStyle = '#ffb6c1';
                    ctx.beginPath();
                    ctx.arc(item.x + 15, item.y + 15, 12, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    });
}

// Draw stars
function drawStars() {
    stars.forEach(star => {
        if (!star.collected) {
            // 별 이모지로 그리기
            ctx.font = '40px Arial';
            ctx.fillText('🌟', star.x, star.y + 30);
        }
    });
}

// Draw hearts
function drawHearts() {
    hearts.forEach(heart => {
        if (!heart.collected) {
            // 하트 이모지로 그리기
            ctx.font = '40px Arial';
            ctx.fillText('♥️', heart.x, heart.y + 30);
        }
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.x > -100) {
            if (enemyImage && enemyImage.complete && enemyImage.naturalHeight !== 0) {
                ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                // Fallback to rectangle if image not loaded
                ctx.fillStyle = '#8b0000';
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

                // Eyes
                ctx.fillStyle = '#fff';
                ctx.fillRect(enemy.x + 5, enemy.y + 8, 8, 8);
                ctx.fillRect(enemy.x + 17, enemy.y + 8, 8, 8);

                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 7, enemy.y + 10, 4, 4);
                ctx.fillRect(enemy.x + 19, enemy.y + 10, 4, 4);
            }
        }
    });
}

// Draw clouds
function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    // Cloud 1
    ctx.beginPath();
    ctx.arc(100, 80, 20, 0, Math.PI * 2);
    ctx.arc(130, 80, 25, 0, Math.PI * 2);
    ctx.arc(155, 80, 20, 0, Math.PI * 2);
    ctx.fill();

    // Cloud 2
    ctx.beginPath();
    ctx.arc(400, 120, 20, 0, Math.PI * 2);
    ctx.arc(430, 120, 25, 0, Math.PI * 2);
    ctx.arc(455, 120, 20, 0, Math.PI * 2);
    ctx.fill();

    // Cloud 3
    ctx.beginPath();
    ctx.arc(650, 90, 20, 0, Math.PI * 2);
    ctx.arc(680, 90, 25, 0, Math.PI * 2);
    ctx.arc(705, 90, 20, 0, Math.PI * 2);
    ctx.fill();
}

// Update score display
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('coins').textContent = coins;
    document.getElementById('lives').textContent = lives;
}

// Main game loop
function gameLoop() {
    if (!gameRunning) return;

    // Clear canvas
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background elements
    drawClouds();

    // Update game objects only if not paused
    if (!gamePaused) {
        // 아래 버튼 타이머 관리
        if (downButtonTimer > 0) {
            downButtonTimer--;
            keys['ArrowDown'] = true;
        } else {
            // 키보드로 직접 누르고 있지 않으면 해제
            if (!keys['ArrowDown'] || downButtonTimer === 0) {
                keys['ArrowDown'] = false;
            }
        }

        updatePlayer();
        checkPlatformCollisions();
        updateEnemies();
        collectCollectibles();
        collectStars();
        collectHearts();
    }

    // Draw game objects
    drawPlatforms();
    drawCollectibles();
    drawStars();
    drawHearts();
    drawEnemies();
    drawPlayer();

    // 생명이 0이면 화면을 어둡게 처리
    if (lives <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Update UI
    updateScoreDisplay();

    // 현재 키 상태를 이전 프레임으로 업데이트
    prevKeys = { ...keys };

    requestAnimationFrame(gameLoop);
}

// Note: gameLoop will be started automatically when all images are loaded
