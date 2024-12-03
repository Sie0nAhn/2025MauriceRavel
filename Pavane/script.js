let audio;
let isPlaying = false;

// 오디오 관련 변수 추가
let isAudioInitialized = false;
let lastPlaybackRate = 1;

// 속도 관련 변수 추가
const MIN_PLAYBACK_RATE = 0.5;    // 최소 재생 속도를 더 느리게 (0.8 → 0.5)
const NORMAL_PLAYBACK_RATE = 1.0;
const MAX_PLAYBACK_RATE = 2.5;
const SPEED_SENSITIVITY = 0.15;    // 속도 감도 약간 증가

// 속도 관련 상수 추가/수정
const SPEED_CONSTANTS = {
    MIN_SPEED: 0.01,
    MAX_SPEED: 2.0,
    ANIMATION_SPEED_MIN: 0.0008,   // 최소 속도 감소 (0.002 → 0.0008)
    ANIMATION_SPEED_MAX: 0.008,    // 최대 속도는 유지
    SLOW_MOTION_THRESHOLD: 0.1     // 느린 움직임 감지 임계값 추가
};

// 악기 설정 함수
function setupInstruments() {
    const container = document.getElementById('container');
    container.innerHTML = '';
    
    const instruments = {
        row3: ['1violons', '2violons', 'flute', 'oboe'],
        row2: ['her', 'horns', 'viola', 'clarinettes'],
        row1: ['doublebass', 'cello', 'bassoon']
    };
    
    // 화면을 더 넓게 사용
    const gridWidth = window.innerWidth * 1;  // 80% → 90%
    const gridHeight = window.innerHeight * 0.8; // 80% → 90%
    
    const startX = window.innerWidth * 0.05;  // 10% → 5%
    const startY = window.innerHeight * 0.05; // 10% → 5%
    
    let instrumentIndex = 0;
    
    for (const [rowId, instrumentList] of Object.entries(instruments)) {
        instrumentList.forEach(instrumentName => {
            const div = document.createElement('div');
            div.className = 'instrument';
            
            // 더 넓은 범위의 랜덤 위치 설정
            const randomX = startX + Math.random() * gridWidth;
            const randomY = startY + Math.random() * gridHeight;
            
            div.style.left = `${randomX}px`;
            div.style.top = `${randomY}px`;
            
            // 초기 중앙 위치 저장 (나중에 돌아올 위치)
            div.dataset.centerX = `${window.innerWidth / 2}px`;
            div.dataset.centerY = `${window.innerHeight / 2}px`;
            
            const img = document.createElement('img');
            img.src = `${instrumentName}.svg`;
            img.alt = instrumentName;
            
            div.appendChild(img);
            container.appendChild(div);
            instrumentIndex++;
        });
    }
}

// 기존의 canvas와 ctx 변수명을 변경
let trailCanvas;
let trailCtx;

function setupCanvas() {
    trailCanvas = document.createElement('canvas');
    trailCanvas.style.position = 'fixed';
    trailCanvas.style.top = '0';
    trailCanvas.style.left = '0';
    trailCanvas.style.pointerEvents = 'none'; // 마우스 이벤트 무시
    trailCanvas.style.zIndex = '999'; // 기보다 위, 제목보다 아래
    
    // 캔버스 크기를 화면 크기로 설정
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
    
    trailCtx = trailCanvas.getContext('2d');
    document.body.appendChild(trailCanvas);
}

// 점들을 저장할 배열
let points = [];
const POINT_LIFETIME = 1000; // 점이 화면에 표시되는 시간 (밀리초)
const POINT_SIZE = 10; // 점 크기

let lastMouseX = 0;
let lastMouseY = 0;
let lastMouseTime = Date.now();

// 시작 버튼 클릭 이벤트
document.getElementById('startButton').addEventListener('click', () => {
    try {
        // 오디오 초기화
        audio = new Audio('Pavane.mp3');
        audio.loop = true;
        
        // UI 설정
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('container').style.display = 'flex';
        
        setupInstruments();
        setupCanvas();
        
        // 크롬의 자동재생 정책을 위한 처리
        audio.play().then(() => {
            audio.volume = 0;
            console.log('Audio ready');
        }).catch(error => {
            console.error('Audio play failed:', error);
        });
        
    } catch (error) {
        console.error('Setup failed:', error);
    }
});

// 마우스 움직임 감지
let mouseTimer;
document.addEventListener('mousemove', (e) => {
    if (!audio) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastMouseTime;
    
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 마우스 속도 계산 (픽셀/밀리초)
    const speed = distance / deltaTime;
    
    // 속도 임계값 조정 - 더 빠른 움직임이 필요하도록
    let playbackRate;
    if (speed < 0.3) {  // 느린 속도 임계값 증가 (기존 0.1)
        playbackRate = 0.3;  // 최소 속도
    } else if (speed > 2.5) {  // 빠른 속도 임계값 증가 (기존 1)
        // 최대 속도에 도달하는 데 더 빠른 움직임 필요
        playbackRate = Math.min(2.5, 1 + (speed - 2.5) * 0.3);  // 속도 증가 계수 감소
    } else {
        // 중간 속도 범위 조정
        playbackRate = 0.3 + (speed - 0.3) * 0.4;  // 더 점진적인 속도 증가
    }
    
    audio.playbackRate = playbackRate;
    
    // 현재 위치와 시간 저장
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMouseTime = currentTime;
    
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
    
    // 새로운 점 추가
    points.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
    });
    
    clearTimeout(mouseTimer);
    showMessage(false);
    
    // 음악 재생 확실히 하기
    if (audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Playback failed:', error);
            });
        }
    }
    
    // 볼륨 증가
    audio.volume = 1;
    
    if (!isPlaying) {
        isPlaying = true;
        animate();
    }
    
    mouseTimer = setTimeout(() => {
        audio.volume = 0.1;
        showMessage(true);
    }, 100);
});

// 애니메이션 상수 추가
const ANIMATION_CONSTANTS = {
    MOVE_RANGE: {
        X: window.innerWidth * 0.35,
        Y: window.innerHeight * 0.35
    },
    MOUSE_INTERACTION: {
        RANGE: 300,
        REPEL_STRENGTH: 0.8
    },
    IDLE_TIMEOUT: 100,
    VOLUME_FADE_SPEED: 0.02
};

// 마우스/손 움직임 관련 변수
let lastMovementTime = Date.now();
let isIdle = false;

function animate() {
    if (!isPlaying) return;
    
    const instruments = document.querySelectorAll('.instrument');
    const currentTime = Date.now();
    
    // 현재 움직임 속도 계산
    const deltaTime = currentTime - lastMouseTime;
    const deltaX = (window.mouseX || handX) - lastMouseX;
    const deltaY = (window.mouseY || handY) - lastMouseY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const currentSpeed = Math.min(SPEED_CONSTANTS.MAX_SPEED, 
                                Math.max(SPEED_CONSTANTS.MIN_SPEED, 
                                distance / deltaTime));

    // 속도에 따른 애니메이션 속도 계산 (느린 움직임에 더 민감하게)
    let speedRatio;
    if (currentSpeed < SPEED_CONSTANTS.SLOW_MOTION_THRESHOLD) {
        // 느린 움직임일 때 더 세밀한 속도 조절
        speedRatio = (currentSpeed - SPEED_CONSTANTS.MIN_SPEED) / 
                    (SPEED_CONSTANTS.SLOW_MOTION_THRESHOLD - SPEED_CONSTANTS.MIN_SPEED) * 0.3;
    } else {
        // 빠른 움직임은 기존대로 처리
        speedRatio = 0.3 + ((currentSpeed - SPEED_CONSTANTS.SLOW_MOTION_THRESHOLD) / 
                    (SPEED_CONSTANTS.MAX_SPEED - SPEED_CONSTANTS.SLOW_MOTION_THRESHOLD)) * 0.7;
    }

    const animationSpeed = SPEED_CONSTANTS.ANIMATION_SPEED_MIN + 
                          (SPEED_CONSTANTS.ANIMATION_SPEED_MAX - SPEED_CONSTANTS.ANIMATION_SPEED_MIN) * 
                          speedRatio;

    // 시간 계산에 속도 반영
    const time = currentTime * animationSpeed;

    // 움직임이 없는지 체크
    if (currentTime - lastMovementTime > ANIMATION_CONSTANTS.IDLE_TIMEOUT && !isIdle) {
        isIdle = true;
        if (audio) {
            const fadeOutInterval = setInterval(() => {
                if (audio.volume > 0.1) {
                    audio.volume = Math.max(0.1, audio.volume - ANIMATION_CONSTANTS.VOLUME_FADE_SPEED);
                } else {
                    clearInterval(fadeOutInterval);
                }
            }, 50);
        }
    }

    instruments.forEach((instrument, index) => {
        const baseX = parseFloat(instrument.style.left);
        const baseY = parseFloat(instrument.style.top);
        
        let newX = baseX;
        let newY = baseY;
        
        if (!isIdle) {
            // 속직임 범위 조절
            const moveRangeX = ANIMATION_CONSTANTS.MOVE_RANGE.X * audio.volume * (1.2 + speedRatio); // 범위 증가
            const moveRangeY = ANIMATION_CONSTANTS.MOVE_RANGE.Y * audio.volume * (1.2 + speedRatio);
            
            // 개별 악기의 움직임 계산 (주파수 증가)
            const individualTime = time + (index * 0.3); // 0.5 → 0.3으로 감소하여 더 빠른 움직임
            newX += Math.sin(individualTime * (0.8 + index * 0.1)) * moveRangeX; // 주파수 증가
            newY += Math.sin(individualTime * (0.9 + index * 0.1)) * moveRangeY;
            
            // 마우스/손 상호작용
            if (window.mouseX && window.mouseY || (handX && handY)) {
                const interactionX = window.mouseX || handX;
                const interactionY = window.mouseY || handY;
                const dx = interactionX - newX;
                const dy = interactionY - newY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ANIMATION_CONSTANTS.MOUSE_INTERACTION.RANGE) {
                    const force = (1 - distance / ANIMATION_CONSTANTS.MOUSE_INTERACTION.RANGE) * 
                                ANIMATION_CONSTANTS.MOUSE_INTERACTION.REPEL_STRENGTH * 
                                (1 + speedRatio); // 속도에 따른 힘 조절
                    newX -= (dx / distance) * force * moveRangeX;
                    newY -= (dy / distance) * force * moveRangeY;
                }
            }
        }

        // 부드러운 움직임 적용 (반���성 증가)
        if (!instrument.currentX) instrument.currentX = newX;
        if (!instrument.currentY) instrument.currentY = newY;
        
        // 더 빠른 반응을 위해 smoothing 값 증가
        const smoothing = isIdle ? 0.05 : Math.min(0.5, 0.2 + speedRatio * 0.3);
        instrument.currentX += (newX - instrument.currentX) * smoothing;
        instrument.currentY += (newY - instrument.currentY) * smoothing;
        
        // 회전과 크기 애니메이션도 속도에 따라 조절
        const rotation = isIdle ? 0 : Math.sin(time + index) * 20 * audio.volume * (1 + speedRatio * 0.5);
        const scale = isIdle ? 1 : 0.8 + Math.sin(time * 0.5) * 0.2 * audio.volume * (1 + speedRatio * 0.3);
        
        // 변환 적용
        instrument.style.transform = `
            translate(${instrument.currentX - baseX}px, ${instrument.currentY - baseY}px)
            rotate(${rotation}deg)
            scale(${scale})
        `;
    });

    drawPoints();
    requestAnimationFrame(animate);
}

// 마우스/손 움직임 감지 함수
function updateMovement(x, y) {
    lastMovementTime = Date.now();
    if (isIdle) {
        isIdle = false;
        if (audio) {
            // 볼륨 서서히 증가
            const fadeInInterval = setInterval(() => {
                if (audio.volume < 1) {
                    audio.volume = Math.min(1, audio.volume + ANIMATION_CONSTANTS.VOLUME_FADE_SPEED);
                } else {
                    clearInterval(fadeInInterval);
                }
            }, 50);
        }
    }
    
    window.mouseX = x;
    window.mouseY = y;
}

// 마우스 이벤트에 updateMovement 적용
document.addEventListener('mousemove', (e) => {
    updateMovement(e.clientX, e.clientY);
});

function showMessage(show) {
    const message = document.getElementById('message');
    if (message) {
        message.textContent = "손이나 마우스를 움직여 지휘를 계속해주세요!";
        message.style.opacity = show ? '1' : '0';
    }
}

// 페이지 클릭 시 오디오 재생 시도
document.addEventListener('click', () => {
    if (audio && audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Click play failed:', error);
            });
        }
    }
});

// CSS 스타일 업데이트
const style = document.createElement('style');
style.textContent = `
    .instrument {
        position: absolute;
        width: 250px;  // 180px에서 250px로 증가
        height: 250px; // 180px에서 250px로 증가
        transform-origin: center center;
        will-change: transform;
        transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .instrument img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// 점 그기 함수
function drawPoints() {
    if (!trailCtx) return;
    
    const currentTime = Date.now();
    
    // 캔버스 클리어
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    
    // 오래된 점들 제거
    points = points.filter(point => currentTime - point.timestamp < POINT_LIFETIME);
    
    // 점들 그리기
    points.forEach(point => {
        const age = currentTime - point.timestamp;
        const opacity = 1 - (age / POINT_LIFETIME); // 시간이 지날수록 투명짐
        
        trailCtx.beginPath();
        trailCtx.arc(point.x, point.y, POINT_SIZE, 0, Math.PI * 4);
        trailCtx.fillStyle = `rgba(126, 206, 244, ${opacity})`; // #7ECEF4 with opacity
        trailCtx.fill();
    });
    
    requestAnimationFrame(drawPoints);
}

// 화면 크기 변경 시 캔버스 크기 조정
window.addEventListener('resize', () => {
    if (trailCanvas) {
        trailCanvas.width = window.innerWidth;
        trailCanvas.height = window.innerHeight;
    }
});

let handX = 0;
let handY = 0;
let isHandVisible = false;

// MediaPipe Hands 설정
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 부드러운 움직임을 위한 변수
let smoothHandX = 0;
let smoothHandY = 0;
const smoothingFactor = 0.3;

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.2, // 감도 증가
    minTrackingConfidence: 0.2   // 감도 증가
});

// 카메라 초기화 함수 수정
let isCameraInitialized = false;

async function initCamera() {
    if (isCameraInitialized) return;  // 이미 초기화됐으면 중복 실행 방지
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();
        
        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 1280,
            height: 720
        });
        camera.start();
        isCameraInitialized = true;
    } catch (error) {
        console.error('Camera initialization failed:', error);
    }
}

function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        const rawHandX = (1 - hand[8].x) * window.innerWidth;
        const rawHandY = hand[8].y * window.innerHeight;
        
        smoothHandX = smoothHandX * (1 - smoothingFactor) + rawHandX * smoothingFactor;
        smoothHandY = smoothHandY * (1 - smoothingFactor) + rawHandY * smoothingFactor;
        
        handX = smoothHandX;
        handY = smoothHandY;
        isHandVisible = true;
        
        // 속 움직임을 마우스 움직임과 동일하게 처리
        updateMovement(handX, handY);
        
        // 속도 계산 개선
        const currentTime = Date.now();
        const deltaTime = Math.max(1, currentTime - lastMouseTime);
        const deltaX = handX - lastMouseX;
        const deltaY = handY - lastMouseY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const speed = distance / deltaTime * SPEED_SENSITIVITY;

        // 속도에 따른 재생 속도 계산
        let targetPlaybackRate;
        if (speed < 0.05) {
            targetPlaybackRate = MIN_PLAYBACK_RATE;
        } else if (speed < 0.15) {
            targetPlaybackRate = MIN_PLAYBACK_RATE + 
                ((speed - 0.05) / 0.1) * (NORMAL_PLAYBACK_RATE - MIN_PLAYBACK_RATE);
        } else if (speed > 0.4) {
            targetPlaybackRate = Math.min(MAX_PLAYBACK_RATE, 
                NORMAL_PLAYBACK_RATE + (speed - 0.4) * 8);
        } else {
            targetPlaybackRate = NORMAL_PLAYBACK_RATE + 
                (speed - 0.15) * 1.2;
        }

        lastPlaybackRate = lastPlaybackRate * 0.8 + targetPlaybackRate * 0.2;

        if (audio) {
            if (!isAudioInitialized) {
                audio.play().then(() => {
                    isAudioInitialized = true;
                    audio.volume = 1;
                }).catch(error => {
                    console.log('Audio playback failed:', error);
                });
            }

            audio.playbackRate = lastPlaybackRate;
            audio.volume = 1;
        }

        lastHandDetectionTime = currentTime;
        lastMouseX = handX;
        lastMouseY = handY;
        lastMouseTime = currentTime;

        showMessage(false);

        points.push({
            x: handX,
            y: handY,
            timestamp: Date.now(),
            speed: speed
        });

        if (!isPlaying) {
            isPlaying = true;
            animate();
        }
    } else {
        const currentTime = Date.now();
        if (currentTime - lastHandDetectionTime > 1000) {
            isHandVisible = false;
            if (audio) {
                audio.volume = Math.max(0.1, audio.volume - 0.02);
            }
            showMessage(true);
        }
    }
}

hands.onResults(onResults);
initCamera();

// SVG 이미지 움직임 관련 변수
const images = document.querySelectorAll('.floating-image');
let imagePositions = Array.from(images).map(() => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: 0,
    vy: 0,
    currentX: 0,
    currentY: 0
}));

function updateImagePositions() {
    const dampingFactor = 0.95;  // 감쇠 계수
    const repulsionRadius = 300; // 밀어내는 힘의 반경
    const repulsionForce = 20;   // 밀어내는 힘의 강도
    
    images.forEach((img, index) => {
        const pos = imagePositions[index];
        
        if (isHandVisible || isPlaying) {
            // 손/마우스와의 거리 계산
            const dx = (handX || lastMouseX) - pos.x;
            const dy = (handY || lastMouseY) - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < repulsionRadius) {
                // 반대 방향으로 힘을 가함
                const angle = Math.atan2(dy, dx);
                pos.vx -= Math.cos(angle) * repulsionForce;
                pos.vy -= Math.sin(angle) * repulsionForce;
            }
            
            // 화면 중앙에서 멀어지는 힘 추가
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const dxCenter = centerX - pos.x;
            const dyCenter = centerY - pos.y;
            const centerDistance = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
            
            if (centerDistance < repulsionRadius) {
                const angle = Math.atan2(dyCenter, dxCenter);
                pos.vx -= Math.cos(angle) * repulsionForce * 0.5;
                pos.vy -= Math.sin(angle) * repulsionForce * 0.5;
            }
        }
        
        // 속도 감쇠
        pos.vx *= dampingFactor;
        pos.vy *= dampingFactor;
        
        // 위치 업데이트
        pos.x += pos.vx;
        pos.y += pos.vy;
        
        // 화면 경계 처리
        const margin = 90;
        if (pos.x < margin) pos.vx += 2;
        if (pos.x > window.innerWidth - margin) pos.vx -= 2;
        if (pos.y < margin) pos.vy += 2;
        if (pos.y > window.innerHeight - margin) pos.vy -= 2;
        
        // 부드러운 움직임 적용
        pos.currentX += (pos.x - pos.currentX) * 0.1;
    });
}

// 음악 재생 함수
function playMusic() {
    // 기존 음악 재생 로직을 그대로 사용
    // 필요한 경우 손 위치에 따라 음량이나 효과를 조절할 수 있습니다
}

// 페이지 로드 시 오디오 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (audio) {
        // 오디 버퍼링 설정
        audio.preload = 'auto';
        audio.load();
        
        // 오디오 컨텍스트 생성
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audio);
        const gainNode = audioContext.createGain();
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
    }
});

// 손 인식 상태 추적을 위한 변수
let lastHandDetectionTime = Date.now();

// 이미지 움직임 관련 변수 추가
const BASE_AMPLITUDE = window.innerWidth * 0.4;  // 화면 너비의 40%로 움직임 범위 설정



// 이미지 움직임 관련 상수
const X_AMPLITUDE = window.innerWidth * 0.8;
const Y_AMPLITUDE = window.innerHeight * 0.7;
let currentSpeed = 1.0;

// 각 이미지의 현재 위치와 목표 위치를 저장할 배열
const imageStates = [];

function initializeImageStates() {
    images.forEach((_, index) => {
        imageStates[index] = {
            currentX: 0,
            currentY: 0,
            velocityX: 0,
            velocityY: 0
        };
    });
}

function updateImages() {
    const currentTime = Date.now();
    const time = currentTime * 0.00001 * currentSpeed;
    
    // 이미지 최소 크기를 300px로 증가
    const imageSize = 300;
    // 여백을 더 크게 설정하여 화면 밖으로 나가지 않도록 함
    const safeMargin = imageSize * 5;
    
    // 실제 움직임 가능 영역 계산
    const maxX = window.innerWidth - safeMargin;
    const maxY = window.innerHeight - safeMargin;
    
    // 움직임 범위를 더 제한하여 화면 중앙 부근에서만 움직이도록 함
    const X_AMPLITUDE = window.innerWidth * 0.4;
    const Y_AMPLITUDE = window.innerHeight * 0.3;
    
    images.forEach((image, index) => {
        const state = imageStates[index];
        
        const angle1 = time * (0.5 + index * 0.05);
        const angle2 = time * (0.1 + index * 0.002);
        
        // 중앙 기준 움직임 계산
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // 움직임 범위를 더 제한
        const rawX = Math.sin(angle1) * X_AMPLITUDE * 0.2;
        const rawY = Math.cos(angle2) * Y_AMPLITUDE * 0.2;
        
        // 최종 위치 계산 시 엄격한 경계 확인
        const targetX = Math.max(safeMargin, 
            Math.min(maxX - safeMargin, centerX + rawX));
        const targetY = Math.max(safeMargin, 
            Math.min(maxY - safeMargin, centerY + rawY));
        
        // 부드러운 움직임 적용
        state.velocityX = (targetX - state.currentX) * 0.05;
        state.velocityY = (targetY - state.currentY) * 0.05;
        
        state.currentX += state.velocityX;
        state.currentY += state.velocityY;
        
        // 최종 위치 적용
        image.style.transform = `translate(${state.currentX}px, ${state.currentY}px)`;
    });
    
    requestAnimationFrame(updateImages);
}
// 초기화
initializeImageStates();
updateImages();

// 창 크기 변경 시 진폭 업데이트
window.addEventListener('resize', () => {
    X_AMPLITUDE = window.innerWidth * 0.8;
    Y_AMPLITUDE = window.innerHeight * 0.7;
});

