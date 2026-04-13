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
        height: '0', width: '0', videoId: 'KMxV_gRESWM',
        playerVars: { 'autoplay': 0, 'loop': 1, 'playlist': 'KMxV_gRESWM', 'controls': 0, 'showinfo': 0, 'modestbranding': 1 },
        events: { 'onReady': (event) => { event.target.setVolume(40); } }
    });
};

// --- AUTH & COMMUNITY LOGIC ---
window._currentUser = JSON.parse(localStorage.getItem('bjm_user')) || null;

window.openAuthModal = () => {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('active');
    window.toggleAuthMode('login');
};

window.closeAuthModal = () => {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
};

window.toggleAuthMode = (mode) => {
    const loginForm = document.getElementById('login-form'), signupForm = document.getElementById('signup-form'), success = document.getElementById('auth-success');
    if (mode === 'signup') { loginForm.classList.remove('active'); signupForm.classList.add('active'); } 
    else { loginForm.classList.add('active'); signupForm.classList.remove('active'); }
    success.classList.remove('auth-success-visible');
};

window.handleGoogleLogin = () => {
    // Placeholder for Google SSO Integration
    const user = { name: 'Google User', email: 'user@gmail.com', avatar: 'G', provider: 'google' };
    window._currentUser = user; localStorage.setItem('bjm_user', JSON.stringify(user));
    showAuthSuccess();
};

window.handleLogin = () => {
    const email = document.getElementById('login-email').value;
    if (email) {
        const user = { email, name: email.split('@')[0], avatar: email[0].toUpperCase(), provider: 'email' };
        window._currentUser = user; localStorage.setItem('bjm_user', JSON.stringify(user));
        showAuthSuccess();
    }
};

window.handleSignup = () => {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const notify = document.getElementById('signup-notify')?.checked;
    
    if (name && email) {
        const user = { name, email, avatar: name[0].toUpperCase(), provider: 'email', notify };
        window._currentUser = user; localStorage.setItem('bjm_user', JSON.stringify(user));
        console.log('User registered with notification consent:', notify);
        showAuthSuccess();
    }
};

function showAuthSuccess() {
    const modal = document.getElementById('auth-modal');
    document.getElementById('auth-form-container').style.display = 'none';
    document.getElementById('auth-success').classList.add('auth-success-visible');
    updateUserUI();
}

function updateUserUI() {
    const badges = document.querySelectorAll('.passport-cover');
    const eventFab = document.getElementById('event-upload-btn');
    
    if (window._currentUser) {
        badges.forEach(b => {
            const logo = b.querySelector('.passport-logo');
            const label = b.querySelector('.passport-label');
            if(logo && label) {
                logo.innerHTML = `<div class="user-avatar-visible" style="width:35px;height:35px;font-size:1rem;border-width:2px;box-shadow:none;transform:rotate(0);margin-bottom:5px;">${window._currentUser.avatar}</div>`;
                label.innerText = window._currentUser.name.toUpperCase();
                label.style.fontFamily = 'Inter';
                label.style.fontSize = '0.65rem';
                label.style.letterSpacing = '0px';
            }
        });
        if (eventFab) eventFab.style.display = 'flex';
    }
}

// --- UPLOAD & AI ENGINE ---
let currentUploadType = 'community';
window.openUploadModal = (type) => {
    if (!window._currentUser) {
        window.openAuthModal();
        return;
    }
    currentUploadType = type;
    const modal = document.getElementById('upload-modal'), title = document.getElementById('upload-modal-title'), eventFields = document.getElementById('event-only-fields');
    if (modal) modal.classList.add('active');
    if (type === 'event') { title.innerText = 'List Your Event'; eventFields.style.display = 'block'; }
    else { title.innerText = 'Share Your Vibe'; eventFields.style.display = 'none'; }
};

window.closeUploadModal = () => {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.classList.remove('active');
};

window.handleUpload = () => {
    const caption = document.getElementById('upload-caption').value, parish = document.getElementById('upload-parish').value;
    if (!caption) { alert('Please enter a caption!'); return; }
    
    const newEntry = {
        user: window._currentUser.name, caption, parish: currentUploadType === 'event' ? parish : null,
        img: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=500&q=80', type: currentUploadType
    };

    if (currentUploadType === 'event') {
        if (!window._communityEvents) window._communityEvents = [];
        window._communityEvents.unshift(newEntry); window.loadEvents();
    } else {
        if (!window._communityPosts) window._communityPosts = [];
        window._communityPosts.unshift(newEntry); window.loadCommunityFeed();
    }
    closeUploadModal();
    alert('Processed by AI & scrapbooked! 🇯🇲✨');
};

const ScrapbookEngine = {
    generateCard: (data) => {
        const rotation = (Math.random() * 6 - 3).toFixed(1), tapeRotation = (Math.random() * 20 - 10).toFixed(1), tapeX = (Math.random() * 40 + 30).toFixed(0);
        return `
        <div class="insta-card scrapbook-entry" style="transform: rotate(${rotation}deg);">
            <div class="card-tape" style="left: ${tapeX}%; transform: translateX(-50%) rotate(${tapeRotation}deg);"></div>
            <div class="insta-header"><div class="user-avatar-visible" style="width:30px; height:30px; font-size:0.8rem; transform:rotate(0deg);">${data.user[0]}</div><div class="insta-user-info"><span class="insta-user">@${data.user}</span></div></div>
            <div class="insta-media-container polaroid-frame"><img src="${data.img}" class="insta-media ai-filtered"></div>
            <div class="insta-caption-wrapper"><p class="insta-caption-text">${data.caption}</p>${data.parish ? `<div class="parish-stamp">APPROVED: ${data.parish}</div>` : ''}</div>
        </div>`;
    }
};

// --- SCENE NAVIGATION ---
window.showScene = (sceneId) => {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sceneId);
    if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
    if (sceneId === 'interviews-scene' || sceneId === 'documentaries-scene') ytPlayer?.pauseVideo?.();
    else if (window._musicStarted) ytPlayer?.playVideo?.();
    if (sceneId === 'events-scene') window.loadEvents?.();
    if (sceneId === 'hub-scene') window.loadCommunityFeed?.();
    if (sceneId === 'interviews-scene') window.loadInterviews?.();
    if (sceneId === 'documentaries-scene') window.loadDocumentaries?.();
};

window.goHome = () => { window.showScene('intro-scene'); const btnStart = document.getElementById('btn-start'); if (btnStart) btnStart.classList.remove('fly-away'); };

window.openVolume = async (volumeId) => {
    const carouselScene = document.getElementById('carousel-scene'), magazineScene = document.getElementById('magazine-scene');
    if (!carouselScene || !magazineScene) return;
    carouselScene.classList.remove('active'); magazineScene.classList.add('active');
    await new Promise(r => setTimeout(r, 700)); if (window._loadMagazine) await window._loadMagazine(String(volumeId));
};

document.addEventListener('DOMContentLoaded', async () => {
    updateUserUI();
    const btnStart = document.getElementById('btn-start'), introScene = document.getElementById('intro-scene'), carouselScene = document.getElementById('carousel-scene');
    let BASE = import.meta.env.BASE_URL || '/brand-jamaica-magazine/'; if (!BASE.endsWith('/')) BASE += '/';
    const birdAudio = new Audio(); birdAudio.src = `${BASE}Sound/bird.mp3`.replace(/\/\//g, '/'); birdAudio.load();

    if (btnStart && introScene) {
        function proceedToCarousel(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            try { birdAudio.play().catch(e => {}); } catch(e) {}
            if (!window._musicStarted) { ytPlayer?.playVideo?.(); window._musicStarted = true; }
            btnStart.classList.add('fly-away');
            setTimeout(() => { introScene.classList.remove('active'); carouselScene.classList.add('active'); window.showScene('carousel-scene'); }, 1000);
        }
        introScene.addEventListener('click', proceedToCarousel); btnStart.addEventListener('click', proceedToCarousel);
        introScene.addEventListener('touchend', proceedToCarousel, { passive: false });
    }

    // --- CAROUSEL ---
    const items = document.querySelectorAll('.carousel-item');
    let currentIndex = 0; const totalItems = items.length;
    function updateCarousel() {
        items.forEach((item, index) => {
            let dist = index - currentIndex; if (dist > totalItems / 2) dist -= totalItems; if (dist < -totalItems / 2) dist += totalItems;
            const absDist = Math.abs(dist);
            if (dist === 0) { item.style.transform = `translateX(0) translateZ(0) rotateY(0deg) scale(1)`; item.style.zIndex = 10; item.style.opacity = 1; } 
            else if (absDist === 1) { const side = dist > 0 ? 1 : -1; item.style.transform = `translateX(${side * 85}%) translateZ(-150px) rotateY(${side * -20}deg) scale(0.82)`; item.style.zIndex = 5; item.style.opacity = 0.85; } 
            else if (absDist === 2) { const side = dist > 0 ? 1 : -1; item.style.transform = `translateX(${side * 145}%) translateZ(-300px) rotateY(${side * -40}deg) scale(0.65)`; item.style.zIndex = 1; item.style.opacity = 0.35; } 
            else { item.style.transform = `translateX(${Math.sign(dist) * 200}%) translateZ(-500px) scale(0.4)`; item.style.zIndex = 0; item.style.opacity = 0; }
        });
    }
    document.getElementById('btn-next')?.addEventListener('click', () => { currentIndex = (currentIndex + 1) % totalItems; updateCarousel(); });
    document.getElementById('btn-prev')?.addEventListener('click', () => { currentIndex = (currentIndex - 1 + totalItems) % totalItems; updateCarousel(); });
    updateCarousel();

    // --- MAGAZINE & SECTIONS ---
    let metadata = null; try { const metaRes = await fetch('./metadata.json'); if (metaRes.ok) metadata = await metaRes.json(); } catch (e) { }

    window.loadEvents = async () => {
        const grid = document.getElementById('events-grid'); if (!grid) return;
        const mockEvents = [{ user: 'EventsTeam', caption: 'Beat Street Fridays - oranje streetvibes!', parish: 'KINGSTON', img: `${BASE}events/beat-street-fridays.jpg` }];
        grid.innerHTML = (window._communityEvents || []).concat(mockEvents).map(e => ScrapbookEngine.generateCard(e)).join('');
    };

    window.loadCommunityFeed = async () => {
        const grid = document.getElementById('community-grid'); if (!grid) return;
        let files = []; try { const res = await fetch(`${BASE}metadata.json`); const data = await res.json(); files = data.community || []; } catch (err) { }
        const mockPosts = (window._communityPosts || []).map(p => ScrapbookEngine.generateCard(p)).join('');
        const feedHTML = files.map(f => ScrapbookEngine.generateCard({ user: 'IslandVibes', caption: 'Sharing the energy! 🇯🇲', img: `${BASE}community/${f}` })).join('');
        grid.innerHTML = mockPosts + feedHTML;
    };

    window.loadInterviews = () => {
        const grid = document.getElementById('interviews-grid'); 
        const videos = [
            { id: 'ry5_XOMUQFI', title: 'Inside Small World Studio: A Conversation with Bravo', tagline: 'EXCLUSIVE FEATURE' }, 
            { id: 'K0GFxs5JBd8', title: 'A conversation with Mitchie Williams from Rockers International Records', tagline: 'CULTURE SPOTLIGHT' }, 
            { id: 'RVnqtapqZbY', title: 'Brand Jamaica Magazine Interview with Elina Holley and Super Flinda', tagline: 'LEGACY SERIES' }
        ];
        if (grid) grid.innerHTML = videos.map(v => `<div class="film-strip-card"><div class="video-container-premium"><iframe src="https://www.youtube.com/embed/${v.id}?modestbranding=1&rel=0" allowfullscreen></iframe></div><div class="video-info-scrap"><span class="video-tagline">${v.tagline}</span><h3 class="video-title-scrap">${v.title}</h3></div></div>`).join('');
    };

    window.loadDocumentaries = () => {
        const grid = document.getElementById('documentaries-grid'); 
        const doc = { id: '5D9-1n26qBQ', title: 'Sonny Roberts - Documentary [ Brand Jamaica Magazine Shorts ]', tagline: 'CULTURAL ANTHOLOGY' };
        if (grid) grid.innerHTML = `<div class="film-strip-card"><div class="video-container-premium"><iframe src="https://www.youtube.com/embed/${doc.id}?modestbranding=1&rel=0" allowfullscreen></iframe></div><div class="video-info-scrap"><span class="video-tagline">${doc.tagline}</span><h3 class="video-title-scrap">${doc.title}</h3></div></div>`;
    };

    window._loadMagazine = async (volumeId) => {
        const bookEl = document.getElementById('book'); let pages = metadata?.issues?.[`volume_${volumeId}`] || [];
        bookEl.innerHTML = pages.map(f => `<div class="page"><div class="page-content"><img src="${BASE}issues/volume_${volumeId}/${f}" class="magazine-page-img"></div></div>`).join('') + `<div class="page hard"><h2>Brand Jamaica 🇯🇲</h2></div>`;
        const vw = window.innerWidth, isMobile = vw < 768;
        const pageFlip = new PageFlip(bookEl, { width: isMobile ? vw*0.85 : 450, height: isMobile ? window.innerHeight*0.75 : 600, size: 'stretch', showCover: false, usePortrait: isMobile });
        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    };
});
