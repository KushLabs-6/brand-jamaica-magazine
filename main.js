import { PageFlip } from 'page-flip';

document.addEventListener('DOMContentLoaded', async () => {
    
    let metadata = null;
    
    // Attempt to load the static metadata map (crucial for GitHub Pages / Standalone)
    try {
        const metaRes = await fetch('/metadata.json');
        metadata = await metaRes.json();
        console.log('Using static metadata:', metadata);
    } catch(e) {
        console.warn('Metadata not found, falling back to dynamic API');
    }

    // --- 0. LOGO LOGIC ---
    try {
        let logoSrc = null;
        if (metadata && metadata.logo) {
            logoSrc = metadata.logo;
        } else {
            const res = await fetch('/api/logo');
            const data = await res.json();
            logoSrc = data.logo;
        }

        if (logoSrc) {
            const logoContainer = document.getElementById('logo-container');
            logoContainer.innerHTML = `<img src="${logoSrc}" alt="Brand Jamaica Logo" style="max-height: 120px; object-fit: contain; margin-bottom: 20px;" />`;
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
    const itemAngle = 120; // 3 items = 360 / 3

    btnNext.addEventListener('click', () => {
        currentAngle -= itemAngle;
        carousel.style.transform = `rotateY(${currentAngle}deg)`;
    });

    btnPrev.addEventListener('click', () => {
        currentAngle += itemAngle;
        carousel.style.transform = `rotateY(${currentAngle}deg)`;
    });

    // --- 2. SCENE TRANSITION LOGIC ---
    const carouselScene = document.getElementById('carousel-scene');
    const magazineScene = document.getElementById('magazine-scene');
    const btnBack = document.getElementById('btn-back');
    const bookContainerEl = document.getElementById('book');
    
    let pageFlip = null;

    items.forEach(item => {
        item.addEventListener('click', () => {
            const volumeId = item.getAttribute('data-volume');
            loadMagazine(volumeId);
            
            // Switch Scenes
            carouselScene.classList.remove('active');
            setTimeout(() => {
                magazineScene.classList.add('active');
            }, 600);
        });
    });

    btnBack.addEventListener('click', () => {
        magazineScene.classList.remove('active');
        setTimeout(() => {
            carouselScene.classList.add('active');
            // Destroy book to free memory
            if(pageFlip) {
                pageFlip.destroy();
                pageFlip = null;
                bookContainerEl.innerHTML = '';
            }
        }, 600);
    });

    // --- 3. PAGE FLIP (MAGAZINE) LOGIC ---
    async function loadMagazine(volumeId) {
        
        let coverImage = '';
        let title = '';
        let contentPages = '';

        if(volumeId === '1') {
            coverImage = '/cover-culture.png';
            title = 'Vol 1: The Culture';
        } else if(volumeId === '2') {
            coverImage = '/cover-cuisine.png';
            title = 'Vol 2: The Flavor';
        } else {
            coverImage = '/cover-landscape.png';
            title = 'Vol 3: The Landscape';
        }

        let pagesToLoad = [];

        // Check metadata first (Production/Static Mode)
        if (metadata && metadata.issues[`volume_${volumeId}`]) {
            pagesToLoad = metadata.issues[`volume_${volumeId}`];
        } else {
            // Check the local API (Development Mode)
            try {
                const apiRes = await fetch(`/api/issues/${volumeId}`);
                const data = await apiRes.json();
                pagesToLoad = data.pages || [];
            } catch(e) {
                console.warn('Could not connect to local dynamic API', e);
            }
        }

        // Generate the HTML for the pages
        if (pagesToLoad.length > 0) {
            pagesToLoad.forEach((filename, index) => {
                contentPages += `
                <div class="page page-cover">
                    <div class="page-content" style="padding:0;">
                        <img src="/issues/volume_${volumeId}/${filename}" alt="Page ${index + 1}" style="width:100%; height:100%; object-fit:contain; background-color:white;">
                    </div>
                </div>`;
            });
        }

        // If no dynamic pages were found, inject our default mock content!
        if (!contentPages) {
            if(volumeId === '1') {
                contentPages = `
                    <div class="page">
                        <div class="page-content">
                            <div class="page-title">The Heartbeat</div>
                            <div class="page-subtitle">Origins of Reggae</div>
                            <div class="scrap-image-container">
                                <img src="/cover-culture.png" alt="Culture">
                                <div class="tape"></div>
                            </div>
                            <p class="page-text">Reggae is not just music; it is the heartbeat of Jamaica. Born in the vibrant streets of Kingston, it carries the spirit of resistance, love, and unity. The pulsating bass and syncopated rhythms create an unmistakable sound that moved beyond the shores of the island to conquer the world.<br/><br/>Explore the <span class="interactive-hover" data-preview-img="/cover-culture.png" data-preview-title="Watch: Bob Marley Documentary" data-preview-desc="A brief look into the legend.">early days of Bob Marley</span> and the shaping of a global movement.</p>
                            <div class="page-number right">1</div>
                        </div>
                    </div>
                `;
            } else if(volumeId === '2') {
                contentPages = `
                    <div class="page">
                        <div class="page-content">
                            <div class="page-title">Fire & Spice</div>
                            <div class="page-subtitle">The Magic of Jerk</div>
                            <div class="scrap-image-container">
                                <img src="/cover-cuisine.png" alt="Jerk Chicken">
                                <div class="tape"></div>
                            </div>
                            <div class="page-number right">1</div>
                        </div>
                    </div>
                `;
            } else {
                 contentPages = `
                    <div class="page">
                        <div class="page-content">
                            <div class="page-title">Paradise Found</div>
                            <div class="page-subtitle">Beaches & Waterfalls</div>
                            <div class="scrap-image-container">
                                <img src="/cover-landscape.png" alt="Landscape">
                                <div class="tape"></div>
                            </div>
                            <div class="page-number right">1</div>
                        </div>
                    </div>
                `;
            }
        }

        // Build DOM structure for the book
        bookContainerEl.innerHTML = `
            <div class="page page-cover hard">
                <div class="page-content" style="padding:0;">
                    <img src="${coverImage}" alt="Cover">
                </div>
            </div>
            ${contentPages}
            <div class="page page-cover hard">
                <div class="page-content" style="align-items:center; justify-content:center;">
                    <h2>Thank You for Reading</h2>
                    <p>Brand Jamaica Magazine</p>
                </div>
            </div>
        `;

        // Initialize PageFlip
        pageFlip = new PageFlip(bookContainerEl, {
            width: 450, // Base page width
            height: 600, // Base page height
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            showCover: true,
            mobileScrollSupport: false,
            drawShadow: true,
            flippingTime: 1000,
            usePortrait: true,
            maxShadowOpacity: 0.5,
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
        setupHoverPreviews();
    }

    function setupHoverPreviews() {
        const hoverElements = document.querySelectorAll('.interactive-hover');
        const previewEl = document.getElementById('hover-preview');
        const previewContent = previewEl.querySelector('.preview-content');

        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const imgSrc = el.getAttribute('data-preview-img');
                const title = el.getAttribute('data-preview-title');
                const desc = el.getAttribute('data-preview-desc');
                previewContent.innerHTML = `<img src="${imgSrc}" alt="${title}"><h4>${title}</h4><p>${desc}</p>`;
                const rect = el.getBoundingClientRect();
                previewEl.style.left = (rect.left + (rect.width/2)) + 'px';
                previewEl.style.top = rect.top + 'px';
                previewEl.classList.add('active');
            });
            el.addEventListener('mouseleave', () => { previewEl.classList.remove('active'); });
            el.addEventListener('mousemove', (e) => { previewEl.style.left = e.clientX + 'px'; previewEl.style.top = (e.clientY - 15) + 'px'; });
        });
    }
});
