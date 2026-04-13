import { PageFlip } from 'page-flip';

// --- YOUTUBE API LOADER ---
let ytPlayer = null;
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('bg-music-container', {
        height: '0',
        width: '0',
        videoId: 'KMxV_gRESWM',
        playerVars: {
            'autoplay': 0,
            'loop': 1,
            'playlist': 'KMxV_gRESWM',
            'controls': 0,
            'showinfo': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': (event) => {
                event.target.setVolume(40);
            }
        }
    });
};

// --- SCENE NAVIGATION (GLOBAL) ---
window.showScene = (sceneId) => {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sceneId);
    if (target) target.classList.add('active');

    // Smart Audio Logic
    if (sceneId === 'interviews-scene' || sceneId === 'documentaries-scene') {
        ytPlayer?.pauseVideo?.();
    } else {
        // If music was playing before entering video scenes, resume it
        if (window._musicStarted) ytPlayer?.playVideo?.();
    }

    if (sceneId === 'events-scene') window.loadEvents?.();
    if (sceneId === 'hub-scene') window.loadCommunityFeed?.();
    if (sceneId === 'shop-scene') window.initPayPal?.();
    if (sceneId === 'interviews-scene') window.loadInterviews?.();
    if (sceneId === 'documentaries-scene') window.loadDocumentaries?.();
};

// Global home navigation
window.goHome = () => {
    window.showScene('intro-scene');
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.classList.remove('fly-away');
};

// Global volume opener
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
    const btnStart = document.getElementById('btn-start');
    const introScene = document.getElementById('intro-scene');
    const carouselScene = document.getElementById('carousel-scene');
    const magazineScene = document.getElementById('magazine-scene');
    
    if (btnStart && introScene) {
        function proceedToCarousel(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 1. Play Bird Sound
            try {
                const audioUrl = './Sound/bird.mp3';
                const audio = new Audio(audioUrl);
                audio.play().catch(err => console.warn('Audio play prevented', err));
            } catch(e) {}

            // 2. Start Background Music
            if (!window._musicStarted) {
                ytPlayer?.playVideo?.();
                window._musicStarted = true;
            }

            // 3. Animation
            btnStart.classList.add('fly-away');
            setTimeout(() => {
               introScene.classList.remove('active');
               carouselScene.classList.add('active');
            }, 1000);
        }
        
        introScene.addEventListener('click', proceedToCarousel);
        btnStart.addEventListener('click', proceedToCarousel);
        introScene.addEventListener('touchend', proceedToCarousel, { passive: false });
    }

    let metadata = null;
    let pageFlip = null;
    const BASE = import.meta.env.BASE_URL;

    const encodePath = (relativePath) => {
        const clean = relativePath.replace(/^\//, '');
        const parts = clean.split('/');
        const encoded = parts.map(segment => encodeURIComponent(segment)).join('/');
        return BASE + encoded;
    };

    // --- LOAD METADATA ---
    try {
        const metaRes = await fetch('./metadata.json');
        if (metaRes.ok) metadata = await metaRes.json();
    } catch (e) { console.warn('Metadata fallback'); }

    // --- CAROUSEL ---
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

    btnNext?.addEventListener('click', () => { currentIndex = (currentIndex + 1) % totalItems; updateCarousel(); });
    btnPrev?.addEventListener('click', () => { currentIndex = (currentIndex - 1 + totalItems) % totalItems; updateCarousel(); });
    
    // Swipe logic
    let carouselTouchStartX = 0;
    const carouselContainer = document.querySelector('.carousel-container');
    carouselContainer?.addEventListener('touchstart', (e) => { carouselTouchStartX = e.touches[0].clientX; }, { passive: true });
    carouselContainer?.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - carouselTouchStartX;
        if (Math.abs(dx) > 50) {
            if (dx < 0) currentIndex = (currentIndex + 1) % totalItems;
            else currentIndex = (currentIndex - 1 + totalItems) % totalItems;
            updateCarousel();
        }
    }, { passive: true });

    updateCarousel();

    // --- MAGAZINE OPENER ---
    const btnBack = document.getElementById('btn-back');
    const bookEl = document.getElementById('book');

    items.forEach(item => {
        item.addEventListener('click', async (e) => {
            const volumeId = item.getAttribute('data-volume');
            history.pushState({ scene: 'magazine', volumeId }, '');
            carouselScene.classList.remove('active');
            magazineScene.classList.add('active');
            await new Promise(r => setTimeout(r, 700));
            await loadMagazine(volumeId);
        });
    });

    function closeMagazine() {
        magazineScene.classList.remove('active');
        setTimeout(() => {
            carouselScene.classList.add('active');
            if (pageFlip) { pageFlip.destroy(); pageFlip = null; bookEl.innerHTML = ''; }
        }, 400);
    }
    btnBack?.addEventListener('click', closeMagazine);

    async function loadMagazine(volumeId) {
        let pages = metadata?.issues?.[`volume_${volumeId}`] || [];
        let pageHTML = pages.map((f, i) => {
            const url = encodePath(`/issues/volume_${volumeId}/${f}`);
            return `<div class="page"><div class="page-content"><img src="${url}" class="magazine-page-img"></div></div>`;
        }).join('');

        bookEl.innerHTML = pageHTML + `<div class="page hard"><div class="page-content" style="display:flex;align-items:center;justify-content:center;background:#009b3a;color:#fff;"><h2>Brand Jamaica 🇯🇲</h2></div></div>`;
        const dims = responsiveDims();
        pageFlip = new PageFlip(bookEl, {
            width: dims.width, height: dims.height, size: 'stretch',
            showCover: false, flippingTime: 800, usePortrait: dims.portrait
        });
        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    }

    function responsiveDims() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw < 768;
        return isMobile ? { width: Math.round(vw * 0.85), height: Math.round(vh * 0.75), portrait: true } 
                        : { width: 450, height: 600, portrait: false };
    }

    // --- EXCLUSIVE SECTIONS ---
    window.loadInterviews = () => {
        const grid = document.getElementById('interviews-grid');
        const videos = [
            { id: 'ry5_XOMUQFI', title: 'The King From Kingston Interview (Part 1)', tagline: 'EXCLUSIVE FEATURE' },
            { id: 'K0GFxs5JBd8', title: 'The King From Kingston - Behind the Scenes', tagline: 'CULTURE SPOTLIGHT' },
            { id: 'RVnqtapqZbY', title: 'Jamaican Heritage & Vision', tagline: 'LEGACY SERIES' }
        ];
        grid.innerHTML = videos.map(v => `
            <div class="film-strip-card">
                <div class="video-container-premium">
                    <iframe src="https://www.youtube.com/embed/${v.id}?modestbranding=1&rel=0" allowfullscreen></iframe>
                </div>
                <div class="video-info-scrap">
                    <span class="video-tagline">${v.tagline}</span>
                    <h3 class="video-title-scrap">${v.title}</h3>
                </div>
            </div>
        `).join('');
    };

    window.loadDocumentaries = () => {
        const grid = document.getElementById('documentaries-grid');
        const doc = { id: '5D9-1n26qBQ', title: 'Brand Jamaica: The Documentary', tagline: 'CULTURAL ANTHOLOGY' };
        grid.innerHTML = `
            <div class="film-strip-card">
                <div class="video-container-premium">
                    <iframe src="https://www.youtube.com/embed/${doc.id}?modestbranding=1&rel=0" allowfullscreen></iframe>
                </div>
                <div class="video-info-scrap">
                    <span class="video-tagline">${doc.tagline}</span>
                    <h3 class="video-title-scrap">${doc.title}</h3>
                </div>
            </div>
        `;
    };

    // Other section loaders...
    window.loadEvents = async () => {
        const grid = document.getElementById('events-grid');
        if (!grid) return;
        const featuredEvent = { id: 'beat-street', title: 'Beat Street Fridays', location: 'Oranje Street, Kingston', caption: 'The heart of Kingston street culture. Vibes, music, and pure energy every Friday!', img: 'events/beat-street-fridays.jpg', video: 'uPJIYON50Tk', insta: 'https://www.instagram.com/oranjestreetzmusick_mitchie/?hl=en' };
        const basePath = typeof BASE !== 'undefined' ? BASE : './';
        grid.innerHTML = `
        <div class="insta-card event-card">
            <div class="card-tape"></div>
            <div class="insta-header"><div class="insta-avatar">BS</div><div class="insta-user-info"><span class="insta-user">${featuredEvent.title}</span><span class="insta-name">${featuredEvent.location}</span></div></div>
            <div class="insta-media-container" style="position:relative;">
                <img src="${basePath}${featuredEvent.img}" class="insta-media" style="position:absolute; inset:0; z-index:1;">
                <div class="event-video-container"><iframe src="https://www.youtube.com/embed/${featuredEvent.video}?autoplay=1&mute=1&loop=1&playlist=${featuredEvent.video}&modestbranding=1&controls=0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>
            </div>
            <div class="insta-actions"><a href="${featuredEvent.insta}" target="_blank" class="insta-icon-link">View on Instagram</a></div>
            <div class="insta-caption-wrapper"><span class="insta-user-bold">@BeatStreet</span><p class="insta-caption-text">${featuredEvent.caption}</p></div>
        </div>`;
    };

    window.loadCommunityFeed = async () => {
        const grid = document.getElementById('community-grid');
        if (!grid) return;
        grid.innerHTML = '<p>Check out our latest community vibes above! 🇯🇲</p>';
    };

    window.initPayPal = () => {
        const container = document.getElementById('paypal-button-container');
        if (!container || container.childElementCount > 0) return;
        if (window.paypal) {
            window.paypal.Buttons({
                createOrder: (data, actions) => actions.order.create({ purchase_units: [{ amount: { value: '25.00' }, description: 'Brand Jamaica Magazine - Physical Copy' }] }),
                onApprove: (data, actions) => actions.order.capture().then(d => { container.innerHTML = `<h3 style="color:green">✅ Thank you ${d.payer.name.given_name}!</h3>`; }),
            }).render('#paypal-button-container');
        }
    };

    window._loadMagazine = loadMagazine;
});
