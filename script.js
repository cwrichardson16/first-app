class CyberRunner {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.startButton = document.getElementById('startButton');
        this.gameOverDiv = document.getElementById('gameOver');
        this.restartButton = document.getElementById('restartButton');
        this.finalScoreElement = document.getElementById('finalScore');
        
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.highScore = localStorage.getItem('cyberRunnerHighScore') || 0;
        this.highScoreElement.textContent = this.highScore;
        
        this.gameSpeed = 6;
        this.gravity = 0.6;
        this.jumpPower = -12;
        
        this.initPlayer();
        this.initObstacles();
        this.initBackground();
        
        this.bindEvents();
        this.gameLoop();
    }
    
    initPlayer() {
        this.player = {
            x: 100,
            y: 300,
            width: 40,
            height: 40,
            velocityY: 0,
            isJumping: false,
            color: '#ff0080',
            trailColor: '#00ff88',
            animationFrame: 0,
            runAnimation: 0,
            scarfFlow: 0
        };
        this.playerTrail = [];
    }
    
    initObstacles() {
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 80;
    }
    
    initBackground() {
        this.backgroundStars = [];
        for (let i = 0; i < 80; i++) {
            this.backgroundStars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 0.5,
                speed: Math.random() * 1.2 + 0.2,
                color: ['#00ff88', '#00ccff', '#ff0080', '#ffff00', '#9966ff'][Math.floor(Math.random() * 5)],
                twinkle: Math.random() * Math.PI * 2,
                layer: Math.random() < 0.3 ? 'front' : 'back'
            });
        }
        
        // Add floating particles
        this.particles = [];
        this.particleTimer = 0;
        
        this.groundY = this.canvas.height - 50;
        this.player.y = this.groundY - this.player.height;
    }
    
    bindEvents() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.restartGame());
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.jump();
                } else if (this.gameState === 'menu') {
                    this.startGame();
                }
            }
        });
        
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.jump();
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.gameSpeed = 6;
        this.initPlayer();
        this.initObstacles();
        this.startButton.style.display = 'none';
        this.gameOverDiv.classList.remove('show');
    }
    
    restartGame() {
        this.startGame();
    }
    
    jump() {
        if (!this.player.isJumping) {
            this.player.velocityY = this.jumpPower;
            this.player.isJumping = true;
        }
    }
    
    updatePlayer() {
        // Apply gravity
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        // Ground collision
        if (this.player.y >= this.groundY - this.player.height) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.isJumping = false;
        }
        
        // Update animations
        this.player.animationFrame += 0.2;
        this.player.runAnimation += 0.3;
        this.player.scarfFlow += 0.15;
        
        // Update trail with more variety
        this.playerTrail.push({
            x: this.player.x + this.player.width / 2 + Math.sin(this.player.scarfFlow) * 3,
            y: this.player.y + this.player.height / 2 + Math.cos(this.player.animationFrame) * 2,
            life: 25,
            size: Math.random() * 4 + 2
        });
        
        this.playerTrail = this.playerTrail.filter(trail => {
            trail.life--;
            return trail.life > 0;
        });
    }
    
    updateObstacles() {
        this.obstacleTimer++;
        
        // Spawn new obstacles
        if (this.obstacleTimer >= this.obstacleInterval) {
            const obstacleTypes = ['spikes', 'laser', 'drone'];
            const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            
            let obstacle = {
                x: this.canvas.width,
                type: type,
                animationFrame: 0
            };
            
            switch(type) {
                case 'spikes':
                    obstacle = {
                        ...obstacle,
                        y: this.groundY - 60,
                        width: 30,
                        height: 60,
                        color: '#ff0080',
                        glowColor: '#ff0080'
                    };
                    break;
                case 'laser':
                    obstacle = {
                        ...obstacle,
                        y: this.groundY - 80,
                        width: 8,
                        height: 80,
                        color: '#00ccff',
                        glowColor: '#00ccff'
                    };
                    break;
                case 'drone':
                    obstacle = {
                        ...obstacle,
                        y: this.groundY - 120,
                        width: 40,
                        height: 25,
                        color: '#ffff00',
                        glowColor: '#ffff00',
                        bobOffset: Math.random() * Math.PI * 2
                    };
                    break;
            }
            
            this.obstacles.push(obstacle);
            this.obstacleTimer = 0;
            
            // Gradually increase difficulty
            if (this.obstacleInterval > 40) {
                this.obstacleInterval -= 0.8;
            }
        }
        
        // Move and animate obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.x -= this.gameSpeed;
            obstacle.animationFrame += 0.2;
            
            // Drone hovering animation
            if (obstacle.type === 'drone') {
                obstacle.bobOffset += 0.1;
            }
        });
        
        // Remove off-screen obstacles and update score
        this.obstacles = this.obstacles.filter(obstacle => {
            if (obstacle.x + obstacle.width < 0) {
                this.score += 10;
                this.scoreElement.textContent = this.score;
                
                // Increase game speed
                if (this.score % 100 === 0) {
                    this.gameSpeed += 0.8;
                }
                return false;
            }
            return true;
        });
    }
    
    updateBackground() {
        // Update stars with twinkling
        this.backgroundStars.forEach(star => {
            star.x -= star.speed * (star.layer === 'front' ? 1.5 : 1);
            star.twinkle += 0.1;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        });
        
        // Add ambient particles
        this.particleTimer++;
        if (this.particleTimer % 20 === 0) {
            this.particles.push({
                x: this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: -Math.random() * 2 - 1,
                vy: Math.random() * 0.5 - 0.25,
                life: 100,
                color: ['#00ff88', '#00ccff', '#ff0080'][Math.floor(Math.random() * 3)],
                size: Math.random() * 2 + 0.5
            });
        }
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            return particle.life > 0 && particle.x > -10;
        });
    }
    
    checkCollisions() {
        const playerRect = {
            x: this.player.x + 5,
            y: this.player.y + 5,
            width: this.player.width - 10,
            height: this.player.height - 10
        };
        
        for (let obstacle of this.obstacles) {
            if (playerRect.x < obstacle.x + obstacle.width &&
                playerRect.x + playerRect.width > obstacle.x &&
                playerRect.y < obstacle.y + obstacle.height &&
                playerRect.y + playerRect.height > obstacle.y) {
                this.gameOver();
                return;
            }
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreElement.textContent = this.highScore;
            localStorage.setItem('cyberRunnerHighScore', this.highScore);
        }
        
        this.finalScoreElement.textContent = this.score;
        this.gameOverDiv.classList.add('show');
    }
    
    drawBackground() {
        // Clear canvas with enhanced gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(0.3, '#002244');
        gradient.addColorStop(0.7, '#003366');
        gradient.addColorStop(1, '#001144');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background layer stars
        this.backgroundStars.filter(star => star.layer === 'back').forEach(star => {
            const twinkleAlpha = (Math.sin(star.twinkle) + 1) * 0.4 + 0.2;
            this.ctx.fillStyle = star.color;
            this.ctx.globalAlpha = twinkleAlpha;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = star.color;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        
        // Draw ambient particles
        this.particles.forEach(particle => {
            const alpha = particle.life / 100;
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = alpha * 0.6;
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = particle.color;
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        
        // Draw ground with texture
        const groundGradient = this.ctx.createLinearGradient(0, this.groundY, 0, this.canvas.height);
        groundGradient.addColorStop(0, '#00ff88');
        groundGradient.addColorStop(0.3, '#00cc66');
        groundGradient.addColorStop(1, '#004422');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, this.groundY, this.canvas.width, this.canvas.height - this.groundY);
        
        // Ground circuit pattern
        this.ctx.strokeStyle = '#00aa55';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.canvas.width; i += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, this.groundY + 10);
            this.ctx.lineTo(i + 15, this.groundY + 10);
            this.ctx.lineTo(i + 15, this.groundY + 20);
            this.ctx.lineTo(i + 30, this.groundY + 20);
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1;
        
        // Ground glow effect
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ff88';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.canvas.width, this.groundY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        // Draw foreground layer stars
        this.backgroundStars.filter(star => star.layer === 'front').forEach(star => {
            const twinkleAlpha = (Math.sin(star.twinkle) + 1) * 0.3 + 0.7;
            this.ctx.fillStyle = star.color;
            this.ctx.globalAlpha = twinkleAlpha;
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = star.color;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
    }
    
    drawPlayer() {
        // Draw enhanced trail
        this.playerTrail.forEach((trail, index) => {
            const alpha = trail.life / 25;
            this.ctx.fillStyle = `rgba(0, 255, 136, ${alpha * 0.7})`;
            const size = alpha * trail.size;
            this.ctx.fillRect(trail.x - size/2, trail.y - size/2, size, size);
        });
        
        // Draw ninja character with enhanced details
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.height;
        
        // Animation offsets
        const bobOffset = Math.sin(this.player.runAnimation) * 1;
        const scarfSway = Math.sin(this.player.scarfFlow) * 2;
        
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#000066';
        
        // Ninja scarf/cape (flowing behind)
        this.ctx.fillStyle = '#ff0080';
        this.ctx.shadowColor = '#ff0080';
        this.ctx.shadowBlur = 8;
        this.ctx.fillRect(x - 5 + scarfSway, y + 8, 8, h - 10);
        this.ctx.fillRect(x - 8 + scarfSway, y + 12, 6, h - 15);
        
        // Ninja body (dark blue/black) with bob animation
        this.ctx.fillStyle = '#000066';
        this.ctx.shadowColor = '#000066';
        this.ctx.shadowBlur = 12;
        this.ctx.fillRect(x + 8, y + 12 + bobOffset, w - 16, h - 20);
        
        // Ninja head with subtle animation
        this.ctx.fillStyle = '#000033';
        this.ctx.fillRect(x + 10, y + 2 + bobOffset * 0.5, w - 20, 15);
        
        // Ninja mask/hood with depth
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 12, y + 4 + bobOffset * 0.5, w - 24, 8);
        this.ctx.fillRect(x + 11, y + 3 + bobOffset * 0.5, w - 22, 2); // Hood edge
        
        // Glowing eyes with blink effect
        const eyeGlow = Math.sin(this.player.animationFrame * 0.1) * 0.3 + 0.7;
        this.ctx.fillStyle = `rgba(0, 255, 136, ${eyeGlow})`;
        this.ctx.shadowColor = '#00ff88';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(x + 14, y + 6 + bobOffset * 0.5, 3, 2);
        this.ctx.fillRect(x + 23, y + 6 + bobOffset * 0.5, 3, 2);
        
        // Eye pupils for more detail
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 5;
        this.ctx.fillRect(x + 15, y + 6 + bobOffset * 0.5, 1, 1);
        this.ctx.fillRect(x + 24, y + 6 + bobOffset * 0.5, 1, 1);
        
        // Ninja belt with metallic shine
        this.ctx.fillStyle = '#ff0080';
        this.ctx.shadowColor = '#ff0080';
        this.ctx.shadowBlur = 5;
        this.ctx.fillRect(x + 6, y + 20 + bobOffset, w - 12, 3);
        
        // Belt buckle
        this.ctx.fillStyle = '#ffff00';
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 8;
        this.ctx.fillRect(x + w/2 - 2, y + 20 + bobOffset, 4, 3);
        
        // Arms/sleeves with running motion
        const armOffset = Math.sin(this.player.runAnimation + Math.PI) * 2;
        this.ctx.fillStyle = '#000066';
        this.ctx.shadowColor = '#000066';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(x + 2, y + 15 + bobOffset + armOffset, 8, 12);
        this.ctx.fillRect(x + w - 10, y + 15 + bobOffset - armOffset, 8, 12);
        
        // Hands with gloves
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 1, y + 25 + bobOffset + armOffset, 4, 4);
        this.ctx.fillRect(x + w - 9, y + 25 + bobOffset - armOffset, 4, 4);
        
        // Legs with running animation
        const legOffset = Math.sin(this.player.runAnimation) * 1.5;
        this.ctx.fillStyle = '#000066';
        this.ctx.fillRect(x + 10, y + h - 12 + legOffset, 6, 12);
        this.ctx.fillRect(x + w - 16, y + h - 12 - legOffset, 6, 12);
        
        // Ninja boots
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 9, y + h - 4 + legOffset, 8, 4);
        this.ctx.fillRect(x + w - 17, y + h - 4 - legOffset, 8, 4);
        
        // Ninja weapon (katana) on back
        this.ctx.fillStyle = '#444';
        this.ctx.shadowColor = '#666';
        this.ctx.shadowBlur = 5;
        this.ctx.fillRect(x + w - 6, y + 8 + bobOffset, 2, 18);
        
        // Katana handle
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x + w - 6, y + 22 + bobOffset, 2, 6);
        
        // Ninja stars (shuriken) effect when jumping
        if (this.player.isJumping) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.shadowColor = '#ffff00';
            this.ctx.shadowBlur = 12;
            
            // Multiple rotating shuriken around ninja
            for (let i = 0; i < 3; i++) {
                const angle = (Date.now() * 0.015) + (i * Math.PI * 2 / 3);
                const radius = 25;
                const starX = x + w/2 + Math.cos(angle) * radius;
                const starY = y + h/2 + Math.sin(angle) * radius;
                
                this.ctx.save();
                this.ctx.translate(starX, starY);
                this.ctx.rotate(Date.now() * 0.02);
                
                const starSize = 3;
                for (let j = 0; j < 4; j++) {
                    this.ctx.rotate(Math.PI / 2);
                    this.ctx.fillRect(-starSize/2, -starSize*2, starSize, starSize*4);
                    this.ctx.fillRect(-starSize*2, -starSize/2, starSize*4, starSize);
                }
                this.ctx.restore();
            }
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = obstacle.glowColor;
            
            switch(obstacle.type) {
                case 'spikes':
                    // Draw spike base
                    this.ctx.fillStyle = obstacle.color;
                    this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    
                    // Add animated spikes on top
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.shadowColor = '#ffff00';
                    this.ctx.shadowBlur = 10;
                    const spikeHeight = 15 + Math.sin(obstacle.animationFrame) * 3;
                    const spikeWidth = 10;
                    for (let i = 0; i < obstacle.width; i += spikeWidth) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(obstacle.x + i, obstacle.y);
                        this.ctx.lineTo(obstacle.x + i + spikeWidth/2, obstacle.y - spikeHeight);
                        this.ctx.lineTo(obstacle.x + i + spikeWidth, obstacle.y);
                        this.ctx.fill();
                    }
                    break;
                    
                case 'laser':
                    // Draw pulsing laser beam
                    const pulseIntensity = Math.sin(obstacle.animationFrame * 3) * 0.3 + 0.7;
                    this.ctx.fillStyle = obstacle.color;
                    this.ctx.globalAlpha = pulseIntensity;
                    this.ctx.shadowBlur = 20;
                    this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    
                    // Laser core
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.shadowBlur = 15;
                    this.ctx.fillRect(obstacle.x + 2, obstacle.y, obstacle.width - 4, obstacle.height);
                    this.ctx.globalAlpha = 1;
                    break;
                    
                case 'drone':
                    const bobY = obstacle.y + Math.sin(obstacle.bobOffset) * 5;
                    
                    // Drone body
                    this.ctx.fillStyle = '#333';
                    this.ctx.shadowColor = '#666';
                    this.ctx.shadowBlur = 8;
                    this.ctx.fillRect(obstacle.x + 10, bobY + 8, 20, 12);
                    
                    // Drone propellers
                    this.ctx.fillStyle = obstacle.color;
                    this.ctx.shadowColor = obstacle.glowColor;
                    this.ctx.shadowBlur = 12;
                    
                    // Spinning propeller effect
                    const propellerBlur = Math.sin(obstacle.animationFrame * 5) * 0.5 + 0.5;
                    this.ctx.globalAlpha = propellerBlur;
                    this.ctx.fillRect(obstacle.x, bobY, 15, 3);
                    this.ctx.fillRect(obstacle.x + 25, bobY, 15, 3);
                    this.ctx.fillRect(obstacle.x, bobY + 22, 15, 3);
                    this.ctx.fillRect(obstacle.x + 25, bobY + 22, 15, 3);
                    this.ctx.globalAlpha = 1;
                    
                    // Drone eye/scanner
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.shadowColor = '#ff0000';
                    this.ctx.shadowBlur = 8;
                    this.ctx.fillRect(obstacle.x + 18, bobY + 10, 4, 4);
                    break;
            }
        });
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }
    
    render() {
        this.drawBackground();
        
        if (this.gameState === 'playing') {
            this.drawPlayer();
            this.drawObstacles();
        } else if (this.gameState === 'menu') {
            // Draw title screen elements
            this.ctx.fillStyle = '#ff0080';
            this.ctx.font = 'bold 48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#ff0080';
            this.ctx.fillText('NINJA RUNNER', this.canvas.width/2, this.canvas.height/2 - 50);
            
            this.ctx.fillStyle = '#00ccff';
            this.ctx.font = 'bold 24px Courier New';
            this.ctx.shadowColor = '#00ccff';
            this.ctx.fillText('Press SPACE or CLICK to Jump!', this.canvas.width/2, this.canvas.height/2 + 20);
            this.ctx.shadowBlur = 0;
            this.ctx.textAlign = 'left';
        }
    }
    
    update() {
        if (this.gameState === 'playing') {
            this.updatePlayer();
            this.updateObstacles();
            this.checkCollisions();
        }
        this.updateBackground();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new CyberRunner();
});