const startConfetti = () => {
    const colors = ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'];
    const particleCount = 200;

    // Using a canvas overlay
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);
    }

    // Resize canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height, // Start above the screen
            speed: Math.random() * 3 + 2, // 2-5 speed
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 5 + 5,
            wiggle: Math.random() * 20,
            angle: Math.random() * 360
        });
    }

    let animationId;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p, index) => {
            p.y += p.speed;
            p.angle += 2;
            p.x += Math.sin(p.angle * Math.PI / 180) * 1; // Small horizontal wiggle

            ctx.fillStyle = p.color;
            ctx.beginPath();
            // Draw a square that rotates (simulated)
            ctx.fillRect(p.x, p.y, p.size, p.size);

            // Recycle particles
            if (p.y > canvas.height) {
                p.y = -10;
                p.x = Math.random() * canvas.width;
            }
        });

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // Stop after 3 seconds
    setTimeout(() => {
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }, 4000);
};
