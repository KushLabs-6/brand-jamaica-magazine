import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  // Custom URL mapping setup
  server: {
    host: '0.0.0.0', 
    port: 5173,
    allowedHosts: true // Allow access via IP or any local domain
  },
  plugins: [
    {
      name: 'magazine-dynamic-pages-api',
      configureServer(server) {
        
        // 1. Logo Discovery API
        server.middlewares.use('/api/logo', (req, res, next) => {
          try {
            const folderPath = path.resolve(__dirname, 'public/logo');
            if (fs.existsSync(folderPath)) {
              const files = fs.readdirSync(folderPath);
              const images = files.filter(file => /\.(png|jpe?g|gif|svg|webp)$/i.test(file));
              if(images.length > 0) {
                 res.setHeader('Content-Type', 'application/json');
                 res.end(JSON.stringify({ logo: '/logo/' + images[0] }));
                 return;
              }
            }
          } catch(e) {}
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ logo: null }));
        });

        // 2. Volume Issues API
        server.middlewares.use('/api/issues', (req, res, next) => {
          if (!req.url.startsWith('/')) return next();
          
          // E.g., /api/issues/1 -> extracts '1'
          const volumeId = req.url.split('/')[1]; 
          if (!volumeId) return next();

          try {
            const folderPath = path.resolve(__dirname, 'public/issues/volume_' + volumeId);
            if (fs.existsSync(folderPath)) {
              // Read all files in the directory
              const files = fs.readdirSync(folderPath);
              // Filter out non-images
              const images = files.filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file));
              // Sort them naturally (e.g. 1.jpg, 2.jpg)
              images.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ pages: images }));
              return;
            } else {
               res.setHeader('Content-Type', 'application/json');
               res.end(JSON.stringify({ pages: [] }));
               return;
            }
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
            return;
          }
        });
      }
    }
  ]
});
