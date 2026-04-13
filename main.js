import { PageFlip } from 'page-flip';

// --- YOUTUBE API LOADER ---
let ytPlayer = null;
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
if (firstScriptTag) firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
else document.head.appendChild(tag);

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
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }

    // Smart Audio Logic
    if (sceneId === 'interviews-scene' || sceneId === 'documentaries-scene') {
        ytPlayer?.pauseVideo?.();
    } else {
        if (window._musicStarted) ytPlayer?.playVideo?.();
    }

    if (sceneId === 'events-scene') window.loadEvents?.();
    if (sceneId === 'hub-scene') window.loadCommunityFeed?.();
    if (sceneId === 'shop-scene') window.initPayPal?.();
    if (sceneId === 'interviews-scene') window.loadInterviews?.();
    if (sceneId === 'documentaries-scene') window.loadDocumentaries?.();
};

window.goHome = () => {
    window.showScene('intro-scene');
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.classList.remove('fly-away');
};

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
    
    let BASE = import.meta.env.BASE_URL || '/brand-jamaica-magazine/';
    if (!BASE.endsWith('/')) BASE += '/';

    // PRELOAD AUTHENTIC BIRD SOUND
    const birdAudio = new Audio();
    birdAudio.src = `${BASE}Sound/bird.mp3`.replace(/\/\//g, '/');
    birdAudio.load();

    if (btnStart && introScene) {
        function proceedToCarousel(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            // 1. Play Real Bird Sound
            try {
                birdAudio.play().catch(err => console.warn('Bird audio play prevented', err));
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
               window.showScene('carousel-scene');
            }, 1000);
        }
        
        introScene.addEventListener('click', proceedToCarousel);
        btnStart.addEventListener('click', proceedToCarousel);
        introScene.addEventListener('touchend', proceedToCarousel, { passive: false });
    }

    let metadata = null;
    let pageFlip = null;

    const encodePath = (relativePath) => {
        const clean = relativePath.replace(/^\//, '');
        const parts = clean.split('/');
        const encoded = parts.map(segment => encodeURIComponent(segment)).join('/');
        return BASE + encoded;
    };

    try {
        const metaRes = await fetch('./metadata.json');
        if (metaRes.ok) metadata = await metaRes.json();
    } catch (e) { console.warn('Metadata fallback'); }

    // --- CAROUSEL (REFINED: SHOW 5 ITEMS) ---
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

            const absDist = Math.abs(dist);

            if (dist === 0) {
                // CENTER
                item.style.transform = `translateX(0) translateZ(0) rotateY(0deg) scale(1)`;
                item.style.zIndex = 10;
                item.style.opacity = 1;
                item.style.filter = 'none';
            } else if (absDist === 1 || (totalItems === 5 && (absDist === 4))) {
                // 1 AWAY (LEFT/RIGHT)
                const side = dist > 0 || (dist < -2) ? 1 : -1;
                item.style.transform = `translateX(${side * 85}%) translateZ(-150px) rotateY(${side * -20}deg) scale(0.82)`;
                item.style.zIndex = 5;
                item.style.opacity = 0.85;
                item.style.filter = 'brightness(0.8)';
            } else if (absDist === 2 || (totalItems === 5 && (absDist === 3))) {
                // 2 AWAY (FAR LEFT/RIGHT) - NOW VISIBLE!
                const side = dist > 0 || (dist < -1 && dist > -4) ? 1 : -1;
                item.style.transform = `translateX(${side * 145}%) translateZ(-300px) rotateY(${side * -40}deg) scale(0.65)`;
                item.style.zIndex = 1;
                item.style.opacity = 0.35;
                item.style.filter = 'brightness(0.6) blur(1px)';
            } else {
                // REST
                item.style.transform = `translateX(${Math.sign(dist) * 200}%) translateZ(-500px) scale(0.4)`;
                item.style.zIndex = 0;
                item.style.opacity = 0;
            }
        });
    }

    btnNext?.addEventListener('click', () => { currentIndex = (currentIndex + 1) % totalItems; updateCarousel(); });
    btnPrev?.addEventListener('click', () => { currentIndex = (currentIndex - 1 + totalItems) % totalItems; updateCarousel(); });
    
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

    const btnBack = document.getElementById('btn-back');
    const bookEl = document.getElementById('book');

    items.forEach(item => {
        item.addEventListener('click', async (e) => {
            const volumeId = item.getAttribute('data-volume');
            if (volumeId && ['1', '2', '3'].includes(volumeId)) { 
                history.pushState({ scene: 'magazine', volumeId }, '');
                carouselScene.classList.remove('active');
                magazineScene.classList.add('active');
                await new Promise(r => setTimeout(r, 700));
                await loadMagazine(volumeId);
            }
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

    // --- SECTIONS ---
    window.loadEvents = async () => {
        const grid = document.getElementById('events-grid');
        if (!grid) return;
        const featuredEvent = {
            id: 'beat-street', title: 'Beat Street Fridays', location: 'Oranje Street, Kingston', 
            caption: 'The heart of Kingston street culture. Vibes, music, and energy every Friday!', 
            img: 'events/beat-street-fridays.jpg', video: 'uPJIYON50Tk', insta: 'https://www.instagram.com/oranjestreetzmusick_mitchie/'
        };
        const basePath = BASE;
        grid.innerHTML = `
        <div class="insta-card event-card">
            <div class="card-tape"></div>
            <div class="insta-header"><div class="insta-avatar">BS</div><div class="insta-user-info"><span class="insta-user">${featuredEvent.title}</span><span class="insta-name">${featuredEvent.location}</span></div></div>
            <div class="insta-media-container" style="position:relative;">
                <img src="${basePath}${featuredEvent.img}" class="insta-media" style="position:absolute; inset:0; z-index:1;">
                <div class="event-video-container"><iframe src="https://www.youtube.com/embed/${featuredEvent.video}?autoplay=1&mute=1&loop=1&playlist=${featuredEvent.video}&modestbranding=1&controls=0" allowfullscreen></iframe></div>
            </div>
            <div class="insta-actions"><a href="${featuredEvent.insta}" target="_blank" class="insta-icon-link">View Instagram</a></div>
            <div class="insta-caption-wrapper"><p class="insta-caption-text">${featuredEvent.caption}</p></div>
        </div>`;
    };

    window.loadCommunityFeed = async () => {
        const grid = document.getElementById('community-grid');
        if (!grid) return;
        const testUsers = [{ handle: "@KingstonKing", caption: "Vibes at the festival! 🇯🇲🔥", avatar: "MK" }];
        let files = [];
        try {
            const res = await fetch(`${BASE}api/community?t=` + Date.now());
            const data = await res.json();
            files = data.files || [];
        } catch (e) {
            try {
                const res = await fetch(`${BASE}metadata.json?t=` + Date.now());
                const data = await res.json();
                files = data.community || [];
            } catch (err) { }
        }
        if (files.length > 0) {
            grid.innerHTML = files.map((f, index) => {
                const isVideo = f.match(/\.(mp4|webm|mov)$/i);
                const imgPath = f.startsWith('community/') ? `${BASE}${f}` : `${BASE}community/${f}`;
                const mediaTag = isVideo ? `<video src="${imgPath}" controls class="insta-media"></video>` : `<img src="${imgPath}" class="insta-media">`;
                const user = testUsers[index % testUsers.length];
                return `<div class="insta-card"><div class="card-tape"></div><div class="insta-header"><div class="insta-avatar">${user.avatar}</div><div class="insta-user-info"><span class="insta-user">${user.handle}</span></div></div><div class="insta-media-container">${mediaTag}</div><div class="insta-caption-wrapper"><p class="insta-caption-text">${user.caption}</p></div></div>`;
            }).join('');
        }
    };

    window.initPayPal = () => { /* PayPal Logic */ };

    window.loadInterviews = () => {
        const grid = document.getElementById('interviews-grid');
        const videos = [
            { id: 'ry5_XOMUQFI', title: 'Inside Small World Studio: A Conversation with Bravo', tagline: 'EXCLUSIVE FEATURE' },
            { id: 'K0GFxs5JBd8', title: 'A conversation with Mitchie Williams from Rockers International Records', tagline: 'CULTURE SPOTLIGHT' },
            { id: 'RVnqtapqZbY', title: 'Brand Jamaica Magazine Interview with Elina Holley and Super Flinda', tagline: 'LEGACY SERIES' }
        ];
        grid.innerHTML = videos.map(v => `
            <div class="film-strip-card"><div class="video-container-premium"><iframe src="https://www.youtube.com/embed/${v.id}?modestbranding=1&rel=0" allowfullscreen></iframe></div><div class="video-info-scrap"><span class="video-tagline">${v.tagline}</span><h3 class="video-title-scrap">${v.title}</h3></div></div>`).join('');
    };

    window.loadDocumentaries = () => {
        const grid = document.getElementById('documentaries-grid');
        const doc = { id: '5D9-1n26qBQ', title: 'Sonny Roberts - Documentary [ Brand Jamaica Magazine Shorts ]', tagline: 'CULTURAL ANTHOLOGY' };
        grid.innerHTML = `<div class="film-strip-card"><div class="video-container-premium"><iframe src="https://www.youtube.com/embed/${doc.id}?modestbranding=1&rel=0" allowfullscreen></iframe></div><div class="video-info-scrap"><span class="video-tagline">${doc.tagline}</span><h3 class="video-title-scrap">${doc.title}</h3></div></div>`;
    };

    window._loadMagazine = loadMagazine;
});
