import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import BlogAdmin from './pages/BlogAdmin';
import BlogEditor from './pages/BlogEditor';
import BlogIndex from './pages/BlogIndex';
import BlogPost from './pages/BlogPost';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<BlogIndex />} />
          <Route path="/:slug" element={<BlogPost />} />

          {/* Admin routes */}
          <Route path="/admin" element={<BlogAdmin />} />
          <Route path="/admin/posts/new" element={<BlogEditor />} />
          <Route path="/admin/posts/:id" element={<BlogEditor />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
