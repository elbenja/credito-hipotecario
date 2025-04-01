import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Connect } from 'vite';
import type { ServerResponse } from 'http';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 8080,
      host: true,
      open: true, // Open browser on start
      hmr: {
        overlay: true, // Show errors in browser
      },
      // Simplified middleware for handling client-side routing
      middlewares: [
        (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          // Check if the request is for an API or static file
          const isApiRequest = req.url?.startsWith('/api/');
          const isStaticFile = req.url?.match(/\.(css|js|ico|png|jpg|jpeg|svg|json)$/);
          
          if (!isApiRequest && !isStaticFile && req.url !== '/') {
            // For all other routes, serve the index.html
            req.url = '/index.html';
          }
          next();
        }
      ],
    },
    build: {
      sourcemap: true,
      outDir: "dist",
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            router: ["react-router-dom"],
          },
        },
      },
    },
    // Handle SPA routing
    preview: {
      port: 8080,
      strictPort: true,
      host: true,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  };
});
