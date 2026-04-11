import { PageFlip } from 'page-flip';

// --- SCENE NAVIGATION (GLOBAL) ---
window.showScene = (sceneId) => {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sceneId);
    if (target) target.classList.add('active');
    if (sceneId === 'events-scene') window.loadEvents?.();
    if (sceneId === 'hub-scene') window.loadCommunityFeed?.();
    if (sceneId === 'shop-scene') window.initPayPal?.();
};

// Global home navigation
window.goHome = () => {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const introScene = document.getElementById('intro-scene');
    const btnStart = document.getElementById('btn-start');
    if (introScene) introScene.classList.add('active');
    if (btnStart) btnStart.classList.remove('fly-away');
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
            
            // Play Doctor Bird click sound
            try {
                const audioUrl = typeof BASE !== 'undefined' ? BASE + 'sound/bird.mp3' : './sound/bird.mp3';
                const audio = new Audio(audioUrl);
                audio.play().catch(err => console.warn('Audio play prevented', err));
            } catch(e) {}

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

    // Safely encode image paths - respects the Vite base URL (e.g. /brand-jamaica-magazine/ on GitHub Pages)
    const BASE = import.meta.env.BASE_URL; // '/' locally, '/brand-jamaica-magazine/' on GitHub Pages
    const encodePath = (relativePath) => {
        // relativePath looks like: /issues/volume_1/1.png
        // We strip the leading slash and prepend BASE
        const clean = relativePath.replace(/^\//, '');
        const parts = clean.split('/');
        const encoded = parts.map(segment => encodeURIComponent(segment)).join('/');
        return BASE + encoded;
    };

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
    btnNext?.addEventListener('touchend', (e) => {
        e.preventDefault();
        currentIndex = (currentIndex + 1) % totalItems;
        updateCarousel();
    }, { passive: false });

    btnPrev?.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
        updateCarousel();
    });
    btnPrev?.addEventListener('touchend', (e) => {
        e.preventDefault();
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
        updateCarousel();
    }, { passive: false });
    
    // Swipe left/right on the carousel to change volumes
    let carouselTouchStartX = 0;
    const carouselContainer = document.querySelector('.carousel-container');
    carouselContainer?.addEventListener('touchstart', (e) => {
        carouselTouchStartX = e.touches[0].clientX;
    }, { passive: true });
    carouselContainer?.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - carouselTouchStartX;
        if (Math.abs(dx) > 40) { // 40px threshold
            if (dx < 0) currentIndex = (currentIndex + 1) % totalItems; // swipe left = next
            else currentIndex = (currentIndex - 1 + totalItems) % totalItems; // swipe right = prev
            updateCarousel();
        }
    }, { passive: true });

    updateCarousel();

    // --- 3. OPEN MAGAZINE ---
    // Scenes already initialized at the top of DOMContentLoaded
    const btnBack = document.getElementById('btn-back');
    const bookEl = document.getElementById('book');

    // Also open on touchend for mobile reliability
    items.forEach(item => {
        async function openItem(e) {
            e.preventDefault();
            const volumeId = item.getAttribute('data-volume');
            // Push a history state so Android back button works
            history.pushState({ scene: 'magazine', volumeId }, '');
            carouselScene.classList.remove('active');
            magazineScene.classList.add('active');
            await new Promise(r => setTimeout(r, 700));
            await loadMagazine(volumeId);
        }
        item.addEventListener('click', openItem);
        item.addEventListener('touchend', openItem, { passive: false });
    });

    // Handle hardware back button on Android (popstate)
    window.addEventListener('popstate', (e) => {
        if (magazineScene.classList.contains('active')) {
            magazineScene.classList.remove('active');
            setTimeout(() => {
                carouselScene.classList.add('active');
                if (pageFlip) { pageFlip.destroy(); pageFlip = null; }
            }, 300);
        }
    });

    function closeMagazine() {
        magazineScene.classList.remove('active');
        setTimeout(() => {
            carouselScene.classList.add('active');
            if (pageFlip) { pageFlip.destroy(); pageFlip = null; bookEl.innerHTML = ''; }
        }, 400);
    }

    btnBack?.addEventListener('click', closeMagazine);
    btnBack?.addEventListener('touchend', (e) => { e.preventDefault(); closeMagazine(); }, { passive: false });

    // Swipe-down to close the magazine
    let magTouchStartY = 0;
    magazineScene.addEventListener('touchstart', (e) => {
        magTouchStartY = e.touches[0].clientY;
    }, { passive: true });
    magazineScene.addEventListener('touchend', (e) => {
        const dy = e.changedTouches[0].clientY - magTouchStartY;
        if (dy > 80) closeMagazine(); // swipe down 80px closes the magazine
    }, { passive: true });

    // Resize support
    window.addEventListener('resize', () => {
        if (pageFlip) {
            const dims = responsiveDims();
            try { pageFlip.updateElementStyles(dims.width, dims.height); } catch(e){}
        }
    });


    function responsiveDims() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw < 768;
        
        if (isMobile) {
            // Leave ~8% margin each side so words near the edge aren't clipped
            const width = Math.round(vw * 0.82);
            const height = Math.round(Math.min(vh * 0.78, width * 1.41));
            return { width, height, portrait: true };
        } else {
            // Desktop: two-page spread, bounded comfortably within the viewport
            const width = Math.round(Math.min(vw * 0.38, 460));
            const height = Math.round(Math.min(vh * 0.80, width * 1.38));
            return { width, height, portrait: false };
        }
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
            minWidth: 280,
            maxWidth: 550,
            minHeight: 380,
            maxHeight: 750,
            showCover: false,
            mobileScrollSupport: false,
            drawShadow: true,
            flippingTime: 800,
            usePortrait: dims.portrait,
            maxShadowOpacity: 0.5,
            showPageCorners: true,
            swipeDistance: 30,
            clickEventForward: true
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    }

    // Expose loadMagazine globally for openVolume() onclick handler
    window._loadMagazine = loadMagazine;

    // --- 5. EVENTS & PLACES ---
    window.loadEvents = async function() {
        const grid = document.getElementById('events-grid');
        if (!grid) return;

        // Hardcoded Featured Event: Beat Street Fridays
        const featuredEvent = {
            id: 'beat-street',
            title: 'Beat Street Fridays',
            location: 'Oranje Street, Kingston',
            caption: 'The heart of Kingston street culture. Vibes, music, and pure energy every Friday! 🎼🇯🇲',
            img: 'events/beat-street-fridays.jpg',
            video: 'uPJIYON50Tk', // YouTube ID
            insta: 'https://www.instagram.com/oranjestreetzmusick_mitchie/?hl=en'
        };

        const basePath = typeof BASE !== 'undefined' ? BASE : './';

        const renderCard = (e) => `
        <div class="insta-card event-card">
            <div class="card-tape"></div>
            <div class="insta-header">
                <div class="insta-avatar">BS</div>
                <div class="insta-user-info">
                    <span class="insta-user">${e.title}</span>
                    <span class="insta-name">${e.location}</span>
                </div>
            </div>
            <div class="insta-media-container" style="position:relative;">
                <img src="${basePath}${e.img}" class="insta-media" style="position:absolute; inset:0; z-index:1;">
                <div class="event-video-container">
                    <iframe src="https://www.youtube.com/embed/${e.video}?autoplay=1&mute=1&loop=1&playlist=${e.video}&modestbranding=1&controls=0" 
                            allow="autoplay; encrypted-media" allowfullscreen></iframe>
                </div>
            </div>
            <div class="insta-actions">
                <a href="${e.insta}" target="_blank" class="insta-icon-link">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    <span>View on Instagram</span>
                </a>
            </div>
            <div class="insta-caption-wrapper">
                <span class="insta-user-bold">@BeatStreet</span>
                <p class="insta-caption-text" style="font-size: 1.3rem;">${e.caption}</p>
            </div>
        </div>`;

        // Render Featured + Any dynamic ones (if any)
        grid.innerHTML = renderCard(featuredEvent);
    };

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
    document.getElementById('upload-file')?.addEventListener('change', async (e) => {
        const fileInput = e.target;
        const nameInput = document.getElementById('upload-name');
        
        if (!fileInput?.files[0]) return;

        // Visual feedback
        const plusBtn = document.querySelector('.upload-plus-btn');
        if (plusBtn) plusBtn.style.opacity = '0.5';

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('name', nameInput?.value || 'Anonymous');
        try {
            const res = await fetch('./api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            fileInput.value = '';
            if (plusBtn) plusBtn.style.opacity = '1';
            loadCommunityFeed();
        } catch (e) {
            if (plusBtn) plusBtn.style.opacity = '1';
            alert('Upload requires the local server. Please launch via Launch Magazine.bat');
        }
    });

    window.loadCommunityFeed = async function() {
        const grid = document.getElementById('community-grid');
        if (!grid) return;

        // Consistent Premium Profiles for test data
        const testUsers = [
            { handle: "@KingstonKing", name: "Malik", caption: "Vibes at the festival! The energy is unmatched. 🇯🇲🔥", avatar: "MK" },
            { handle: "@FlavorQueen", name: "Zaya", caption: "Authentic Jerk Chicken... my mouth is watering just thinking about it again! 🍗✨", avatar: "ZQ" },
            { handle: "@NatureSoul", name: "Rohan", caption: "Found this hidden paradise waterfall on my hike today. Pure peace. 🌊🍃", avatar: "RS" },
            { handle: "@NegrilGlow", name: "Maya", caption: "Nothing beats a Negril sunset. The colors are like a painting. 🌅🧡", avatar: "MG" },
            { handle: "@StudioVibes", name: "Andre", caption: "Late night in the studio. Creating something special for the island. 🎨🎨", avatar: "AV" }
        ];

        let files = [];
        try {
            // 1. Try Live API (Local Server)
            const res = await fetch('./api/community?t=' + Date.now());
            const data = await res.json();
            files = data.files || [];
        } catch (e) {
            // 2. Fallback to Static Metadata (GitHub Pages / App)
            try {
                const res = await fetch('./metadata.json?t=' + Date.now());
                const data = await res.json();
                files = data.community || [];
            } catch (err) {
                grid.innerHTML = '<p>Community Feed is currently unavailable. Checkout our social links below! 🇯🇲</p>';
                return;
            }
        }

        if (files.length > 0) {
            // Filter specifically for our curated premium content to ensure a high-end look
            const curatedFiles = files.filter(f => 
                f.includes('reggae_festival') || 
                f.includes('jerk_chicken') || 
                f.includes('jamaican_waterfall') ||
                f.includes('negril_sunset') ||
                f.includes('jamaican_artist')
            );

            // If curated filter returns nothing, show all (maybe user uploaded something locally)
            const displayFiles = curatedFiles.length > 0 ? curatedFiles : files;

            grid.innerHTML = displayFiles.map((f, index) => {
                const isVideo = f.match(/\.(mp4|webm|mov)$/i);
                const basePath = typeof BASE !== 'undefined' ? BASE : './';
                // Adjust path for community images
                const imgPath = f.startsWith('community/') ? `${basePath}${f}` : `${basePath}community/${f}`;
                const mediaTag = isVideo 
                    ? `<video src="${imgPath}" controls class="insta-media"></video>`
                    : `<img src="${imgPath}" class="insta-media">`;
                
                const user = testUsers[index % testUsers.length];

                return `
                <div class="insta-card">
                    <div class="card-tape"></div>
                    <div class="insta-header">
                        <div class="insta-avatar">${user.avatar}</div>
                        <div class="insta-user-info">
                            <span class="insta-user">${user.handle}</span>
                            <span class="insta-name">${user.name}</span>
                        </div>
                    </div>
                    <div class="insta-media-container">${mediaTag}</div>
                    <div class="insta-actions">
                        <span class="action-btn">❤️</span>
                        <span class="action-btn">💬</span>
                        <span class="action-btn" style="margin-left:auto">🔖</span>
                    </div>
                    <div class="insta-caption-wrapper">
                        <span class="insta-user-bold">${user.handle}</span>
                        <p class="insta-caption-text">${user.caption}</p>
                    </div>
                </div>`;
            }).join('');
        } else {
            grid.innerHTML = '<p>Be the first to share something! 🇯🇲</p>';
        }
    }
});
