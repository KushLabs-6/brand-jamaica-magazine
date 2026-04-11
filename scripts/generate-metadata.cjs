const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');
const metadataPath = path.resolve(publicDir, 'metadata.json');

function generateMetadata() {
    const metadata = {
        logo: null,
        issues: {
            volume_1: [],
            volume_2: [],
            volume_3: []
        }
    };

    // 1. Scan Logo
    const logoDir = path.join(publicDir, 'logo');
    if (fs.existsSync(logoDir)) {
        const files = fs.readdirSync(logoDir);
        const images = files.filter(file => /\.(png|jpe?g|gif|svg|webp)$/i.test(file));
        if (images.length > 0) {
            metadata.logo = '/logo/' + images[0];
        }
    }

    // 2. Scan Issues
    for (let i = 1; i <= 3; i++) {
        const issueDir = path.join(publicDir, `issues/volume_${i}`);
        if (fs.existsSync(issueDir)) {
            const files = fs.readdirSync(issueDir);
            const images = files.filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file));
            // Natural sort
            images.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            metadata.issues[`volume_${i}`] = images;
        }
    }

    // 3. Scan Community
    metadata.community = [];
    const communityDir = path.join(publicDir, 'community');
    if (fs.existsSync(communityDir)) {
        const files = fs.readdirSync(communityDir);
        metadata.community = files.filter(file => /\.(png|jpe?g|gif|svg|webp|mp4|webm|mov)$/i.test(file));
    }

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('✅ Metadata generated at public/metadata.json');
}

generateMetadata();
