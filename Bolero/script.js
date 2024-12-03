document.addEventListener('DOMContentLoaded', function() {
    // 캔버스 설정
    const drawingCanvas = document.getElementById('drawingArea');
    const drawingCtx = drawingCanvas.getContext('2d');
    const animationCanvas = document.getElementById('animationArea');
    const animationCtx = animationCanvas.getContext('2d');

    // 변수 초기화
    let isDrawing = false;
    let startX, startY, currentX, currentY;
    let currentShape = 'rectangle';
    let animatedShapes = [];
    let animationId = null;

    // 캔근 도형들을 저장할 배열
    let recentShapes = [];
    const MAX_SHAPES = 3; // 최대 저장할 도형 개수

    // 캔버스 크기 설정
    function resizeCanvas() {
        drawingCanvas.width = drawingCanvas.clientWidth;
        drawingCanvas.height = drawingCanvas.clientHeight;
        animationCanvas.width = animationCanvas.clientWidth;
        animationCanvas.height = animationCanvas.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
// HTML에 안내 메시지를 위한 div 추가
const rightPanel = document.getElementById('rightPanel');
const guideMessage = document.createElement('div');
guideMessage.id = 'guide-message';
guideMessage.innerHTML = `
  <h2 style="font-family: 'Diphylleia-Regular', serif; font-size: 2.5vw; margin-bottom: 3vw; font-weight: bold; text-align: center;color: #A87569;">곡 감상방법</h2>
  <p style="font-family: 'Pretendard', sans-serif; font-size: 1.1vw; line-height: 1.5;text-align: center;color: #A87569;">왼쪽 화면 하단의 원하는 도형 버튼을 눌러 자유롭게 도형을 그려보세요.<br>당신이 그린 도형이 음악에 맞춰 패턴을 만들거에요.</p>
`;
guideMessage.style.position = 'absolute';
guideMessage.style.top = '20px';
guideMessage.style.right = '16vw';
guideMessage.style.zIndex = '1000';
rightPanel.appendChild(guideMessage);

// 도형이 그려질 때 안내 메시지 숨기기
drawingCanvas.addEventListener('mousedown', function() {
  guideMessage.style.display = 'none';
});

// 페이지 로드 시 안내 메시지 표시
window.addEventListener('load', function() {
  if (recentShapes.length === 0) {
    guideMessage.style.display = 'block';
  } else {
    guideMessage.style.display = 'none';
  }
});
    // 마우스 이벤트 리스너
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseout', stopDrawing);

    function getMousePos(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const rect = drawingCanvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        currentX = startX;
        currentY = startY;
    }

    function draw(e) {
        if (!isDrawing) return;
        const rect = drawingCanvas.getBoundingClientRect();
        currentX = e.clientX - rect.left;
        currentY = e.clientY - rect.top;
        redrawShapes();
    }

    function drawShape(ctx, startX, startY, endX, endY, shapeType = currentShape) {
        ctx.beginPath();
        ctx.fillStyle = '#A87569';
    
        switch(shapeType) {
            case 'rectangle':
                ctx.rect(startX, startY, endX - startX, endY - startY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                break;
            case 'triangle':
                ctx.moveTo(startX, endY);
                ctx.lineTo(startX + (endX - startX) / 2, startY);
                ctx.lineTo(endX, endY);
                ctx.closePath();
                break;
        }
    
        ctx.fill();
    }

    // 왼쪽 캔버스에서 그린 도형의 정보를 저장할 배열
    let drawnShapes = [];

    // 도형을 그릴 때 정보 저장
    function addShape(startX, startY, endX, endY, type) {
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        const ratio = height / width;
        
        drawnShapes.push({
            type: type,
            width: width,
            height: height,
            ratio: ratio
        });
    }

    // 마우스로 그릴 때 도형의 크기를 저장
    let lastDrawnShape = {
        width: 0,
        height: 0,
        type: 'rectangle'
    };

    // 마우스 업 이벤트에서 도형 크기 저장
    function handleMouseUp(e) {
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        lastDrawnShape = {
            width: width,
            height: height,
            type: currentShape
        };
    }

    // 전역 변수로 회재 속도와 시작 시간 관리
    let globalStartTime = null;
    let currentVelocity = {
        speed: 1,
        dx: 2,
        dy: 2
    };

    // 전역 속도 관리
    let globalSpeed = {
        current: 0.05,  // 초기 속도를 더 작게
        baseSpeed: 0.05,
        maxSpeed: 1.5   // 최대 속도도 조정
    };

    class AnimatedShape {
        constructor(canvas) {
            this.canvas = canvas;
            
            if (globalSpeed.lastUpdateTime === null) {
                globalSpeed.lastUpdateTime = audioContext.currentTime;
            }
            
            // 기본 크기 설정
            this.baseSize = Math.min(canvas.width, canvas.height) * 0.002;
            this.minSize = this.baseSize * 0.05;
            this.maxSize = this.baseSize * 15;
            
            this.ratio = lastDrawnShape.height / lastDrawnShape.width;
            this.initializePosition();
            
            const direction = Math.random() > 0.5 ? 1 : -1;
            this.dx = globalSpeed.current * direction;
            this.dy = globalSpeed.current * direction;
            
            this.type = lastDrawnShape.type;
            this.currentSize = this.minSize;
        }

        initializePosition() {
            // 화면 중앙 좌표
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            // 초기 활동 영역을 화면 크기의 25%로 제한 (절반의 절반)
            const initialRadius = Math.min(this.canvas.width, this.canvas.height) * 0.125;
            const angle = Math.random() * Math.PI * 2;
            
            // 중앙을 기준으로 한 초기 위치 설정
            this.x = centerX + Math.cos(angle) * (Math.random() * initialRadius);
            this.y = centerY + Math.sin(angle) * (Math.random() * initialRadius);
        }

        update() {
            if (!animationStarted) return;
            
            const currentTime = audioContext.currentTime - globalSpeed.lastUpdateTime;
            
            // 활동 영역 계산 (20초에 걸쳐 점진적으로 확장)
            const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.5;
            let currentRadius;
            
            if (currentTime < 20) {
                // 시작은 25%에서 시작해서 100%까지 점진적으로 확장
                const expansionProgress = Math.pow(currentTime / 20, 2);
                currentRadius = maxRadius * (0.25 + (0.75 * expansionProgress));
            } else {
                currentRadius = maxRadius;
            }
            
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            // 현재 중앙으로부터의 거리 계산
            const distanceFromCenter = Math.sqrt(
                Math.pow(this.x - centerX, 2) + 
                Math.pow(this.y - centerY, 2)
            );
            
            // 경계를 벗어나면 방향 전환
            if (distanceFromCenter > currentRadius) {
                // 중앙을 향하는 벡터 계산
                const angleToCenter = Math.atan2(centerY - this.y, centerX - this.x);
                this.dx = Math.cos(angleToCenter) * Math.abs(this.dx);
                this.dy = Math.sin(angleToCenter) * Math.abs(this.dy);
            }
            
            // 속도 업데이트
            if (currentTime < 20) {
                globalSpeed.current = globalSpeed.baseSpeed + 
                    ((globalSpeed.maxSpeed - globalSpeed.baseSpeed) * Math.pow(currentTime / 20, 2));
            }
            
            const currentDx = this.dx * globalSpeed.current;
            const currentDy = this.dy * globalSpeed.current;
            
            this.x += currentDx;
            this.y += currentDy;
        }

        updateSize() {
            // 오디오 데이터 가져오기
            analyser.getByteFrequencyData(dataArray);
            
            // 현재 볼륨 계산 (0~1 사이 값)
            const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            let volume = average / 255;
            
            const currentTime = audioContext.currentTime - globalSpeed.lastUpdateTime;
            
            // 시간에 따른 기본 크기 설정 (처음에는 매우 작게)
            let baseSize;
            if (currentTime < 20) {
                // 처음 20초 동안은 극도로 작은 크기로 시작
                baseSize = this.minSize + ((this.baseSize - this.minSize) * Math.pow(currentTime / 20, 2));
            } else {
                baseSize = this.baseSize;
            }
            
            // 볼륨에 따른 크기 변화를 더 극적으로
            volume = Math.pow(volume, 1.5); // 볼륨 반응성 조정
            const volumeScale = 0.1 + (volume * 3.0); // 볼륨에 따라 0.1배에서 3.1배까지 변화
            
            // 최종 크기 설정
            this.currentSize = baseSize * volumeScale;
            this.width = this.currentSize;
            this.height = this.currentSize * this.ratio;
        }

        draw(ctx) {
            // 크기 업데이트
            this.updateSize();
            
            ctx.beginPath();
            switch(this.type) {
                case 'rectangle':
                    ctx.rect(this.x, this.y, this.width, this.height);
                    break;
                case 'circle':
                    ctx.ellipse(
                        this.x + this.width/2,
                        this.y + this.height/2,
                        this.width/2,
                        this.height/2,
                        0, 0, Math.PI * 2
                    );
                    break;
                case 'triangle':
                    ctx.moveTo(this.x + this.width/2, this.y);
                    ctx.lineTo(this.x + this.width, this.y + this.height);
                    ctx.lineTo(this.x, this.y + this.height);
                    ctx.closePath();
                    break;
            }
            ctx.fill();
        }
    }
    // 애니메이션 업데이트
    function updateAnimation() {
        // drawnShapes 배열의 마지막 도형 정보를 사용하여 새로운 애니메이션 도형 생성
        if (drawnShapes.length > 0) {
            const lastShape = drawnShapes[drawnShapes.length - 1];
            const animatedShape = new AnimatedShape(animationCanvas);
            animatedShapes.push(animatedShape);
        }
    }

    // 배경 관리 클래스 수정
    class BackgroundManager {
        constructor(canvas) {
            this.canvas = canvas;
            this.currentColor = '#FFFFFF'; 
        }

        draw(ctx) {
            ctx.fillStyle = this.currentColor;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    let backgroundManager;

    function initAnimation() {
        if (!backgroundManager) {
            backgroundManager = new BackgroundManager(animationCanvas);
        }
        animate();
    }

    function animate() {
        if (!backgroundManager) {
            backgroundManager = new BackgroundManager(animationCanvas);
        }

        // 배경을 흰색으로 변경
        animationCtx.fillStyle = '#FFFFFF';
        animationCtx.fillRect(0, 0, animationCanvas.width, animationCanvas.height);

        // 그룹 업데이트 및 그리기
        shapeGroup.update();
        shapeGroup.draw(animationCtx);

        animationId = requestAnimationFrame(animate);
    }

    const music = document.getElementById('music');

    // 음악 재생 준비
    document.addEventListener('DOMContentLoaded', function() {
        music.load();
        music.volume = 0.5; // 볼륨 설정
    });

    // 전역 변수로 음악 재생 상태 추가
    let isMusicPlaying = false;

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
    
        const newShape = {
            type: currentShape,
            startX: startX,
            startY: startY,
            endX: currentX,
            endY: currentY
        };
    
        recentShapes.push(newShape);
        if (recentShapes.length > MAX_SHAPES) {
            recentShapes.shift();
        }
    
        if (!isMusicPlaying) {
            music.play().then(() => {
                isMusicPlaying = true;
            }).catch(error => {
                console.log("음악 재생 오류:", error);
            });
        }
    
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    
        shapeGroup = new RepeatingShapes(recentShapes, animationCanvas.width, animationCanvas.height);
        animate();
    }
    
    function redrawShapes() {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    
        recentShapes.forEach(shape => {
            drawShape(drawingCtx, shape.startX, shape.startY, shape.endX, shape.endY, shape.type);
        });
    
        if (isDrawing) {
            drawShape(drawingCtx, startX, startY, currentX, currentY);
        }
    }
    // 도구 설정
    const shapeButtons = document.querySelectorAll('.shape-btn');
    
    

    shapeButtons.forEach(button => {
        button.addEventListener('click', function() {
            shapeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentShape = this.dataset.shape;
        });
    });

    class RepeatingShapes {
        constructor(shapes, canvasWidth, canvasHeight) {
            this.shapes = shapes;
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
    
            // 각 도형의 비율 계산
            this.shapeRatios = shapes.map(shape => {
                const width = Math.abs(shape.endX - shape.startX);
                const height = Math.abs(shape.endY - shape.startY);
                return height / width;
            });
    
            this.columns = 5;
            this.rows = 5;
            this.spacing = canvasHeight / (this.rows + 1);
    
            this.movements = shapes.map(() => ({
                time: Math.random() * Math.PI * 2,
                speedX: 0.02 + Math.random() * 0.03,
                speedY: 0.02 + Math.random() * 0.03,
                amplitude: 50 + Math.random() * 200,
                rotationSpeed: 0.01 + Math.random() * 0.02
            }));
    
            this.baseScale = canvasHeight / 3;
    
            this.colorPalette = [
                '#008597', '#00A7C1', '#FF6E9C', '#5079C4', '#FFA556',
                '#2EDFD4', '#32BDFF', '#009B4B', '#00CBA8', '#09CF8C',
                '#55D6D8', '#6D95E8', '#6ED94A', '#855400', '#9E3D20',
                '#B37642', '#C55237', '#F29073', '#FF8756', '#FFAC47',
                '#FFEF0E', '#FFF065'
            ];
    
            this.shapeColors = shapes.map(() =>
                this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)]
            );
        }
    
        update() {
            this.movements.forEach(move => {
                move.time += move.speedX;
                move.rotationSpeed += 0.0001;
            });
        }
    
        draw(ctx) {
            const columnWidth = this.canvasWidth / this.columns;
    
            this.shapes.forEach((shape, shapeIndex) => {
                const ratio = this.shapeRatios[shapeIndex];
                const movement = this.movements[shapeIndex];
    
                for (let col = 0; col < this.columns; col++) {
                    for (let row = 0; row < this.rows; row++) {
                        ctx.save();
    
                        const x = columnWidth * (col + 0.5);
                        let y = this.spacing * (row + 1);
    
                        const time = movement.time;
                        const offsetX = Math.sin(time + row * 0.5) * movement.amplitude * 
                                      Math.cos(time * 0.7 + col * 0.3);
                        const offsetY = Math.cos(time + col * 0.5) * movement.amplitude * 
                                      Math.sin(time * 0.5 + row * 0.4);
    
                        const scale = 1 + Math.sin(time * 1.5 + row * 0.3 + col * 0.5) * 0.5 +
                                    Math.cos(time * 0.8 + col * 0.4 + row * 0.6) * 0.3;
    
                        const rotation = Math.sin(time * movement.rotationSpeed) * Math.PI;
    
                        ctx.translate(x + offsetX, y + offsetY);
                        ctx.rotate(rotation);
                        ctx.scale(scale, scale);
    
                        ctx.fillStyle = this.shapeColors[shapeIndex];
    
                        const size = this.baseScale * 0.3;
                        const width = size;
                        const height = size * ratio;  // 비율 적용
    
                        ctx.beginPath();
                        switch (shape.type) {
                            case 'rectangle':
                                ctx.rect(-width/2, -height/2, width, height);
                                break;
                            case 'circle':
                                ctx.ellipse(0, 0, width/2, height/2, 0, 0, Math.PI * 2);
                                break;
                            case 'triangle':
                                ctx.moveTo(0, -height/2);
                                ctx.lineTo(width/2, height/2);
                                ctx.lineTo(-width/2, height/2);
                                break;
                        }
    
                        ctx.fill();
                        ctx.restore();
                    }
                }
            });
        }
    }

    let shapeGroup;

    function animate() {
        // 배경을 색으로 변경
        animationCtx.fillStyle = '#FFFFFF';
        animationCtx.fillRect(0, 0, animationCanvas.width, animationCanvas.height);

        // 그룹 업데이트 및 그리기
        shapeGroup.update();
        shapeGroup.draw(animationCtx);

        animationId = requestAnimationFrame(animate);
    }

    class Shape {
        constructor(x, y, width, height, type, ratio) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height * ratio; // 높이에 비율 적용
            this.type = type;
            this.ratio = ratio; // 비율 저장
        }

        draw(ctx) {
            ctx.beginPath();
            if (this.type === 'rectangle') {
                ctx.rect(this.x, this.y, this.width, this.height);
            } else if (this.type === 'circle') {
                // 원의 경우 비율을 반영한 타원으로 그리기
                ctx.ellipse(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    this.width/2,
                    this.height/2,
                    0, 0, Math.PI * 2
                );
            } else if (this.type === 'triangle') {
                // 삼각형도 비율 반
                ctx.moveTo(this.x, this.y + this.height);
                ctx.lineTo(this.x + this.width/2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.closePath();
            }
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    // 도형 생성 시 원본 비율 유지
    function createShapeFromDrawing(drawnPoints, color) {
        // 중심점 계산
        let centerX = 0, centerY = 0;
        drawnPoints.forEach(point => {
            centerX += point.x;
            centerY += point.y;
        });
        centerX /= drawnPoints.length;
        centerY /= drawnPoints.length;

        // 중심점 기준으로 포인트 조정
        const centeredPoints = drawnPoints.map(point => ({
            x: point.x - centerX,
            y: point.y - centerY
        }));

        return new Shape(centeredPoints, color);
    }

    // 애니메이션 도형 생성 함수
    function createAnimatedShape(shapeData) {
        const baseSize = 50; // 기본 크기
        const scaledWidth = baseSize;
        const scaledHeight = baseSize * shapeData.ratio; // 비율 유지
        
        const shape = {
            x: Math.random() * (animationCanvas.width - scaledWidth),
            y: Math.random() * (animationCanvas.height - scaledHeight),
            width: scaledWidth,
            height: scaledHeight,
            type: shapeData.type,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4
        };
        
        animatedShapes.push(shape);
    }

    // 애니메이션 그리기 함수
    function drawAnimatedShape(ctx, shape) {
        ctx.beginPath();
        switch(shape.type) {
            case 'rectangle':
                ctx.rect(shape.x, shape.y, shape.width, shape.height);
                break;
            case 'circle':
                ctx.ellipse(
                    shape.x + shape.width/2,
                    shape.y + shape.height/2,
                    shape.width/2,
                    shape.height/2,
                    0, 0, Math.PI * 2
                );
                break;
            case 'triangle':
                const centerX = shape.x + shape.width/2;
                ctx.moveTo(centerX, shape.y);
                ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
                ctx.lineTo(shape.x, shape.y + shape.height);
                break;
        }
        ctx.fill();
    }

    // 애니메이션 업데이트 함수
    function updateAnimatedShapes() {
        animatedShapes.forEach(shape => {
            // 벽과 충돌 체크
            if (shape.x + shape.width > animationCanvas.width || shape.x < 0) {
                shape.dx *= -1;
            }
            if (shape.y + shape.height > animationCanvas.height || shape.y < 0) {
                shape.dy *= -1;
            }
            
            shape.x += shape.dx;
            shape.y += shape.dy;
        });
    }

    // 오디오 데이터 처리를 위한 유틸리티 래스
    class AudioAnalyzer {
        constructor(audioContext, audioElement) {
            this.analyser = audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            const source = audioContext.createMediaElementSource(audioElement);
            source.connect(this.analyser);
            this.analyser.connect(audioContext.destination);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }

        getAverageVolume() {
            this.analyser.getByteFrequencyData(this.dataArray);
            const average = this.dataArray.reduce((acc, val) => acc + val, 0) / this.dataArray.length;
            return average / 255; // 0~1 사이 값으로 정규화
        }
    }

    // 핸드 트래킹 설정
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // 비오 요소 생성
    const video = document.createElement('video');
    video.style.display = 'none';
    document.body.appendChild(video);

    // 카메라 설정
    const camera = new Camera(video, {
        onFrame: async () => {
            await hands.send({image: video});
        },
        width: 1280,
        height: 720
    });

    // 손 움직임 감지 처리
    hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const hand = results.multiHandLandmarks[0];
            const palmPosition = hand[0]; // 손바닥 중심점
            
            // SVG 요소들 움직이기
            const x = palmPosition.x * window.innerWidth;
            const y = palmPosition.y * window.innerHeight;
            
            moveElements(x, y);
            playMusic();
        }
    });

    // 카메라 시작
    camera.start();

    // SVG 요소들을 움직이는 함수
    function moveElements(x, y) {
        // 기존 마우스 이벤트 핸들러의 로직을 여기로 이동
        // ... SVG 움직임 관련 코드 ...
    }

    // 음악 재생 함수
    function playMusic() {
        // ... 음악 재생 관련 코드 ...
    }

    // 오디오 컨텍스트 설정 개선
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024; // 더 세밀한 주파수 분석
    analyser.smoothingTimeConstant = 0.5; // 반응성 증가를 위해 스무딩 감소

    // 오디오 소스 연결
    const audio = document.getElementById('audio');
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // 오디오 시작 시 컨텍스트 시작
    audio.addEventListener('play', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });

    // 오디오 재생 시작 함수 수정
    function startAudio() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // 현재 오디오 시간을 0으로 설정
        audio.currentTime = 0;
        
        // 3초 후에 재생 시작
        setTimeout(() => {
            audio.play();
            globalStartTime = audioContext.currentTime;
            // 애니메이션 시작
            requestAnimationFrame(animate);
        }, 3000);
    }

    // 재생 버튼 클릭 이벤트나 초기 재생 시작 시
    playButton.addEventListener('click', () => {
        startAudio();
    });

    // 도형 개수 관리를 위한 전역 변수
    let minShapes = 3;  // 최소 도형 개수
    let maxShapes = 20; // 최대 도형 개수
    let currentShapes = [];

    class ShapeManager {
        constructor(canvas) {
            this.canvas = canvas;
            this.shapes = [];
            this.lastShapeCount = 0;
        }

        updateShapes() {
            analyser.getByteFrequencyData(dataArray);
            
            // 볼륨 계산
            const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
            let volume = average / 255;
            
            // 볼륨에 따른 도형 개수 계산
            const targetShapeCount = Math.floor(minShapes + (maxShapes - minShapes) * volume);
            
            // 현재 시간 계산
            const currentTime = audioContext.currentTime - globalStartTime;
            
            // 처음 10초 동안은 도형 개수 제한
            let actualTargetCount = targetShapeCount;
            if (currentTime < 10) {
                actualTargetCount = Math.min(targetShapeCount, minShapes + 2);
            }

            // 도형 개수 조정
            if (this.shapes.length < actualTargetCount) {
                // 도형 추가
                while (this.shapes.length < actualTargetCount) {
                    const shape = new AnimatedShape(this.canvas);
                    this.shapes.push(shape);
                }
            } else if (this.shapes.length > actualTargetCount) {
                // 도형 제거
                this.shapes = this.shapes.slice(0, actualTargetCount);
            }

            // 각 도형 업데이트
            this.shapes.forEach(shape => {
                shape.update();
                shape.updateSize();
            });
        }

        draw(ctx) {
            this.shapes.forEach(shape => shape.draw(ctx));
        }
    }

    // 메인 애니메이션 
}); 