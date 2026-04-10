import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const multer = require('multer');

// Storage for community uploads on the local desktop  
const uploadDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'public/community');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const __dirname = path.dirname(new URL(import.meta.url).pathname.slice(1));

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  },
  plugins: [
    {
      name: 'brand-jamaica-backend',
      configureServer(server) {

        // 1. Events API - reads/writes events.txt
        const eventsPath = path.resolve(__dirname, 'public/events.txt');
        if (!fs.existsSync(eventsPath)) {
          fs.writeFileSync(eventsPath, 'Reggae Sumfest - Montego Bay - July\nRebel Salute - St. Elizabeth - January\nJamaica Jazz & Blues Festival - February');
        }

        server.middlewares.use('/api/events', (req, res, next) => {
          if (req.method === 'GET') {
            try {
              const content = fs.readFileSync(eventsPath, 'utf8');
              const events = content.split('\n').filter(l => l.trim() !== '');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ events }));
            } catch (e) {
              res.end(JSON.stringify({ events: [] }));
            }
          } else {
            next();
          }
        });

        server.middlewares.use('/api/events-add', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
              try {
                const { event } = JSON.parse(body);
                if (event) fs.appendFileSync(eventsPath, '\n' + event.trim());
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid request' }));
              }
            });
          } else {
            next();
          }
        });

        // 2. Community Upload API
        server.middlewares.use('/api/upload', (req, res, next) => {
          if (req.method === 'POST') {
            upload.single('file')(req, res, (err) => {
              if (err) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message }));
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, file: req.file?.filename }));
            });
          } else {
            next();
          }
        });

        // 3. Community Feed - list uploaded files
        server.middlewares.use('/api/community', (req, res) => {
          try {
            const files = fs.readdirSync(uploadDir)
              .filter(f => /\.(png|jpe?g|gif|webp|mp4|webm|mov)$/i.test(f))
              .sort((a, b) => b.localeCompare(a)); // newest first
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ files }));
          } catch (e) {
            res.end(JSON.stringify({ files: [] }));
          }
        });

        // 3.5. Desktop Pipeline for physical magazine assets 
        server.middlewares.use('/issues', (req, res, next) => {
            const desktopIssuesRoot = 'C:\\Users\\demol\\Desktop\\Brand Jamaica Magazine\\public\\issues';
            const requestedPath = decodeURIComponent(req.url.split('?')[0]);
            const targetPath = path.join(desktopIssuesRoot, requestedPath);
            if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
                const ext = path.extname(targetPath).toLowerCase();
                if (ext === '.png') res.setHeader('Content-Type', 'image/png');
                if (ext === '.jpg' || ext === '.jpeg') res.setHeader('Content-Type', 'image/jpeg');
                res.end(fs.readFileSync(targetPath));
            } else {
                next();
            }
        });

        // 4. Volume Issues API - natural sort (Mapped to Desktop)
        server.middlewares.use('/api/issues', (req, res, next) => {
          const volumeId = req.url.split('/').filter(Boolean)[0];
          if (!volumeId) return next();
          const folderPath = 'C:\\Users\\demol\\Desktop\\Brand Jamaica Magazine\\public\\issues\\volume_' + volumeId;
          if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath);
            const images = files
              .filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f))
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ pages: images }));
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ pages: [] }));
          }
        });

        // 5. Logo API
        server.middlewares.use('/api/logo', (req, res) => {
          try {
            const logoDir = path.resolve(__dirname, 'public/logo');
            const files = fs.readdirSync(logoDir).filter(f => /\.(png|jpe?g|gif|svg|webp)$/i.test(f));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ logo: files.length > 0 ? '/logo/' + files[0] : null }));
          } catch (e) {
            res.end(JSON.stringify({ logo: null }));
          }
        });
      }
    }
  ]
});
