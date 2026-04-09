import { PageFlip } from 'page-flip';

document.addEventListener('DOMContentLoaded', async () => {
    
    let metadata = null;
    let pageFlip = null;
    
    // Function to safely encode image paths (handling spaces/backticks)
    const encodePath = (path) => {
        return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    };
    
    // Attempt to load the static metadata map
    try {
        const metaRes = await fetch('./metadata.json');
        if (metaRes.ok) {
            metadata = await metaRes.json();
        } else {
            throw new Error('Metadata not found');
        }
    } catch(e) {
        console.warn('Metadata not found, falling back to dynamic API');
    }

    // --- 0. LOGO LOGIC ---
    try {
        let logoSrc = null;
        if (metadata && metadata.logo) {
            logoSrc = metadata.logo;
        } else {
            const res = await fetch('./api/logo');
            const data = await res.json();
            logoSrc = data.logo;
        }

        if (logoSrc) {
            const logoContainer = document.getElementById('logo-container');
            logoContainer.innerHTML = `<img src="${encodePath(logoSrc)}" alt="Brand Jamaica Logo" style="max-height: 120px; object-fit: contain; margin-bottom: 20px;" />`;
        }
    } catch(e) {
        console.warn('Could not load logo');
    }

    // --- 1. CAROUSEL LOGIC ---
    const carousel = document.querySelector('.carousel');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const items = document.querySelectorAll('.carousel-item');
    
    let currentAngle = 0;
    const itemAngle = 120;

    if (btnNext && btnPrev && carousel) {
        btnNext.addEventListener('click', () => {
            currentAngle -= itemAngle;
            carousel.style.transform = `rotateY(${currentAngle}deg)`;
        });

        btnPrev.addEventListener('click', () => {
            currentAngle += itemAngle;
            carousel.style.transform = `rotateY(${currentAngle}deg)`;
        });
    }

    // --- 2. SCENE TRANSITION LOGIC ---
    const carouselScene = document.getElementById('carousel-scene');
    const magazineScene = document.getElementById('magazine-scene');
    const btnBack = document.getElementById('btn-back');
    const bookContainerEl = document.getElementById('book');
    const bookWrapper = document.querySelector('.book-container');

    items.forEach(item => {
        item.addEventListener('click', async () => {
            const volumeId = item.getAttribute('data-volume');
            
            // Switch Scenes FIRST
            carouselScene.classList.remove('active');
            magazineScene.classList.add('active');
            
            // WAIT for the transition (0.6s) so dimensions are stable
            await new Promise(r => setTimeout(r, 650));
            
            // THEN load and initialize
            await loadMagazine(volumeId);
        });
    });

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            magazineScene.classList.remove('active');
            setTimeout(() => {
                carouselScene.classList.add('active');
                if(pageFlip) {
                    pageFlip.destroy();
                    pageFlip = null;
                    bookContainerEl.innerHTML = '';
                }
            }, 600);
        });
    }

    // Handle Window Resize to update flip
    window.addEventListener('resize', () => {
        if (pageFlip) {
            // Re-calculate responsiveness settings
            const dims = getResponsiveDimensions();
            pageFlip.updateElementStyles(dims.width, dims.height);
        }
    });

    function getResponsiveDimensions() {
        // Calculate based on window size
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        
        let width = 450;
        let height = 600;
        
        if (winW < 1000) {
            width = winW * 0.42;
            height = width * 1.33;
        }
        
        return { width, height };
    }

    // --- 3. PAGE FLIP LOGIC ---
    async function loadMagazine(volumeId) {
        let coverImage = '';
        let contentPages = '';

        if(volumeId === '1') coverImage = './cover-culture.png';
        else if(volumeId === '2') coverImage = './cover-cuisine.png';
        else coverImage = './cover-landscape.png';

        let pagesToLoad = [];

        if (metadata && metadata.issues) {
            const issueKey = `volume_${volumeId}`;
            if (metadata.issues[issueKey]) {
                pagesToLoad = metadata.issues[issueKey];
            }
        } 
        
        if (pagesToLoad.length === 0) {
            try {
                const apiRes = await fetch(`./api/issues/${volumeId}`);
                const data = await apiRes.json();
                pagesToLoad = data.pages || [];
            } catch(e) {}
        }

        if (pagesToLoad.length > 0) {
            pagesToLoad.forEach((filename, index) => {
                const safeUrl = encodePath(`/issues/volume_${volumeId}/${filename}`);
                contentPages += `
                <div class="page page-cover">
                    <div class="page-content" style="padding:0; background: white;">
                         <img src="${safeUrl}" alt="Page ${index + 1}" class="magazine-page-img">
                    </div>
                </div>`;
            });
        }

        // Final Book HTML
        bookContainerEl.innerHTML = `
            <div class="page page-cover hard">
                <div class="page-content" style="padding:0;">
                    <img src="${coverImage}" alt="Cover" style="width:100%; height:100%; object-fit:cover;">
                </div>
            </div>
            ${contentPages}
            <div class="page page-cover hard">
                <div class="page-content" style="align-items:center; justify-content:center; background:#eee;">
                    <h2>Thank You</h2>
                    <p>Brand Jamaica Magazine</p>
                </div>
            </div>
        `;

        const dims = getResponsiveDimensions();

        pageFlip = new PageFlip(bookContainerEl, {
            width: dims.width, 
            height: dims.height, 
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            showCover: true,
            mobileScrollSupport: true,
            drawShadow: true,
            flippingTime: 1200,
            usePortrait: false, // Double spread look
            maxShadowOpacity: 0.8,
            showPageCorners: true,
            swipeDistance: 50,
            clickEventForward: true
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    // --- 4. NAVIGATION UTILITIES ---
    window.showScene = (sceneId) => {
        document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
        document.getElementById(sceneId).classList.add('active');
        
        if (sceneId === 'events-scene') loadEvents();
        if (sceneId === 'shop-scene') initPayPal();
    };

    // --- 5. EVENTS LOGIC ---
    async function loadEvents() {
        const list = document.getElementById('events-list');
        try {
            const res = await fetch('./api/events');
            const data = await res.json();
            list.innerHTML = data.events.map(e => `<div class="event-item">• ${e}</div>`).join('');
        } catch(e) {
            list.innerHTML = 'Add your first event below!';
        }
    }

    document.getElementById('btn-add-event')?.addEventListener('click', async () => {
        const input = document.getElementById('event-input');
        if (!input.value) return;
        
        await fetch('./api/events-add', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ event: input.value })
        });
        input.value = '';
        loadEvents();
    });

    // --- 6. PAYPAL LOGIC ---
    function initPayPal() {
        if (window.paypal) {
            const container = document.getElementById('paypal-button-container');
            if (container.innerHTML !== '') return;
            
            window.paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: { value: '25.00' }
                        }]
                    });
                },
                onApprove: (data, actions) => {
                    return actions.order.capture().then(details => {
                        alert('Transaction completed by ' + details.payer.name.given_name);
                    });
                }
            }).render('#paypal-button-container');
        }
    }

    // --- 7. UPLOAD LOGIC ---
    document.getElementById('btn-upload')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('upload-file');
        const nameInput = document.getElementById('upload-name');
        if (!fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('name', nameInput.value || 'Anonymous');

        const btn = document.getElementById('btn-upload');
        btn.innerText = 'Uploading...';
        
        await fetch('./api/upload', {
            method: 'POST',
            body: formData
        });
        
        btn.innerText = 'Upload Successful!';
        fileInput.value = '';
        // Load feed here...
    });
});
