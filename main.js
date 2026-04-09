import { PageFlip } from 'page-flip';
import './style.css';

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
        btnStart.addEventListener('click', () => {
            // Gamified Hummingbird click - bird flies away!
            btnStart.classList.add('fly-away');
            setTimeout(() => {
               introScene.classList.remove('active');
               carouselScene.classList.add('active');
            }, 800); // Wait for bird to fly off screen
        });
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

    let currentAngle = 0;
    const itemAngle = 120;

    btnNext?.addEventListener('click', () => {
        currentAngle -= itemAngle;
        carousel.style.transform = `rotateY(${currentAngle}deg)`;
    });

    btnPrev?.addEventListener('click', () => {
        currentAngle += itemAngle;
        carousel.style.transform = `rotateY(${currentAngle}deg)`;
    });

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
        const w = window.innerWidth;
        const width = w < 1000 ? w * 0.42 : 450;
        return { width, height: Math.round(width * 1.33) };
    }

    // --- 4. LOAD MAGAZINE PAGES  ---
    async function loadMagazine(volumeId) {
        const coverMap = { '1': './cover-culture.png', '2': './cover-cuisine.png', '3': './cover-landscape.png' };
        const coverImage = coverMap[volumeId] || './cover-culture.png';

        let pages = [];

        // Try static metadata first
        if (metadata?.issues?.[`volume_${volumeId}`]?.length > 0) {
            pages = metadata.issues[`volume_${volumeId}`];
        } else {
            // Fallback to dev API
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
                <div class="page-content" style="padding:0; background:#fff;">
                    <img src="${url}" alt="Page ${i+1}" class="magazine-page-img">
                </div>
            </div>`;
        }).join('');

        bookEl.innerHTML = `
            <div class="page page-cover hard">
                <div class="page-content" style="padding:0;">
                    <img src="${coverImage}" alt="Cover" style="width:100%;height:100%;object-fit:cover;">
                </div>
            </div>
            ${pageHTML}
            <div class="page page-cover hard">
                <div class="page-content" style="display:flex;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(135deg,#009b3a,#fed100);color:white;text-align:center;">
                    <h2 style="font-family:'Caveat',cursive;font-size:3rem;">One Love 🇯🇲</h2>
                    <p>Brand Jamaica Magazine</p>
                </div>
            </div>`;

        const dims = responsiveDims();
        pageFlip = new PageFlip(bookEl, {
            width: dims.width,
            height: dims.height,
            size: 'stretch',
            minWidth: 300,
            maxWidth: 1000,
            minHeight: 400,
            maxHeight: 1400,
            showCover: true,
            mobileScrollSupport: true,
            drawShadow: true,
            flippingTime: 1000,
            usePortrait: false,
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
