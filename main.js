import { PageFlip } from 'page-flip';

document.addEventListener('DOMContentLoaded', async () => {
    
    let metadata = null;
    
    // Function to safely encode image paths (handling spaces/backticks)
    const encodePath = (path) => {
        return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    };
    
    // Attempt to load the static metadata map (crucial for GitHub Pages / Standalone)
    try {
        const metaRes = await fetch('./metadata.json');
        if (metaRes.ok) {
            metadata = await metaRes.json();
            console.log('Using static metadata:', metadata);
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
            // USE ENCODED PATH for the logo
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
    const itemAngle = 120; // 3 items = 360 / 3

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

    if (btnBack) {
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
    }

    // --- 3. PAGE FLIP (MAGAZINE) LOGIC ---
    async function loadMagazine(volumeId) {
        
        let coverImage = '';
        let title = '';
        let contentPages = '';

        // Base cover images (should be consistent)
        if(volumeId === '1') {
            coverImage = './cover-culture.png';
            title = 'Vol 1: The Culture';
        } else if(volumeId === '2') {
            coverImage = './cover-cuisine.png';
            title = 'Vol 2: The Flavor';
        } else {
            coverImage = './cover-landscape.png';
            title = 'Vol 3: The Landscape';
        }

        let pagesToLoad = [];

        // Check metadata first (Production/Static Mode)
        if (metadata && metadata.issues) {
            const issueKey = `volume_${volumeId}`;
            if (metadata.issues[issueKey]) {
                pagesToLoad = metadata.issues[issueKey];
            }
        } 
        
        // If metadata is empty, try the API (Dev Mode)
        if (pagesToLoad.length === 0) {
            try {
                const apiRes = await fetch(`./api/issues/${volumeId}`);
                const data = await apiRes.json();
                pagesToLoad = data.pages || [];
            } catch(e) {
                console.warn('Could not connect to local dynamic API', e);
            }
        }

        // Generate the HTML for the pages
        if (pagesToLoad.length > 0) {
            pagesToLoad.forEach((filename, index) => {
                // ENCODE FILENAME to handle spaces or special characters
                const safeUrl = encodePath(`/issues/volume_${volumeId}/${filename}`);
                contentPages += `
                <div class="page page-cover">
                    <div class="page-content" style="padding:0; background: #fff;">
                         <img src="${safeUrl}" alt="Page ${index + 1}" style="width:100%; height:100%; object-fit:fill; display:block;">
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
                                <img src="./cover-culture.png" alt="Culture">
                                <div class="tape"></div>
                            </div>
                            <p class="page-text">Reggae is not just music. It carries the spirit of love and unity.<br/><br/>Explore the <span class="interactive-hover" data-preview-img="./cover-culture.png" data-preview-title="Watch: Bob Marley Documentary" data-preview-desc="A brief look into the legend.">early days of Bob Marley</span>.</p>
                            <div class="page-number right">1</div>
                        </div>
                    </div>
                `;
            } else {
                 contentPages = `
                    <div class="page">
                        <div class="page-content">
                            <div class="page-title">Issue Ongoing</div>
                            <p class="page-text">Content is being curated for this issue. Check back soon!</p>
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

        // Initialize PageFlip with premium, slower, more elegant animation
        pageFlip = new PageFlip(bookContainerEl, {
            width: 450, 
            height: 600, 
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            showCover: true,
            mobileScrollSupport: true,
            drawShadow: true,
            flippingTime: 1200, // Slower, more 'expensive' feel
            usePortrait: true,
            maxShadowOpacity: 0.8,
            showPageCorners: true, // Allow user to peel corners
            swipeDistance: 50,
            clickEventForward: true
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
        setupHoverPreviews();
    }

    function setupHoverPreviews() {
        const hoverElements = document.querySelectorAll('.interactive-hover');
        const previewEl = document.getElementById('hover-preview');
        const previewContent = previewEl?.querySelector('.preview-content');

        if (!previewEl || !previewContent) return;

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
        });
    }
});
