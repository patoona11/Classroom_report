import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/sheet': {
        target: 'https://docs.google.com',
        changeOrigin: true,
        rewrite: (path) => '/spreadsheets/d/11j3QJ9IQlG3NX3UGJKsPjyuFXGdYWhSvaOI0geRLcIo/export?format=csv'
      }
    }
  }
});
