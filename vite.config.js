import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Storage for community uploads on the local desktop
const uploadDir = path.resolve(__dirname, 'public/community');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

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
        
        // 1. Events API
        const eventsPath = path.resolve(__dirname, 'public/events.txt');
        if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, 'Reggae Sumfest - July\nRebel Salute - January');

        server.middlewares.use('/api/events', (req, res) => {
          if (req.method === 'GET') {
            const content = fs.readFileSync(eventsPath, 'utf8');
            const events = content.split('\n').filter(line => line.trim() !== '');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ events }));
          }
        });

        server.middlewares.use('/api/events-add', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
              const { event } = JSON.parse(body);
              fs.appendFileSync(eventsPath, '\n' + event);
              res.end(JSON.stringify({ success: true }));
            });
          }
        });

        // 2. Upload API
        server.middlewares.use('/api/upload', (req, res, next) => {
          if (req.method === 'POST' && req.url === '/') {
             upload.single('file')(req, res, (err) => {
               if (err) {
                 res.statusCode = 500;
                 return res.end(JSON.stringify({ error: err.message }));
               }
               res.end(JSON.stringify({ success: true, file: req.file.filename }));
             });
          } else {
            next();
          }
        });

        // 3. Volume Issues (Natural Sort for renamed files)
        server.middlewares.use('/api/issues', (req, res, next) => {
          const volumeId = req.url.split('/')[1];
          if (!volumeId) return next();

          const folderPath = path.resolve(__dirname, 'public/issues/volume_' + volumeId);
          if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath);
            const images = files.filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file));
            // Natural sort (1, 2, 10 instead of 1, 10, 2)
            images.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ pages: images }));
          } else {
            next();
          }
        });
      }
    }
  ]
});
