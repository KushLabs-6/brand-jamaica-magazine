import { PageFlip } from 'page-flip';

// --- SCENE NAVIGATION (GLOBAL) ---
window.showScene = (sceneId) => {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sceneId);
    if (target) target.classList.add('active');
    if (sceneId === 'events-scene') window.loadEvents?.();
    if (sceneId === 'shop-scene') window.initPayPal?.();
};

// Global volume opener - called from inline onclick
window.openVolume = async (volumeId) => {
    const carouselScene = document.getElementById('carousel-scene');
    const magazineScene = document.getElementById('magazine-scene');
    if (!carouselScene || !magazineScene) return;
    carouselScene.classList.remove('active');
    magazineScene.classList.add('active');
    await new Promise(r => setTimeout(r, 700));
    if (window._loadMagazine) await window._loadMagazine(String(volumeId));
};

document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. AWGE INTRO SCREEN ---
    const btnStart = document.getElementById('btn-start');
    const introScene = document.getElementById('intro-scene');
    const carouselScene = document.getElementById('carousel-scene');
    const magazineScene = document.getElementById('magazine-scene');
    
    if (btnStart && introScene) {
        introScene.style.cursor = 'pointer';
        introScene.style.touchAction = 'manipulation'; // Prevent double-tap zoom delay on mobile
        
        function proceedToCarousel(e) {
            e.preventDefault();
            e.stopPropagation();
            btnStart.classList.add('fly-away');
            setTimeout(() => {
               introScene.classList.remove('active');
               carouselScene.classList.add('active');
            }, 800);
        }
        
        // Both click (desktop) and touchend (mobile) support
        introScene.addEventListener('click', proceedToCarousel);
        introScene.addEventListener('touchend', proceedToCarousel, { passive: false });
        
        // Also attach directly to the bird SVG for better mobile hit detection
        btnStart.addEventListener('click', proceedToCarousel);
        btnStart.addEventListener('touchend', proceedToCarousel, { passive: false });
    }

    let metadata = null;
    let pageFlip = null;

    // Safely encode image paths (handles spaces, backticks, brackets)
    const encodePath = (path) =>
        path.split('/').map(segment => encodeURIComponent(segment)).join('/');

    // --- 0. LOAD METADATA ---
    try {
        const metaRes = await fetch('./metadata.json');
        if (metaRes.ok) metadata = await metaRes.json();
    } catch (e) {
        console.warn('Metadata fallback: using API');
    }

    // --- 1. LOGO ---
    // Using the CSS-based tape logo from index.html instead of the original image file.

    // --- 2. CAROUSEL ---
    const carousel = document.querySelector('.carousel');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const items = document.querySelectorAll('.carousel-item');

    let currentIndex = 0;
    const totalItems = items.length;

    function updateCarousel() {
        items.forEach((item, index) => {
            let dist = index - currentIndex;
            if (dist > totalItems / 2) dist -= totalItems;
            if (dist < -totalItems / 2) dist += totalItems;

            if (dist === 0) {
                item.style.transform = `translateX(0) translateZ(0) rotateY(0deg) scale(1)`;
                item.style.zIndex = 10;
                item.style.opacity = 1;
            } else if (dist === -1 || (dist === totalItems - 1 && currentIndex === 0)) {
                item.style.transform = `translateX(-90%) translateZ(-100px) rotateY(15deg) scale(0.85)`;
                item.style.zIndex = 5;
                item.style.opacity = 0.9;
            } else if (dist === 1 || (dist === -(totalItems - 1) && currentIndex === totalItems - 1)) {
                item.style.transform = `translateX(90%) translateZ(-100px) rotateY(-15deg) scale(0.85)`;
                item.style.zIndex = 5;
                item.style.opacity = 0.9;
            } else {
                item.style.transform = `translateX(${Math.sign(dist) * 100}%) translateZ(-300px) rotateY(${Math.sign(dist) * -45}deg) scale(0.5)`;
                item.style.zIndex = 1;
                item.style.opacity = 0;
            }
        });
    }

    btnNext?.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % totalItems;
        updateCarousel();
    });

    btnPrev?.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
        updateCarousel();
    });
    
    updateCarousel();

    // --- 3. OPEN MAGAZINE ---
    // Scenes already initialized at the top of DOMContentLoaded
    const btnBack = document.getElementById('btn-back');
    const bookEl = document.getElementById('book');

    items.forEach(item => {
        item.addEventListener('click', async () => {
            const volumeId = item.getAttribute('data-volume');
            carouselScene.classList.remove('active');
            magazineScene.classList.add('active');
            // Wait for scene transition before initializing PageFlip
            await new Promise(r => setTimeout(r, 700));
            await loadMagazine(volumeId);
        });
    });

    btnBack?.addEventListener('click', () => {
        magazineScene.classList.remove('active');
        setTimeout(() => {
            carouselScene.classList.add('active');
            if (pageFlip) {
                pageFlip.destroy();
                pageFlip = null;
                bookEl.innerHTML = '';
            }
        }, 400);
    });

    // Resize support
    window.addEventListener('resize', () => {
        if (pageFlip) {
            const dims = responsiveDims();
            try { pageFlip.updateElementStyles(dims.width, dims.height); } catch(e){}
        }
    });

    function responsiveDims() {
        // Return original aspect ratio base dims
        const w = window.innerWidth;
        const width = w < 1000 ? w * 0.42 : 450;
        return { width, height: Math.round(width * 1.33) };
    }

    // --- 4. LOAD MAGAZINE PAGES  ---
    async function loadMagazine(volumeId) {
        let pages = [];

        if (metadata?.issues?.[`volume_${volumeId}`]?.length > 0) {
            pages = metadata.issues[`volume_${volumeId}`];
        } else {
            try {
                const res = await fetch(`./api/issues/${volumeId}`);
                const data = await res.json();
                pages = data.pages || [];
            } catch (e) { console.warn('API fallback failed', e); }
        }

        let pageHTML = pages.map((filename, i) => {
            const url = encodePath(`/issues/volume_${volumeId}/${filename}`);
            return `
            <div class="page page-cover">
                <div class="page-content" style="padding:0; margin:0; background:#fff; width:100%; height:100%;">
                    <img src="${url}" alt="Page ${i+1}" class="magazine-page-img" style="width:100%;height:100%;object-fit:cover;display:block;">
                </div>
            </div>`;
        }).join('');

        // Do not include the cover image again since we clicked it in the carousel!
        // Start directly with the interior pages, and end with the back cover.
        bookEl.innerHTML = `
            ${pageHTML}
            <div class="page page-cover hard">
                <div class="page-content" style="display:flex;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(135deg,#009b3a,#fed100);color:white;text-align:center;height:100%;">
                    <h2 style="font-family:'Caveat',cursive;font-size:3rem;">Brand Jamaica 🇯🇲</h2>
                    <p>The End</p>
                </div>
            </div>`;

        const dims = responsiveDims();
        pageFlip = new PageFlip(bookEl, {
            width: dims.width,
            height: dims.height,
            size: 'stretch',
            minWidth: 300,
            maxWidth: 550,  // Bound single page stretch to 550 (1100px spread total)
            minHeight: 400,
            maxHeight: 733, 
            showCover: false, // Ensures it opens as a standard 2-page spread immediately, centered!
            mobileScrollSupport: true,
            drawShadow: true,
            flippingTime: 1000,
            usePortrait: window.innerWidth < 768, 
            maxShadowOpacity: 0.7,
            showPageCorners: true,
            swipeDistance: 40,
            clickEventForward: true
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    }

    // Expose loadMagazine globally for openVolume() onclick handler
    window._loadMagazine = loadMagazine;

    // --- 5. EVENTS ---
    window.loadEvents = async function() {
        const list = document.getElementById('events-list');
        if (!list) return;
        try {
            const res = await fetch('./api/events');
            const data = await res.json();
            list.innerHTML = data.events.map(e =>
                `<div class="event-item">🗓 ${e}</div>`
            ).join('');
        } catch (e) {
            list.innerHTML = '<p>Add your first event below! (You can also edit events.txt in your Desktop folder)</p>';
        }
    };

    document.getElementById('btn-add-event')?.addEventListener('click', async () => {
        const input = document.getElementById('event-input');
        if (!input?.value.trim()) return;
        try {
            await fetch('./api/events-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: input.value.trim() })
            });
            input.value = '';
            window.loadEvents();
        } catch (e) {
            alert('Server not running. Please launch via Launch Magazine.bat');
        }
    });

    // --- 6. PAYPAL SHOP ---
    window.initPayPal = function() {
        const container = document.getElementById('paypal-button-container');
        if (!container || container.childElementCount > 0) return;
        if (window.paypal) {
            window.paypal.Buttons({
                createOrder: (data, actions) => actions.order.create({
                    purchase_units: [{ amount: { value: '25.00' }, description: 'Brand Jamaica Magazine - Physical Copy' }]
                }),
                onApprove: (data, actions) => actions.order.capture().then(d => {
                    container.innerHTML = `<h3 style="color:green">✅ Thank you ${d.payer.name.given_name}! We'll be in touch soon.</h3>`;
                }),
                onError: (err) => { container.innerHTML = '<p style="color:red">Payment failed. Please try again.</p>'; }
            }).render('#paypal-button-container');
        } else {
            container.innerHTML = `<p>PayPal is loading... If this persists, check your internet connection.</p>`;
        }
    };

    // --- 7. COMMUNITY UPLOAD ---
    document.getElementById('btn-upload')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('upload-file');
        const nameInput = document.getElementById('upload-name');
        const btn = document.getElementById('btn-upload');
        if (!fileInput?.files[0]) { alert('Please choose a file first.'); return; }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('name', nameInput?.value || 'Anonymous');
        btn.innerText = 'Uploading... ⏳';
        btn.disabled = true;

        try {
            const res = await fetch('./api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            btn.innerText = '✅ Uploaded!';
            fileInput.value = '';
            loadCommunityFeed();
        } catch (e) {
            btn.innerText = 'Upload to local desktop folder';
            btn.disabled = false;
            alert('Upload requires the local server. Please launch via Launch Magazine.bat');
        }
    });

    async function loadCommunityFeed() {
        const grid = document.getElementById('community-grid');
        if (!grid) return;
        try {
            const res = await fetch('./api/community');
            const data = await res.json();
            if (data.files?.length > 0) {
                grid.innerHTML = data.files.map(f => {
                    if (f.match(/\.(mp4|webm|mov)$/i)) {
                        return `<div class="community-card"><video src="/community/${f}" controls style="width:100%; border-radius:4px;"></video></div>`;
                    }
                    return `<div class="community-card"><img src="/community/${f}" style="width:100%; border-radius:4px; object-fit:cover;"></div>`;
                }).join('');
            } else {
                grid.innerHTML = '<p>Be the first to share something! 🇯🇲</p>';
            }
        } catch (e) {
            grid.innerHTML = '<p>Community Feed loads when connected to the local server.</p>';
        }
    }
});
