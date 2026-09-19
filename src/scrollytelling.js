/**
 * Kotak Dashboard Map Zoom & Center-Split Scrollytelling Engine
 * 17 Frames sequence with smooth lerped canvas scrubbing and center-break reveal
 */

const TOTAL_FRAMES = 17;
const FRAME_PATHS = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const num = String(i + 1).padStart(3, '0');
  return `./frames/frame_${num}.png`;
});

export function initScrollytelling() {
  const track = document.getElementById('scrollyTrack');
  const viewport = document.getElementById('scrollyViewport');
  const canvas = document.getElementById('scrollyCanvas');
  const canvasWrapper = document.getElementById('scrollyCanvasWrapper');
  const skipBtn = document.getElementById('scrollySkipBtn');
  const replayBtn = document.getElementById('replayIntroBtn');
  const bottomPrompt = document.getElementById('scrollyBottomPrompt');
  const progressFill = document.getElementById('scrollyProgressFill');
  const progressText = document.getElementById('scrollyProgressText');
  const appContainer = document.querySelector('.app-container');

  if (!track || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let currentFrameIndex = 0;
  let isTicking = false;

  // Preload all frames
  function preloadImages() {
    FRAME_PATHS.forEach((path, idx) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        images[idx] = img;
        loadedCount++;
        // Render first frame immediately once loaded
        if (idx === 0) {
          renderFrame(0);
        }
      };
      img.onerror = () => {
        console.warn(`Could not load frame: ${path}`);
      };
    });
  }

  // Handle high-DPI canvas sizing
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Re-render current frame
    renderFrame(currentFrameIndex);
  }

  // Draw image to fill canvas (cover style, center crop)
  function drawImageCover(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    const hRatio = width / iw;
    const vRatio = height / ih;
    const ratio = Math.max(hRatio, vRatio);

    const nw = iw * ratio;
    const nh = ih * ratio;
    const cx = (width - nw) / 2;
    const cy = (height - nh) / 2;

    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, cx, cy, nw, nh);
  }

  function renderFrame(index) {
    const safeIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
    currentFrameIndex = safeIndex;

    const img = images[safeIndex] || images[0];
    if (img) {
      drawImageCover(img);
    }
  }

  // Calculate scroll progress (0 to 1)
  function onScroll() {
    const maxScroll = track.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrollY = window.scrollY || window.pageYOffset;
    targetProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

    if (!isTicking) {
      requestAnimationFrame(updateAnimation);
      isTicking = true;
    }
  }

  // Animation render loop with smooth lerping
  function updateAnimation() {
    // Lerp progress for ultra-smooth frame transitions
    currentProgress += (targetProgress - currentProgress) * 0.18;
    if (Math.abs(targetProgress - currentProgress) < 0.0005) {
      currentProgress = targetProgress;
    }

    // Map 0.0 -> 0.85 to the 17 frames (frame 0 to 16)
    // Map 0.85 -> 1.0 to the center break / door separation
    const frameProgress = Math.min(currentProgress / 0.85, 1);
    const targetFrame = frameProgress * (TOTAL_FRAMES - 1);
    renderFrame(targetFrame);

    // Update HUD Progress
    const pct = Math.round(currentProgress * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${pct}%`;

    // Fade bottom scroll prompt
    if (bottomPrompt) {
      if (currentProgress > 0.05) {
        bottomPrompt.style.opacity = '0';
        bottomPrompt.style.pointerEvents = 'none';
      } else {
        bottomPrompt.style.opacity = '1';
        bottomPrompt.style.pointerEvents = 'auto';
      }
    }

    // Center Break & Split Effect (from 0.82 to 1.0)
    if (canvasWrapper) {
      if (currentProgress > 0.82) {
        // Break progress from 0 to 1
        const breakFactor = (currentProgress - 0.82) / 0.18; // 0 to 1
        const easeBreak = Math.pow(breakFactor, 2); // Accelerate opening
        
        // Scale and opacity transition for canvas
        const scale = 1 + easeBreak * 0.15;
        const opacity = Math.max(0, 1 - easeBreak * 1.2);
        
        // Split clip-path (curtain doors parting from center)
        const leftInset = easeBreak * 50; // Inset from center to left
        const rightInset = easeBreak * 50; // Inset from center to right
        
        canvasWrapper.style.transform = `scale(${scale})`;
        canvasWrapper.style.opacity = opacity.toFixed(3);
        // Center split reveal:
        canvasWrapper.style.clipPath = `polygon(
          0% 0%, 
          ${50 - leftInset}% 0%, 
          ${50 - leftInset}% 100%, 
          0% 100%, 
          100% 100%, 
          ${50 + rightInset}% 100%, 
          ${50 + rightInset}% 0%, 
          100% 0%
        )`;
      } else {
        canvasWrapper.style.transform = 'scale(1)';
        canvasWrapper.style.opacity = '1';
        canvasWrapper.style.clipPath = 'none';
      }
    }

    // Transition live app container appearance
    if (appContainer) {
      if (currentProgress > 0.85) {
        const appReveal = Math.min((currentProgress - 0.85) / 0.15, 1);
        appContainer.style.opacity = '1';
        appContainer.style.transform = `translateY(${(1 - appReveal) * 40}px)`;
      } else {
        appContainer.style.transform = 'translateY(0px)';
      }
    }

    if (Math.abs(targetProgress - currentProgress) > 0.0005) {
      requestAnimationFrame(updateAnimation);
    } else {
      isTicking = false;
    }
  }

  // Navigation handlers
  function scrollToApp() {
    const maxScroll = track.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: maxScroll + 10,
      behavior: 'smooth'
    });
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', scrollToApp);
  }

  if (bottomPrompt) {
    bottomPrompt.addEventListener('click', () => {
      const scrollStep = window.innerHeight * 1.2;
      window.scrollBy({ top: scrollStep, behavior: 'smooth' });
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', scrollToTop);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  // Initialize
  resizeCanvas();
  preloadImages();
  onScroll();
}
