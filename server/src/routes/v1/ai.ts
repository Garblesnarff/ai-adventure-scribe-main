import { Router } from 'express';
import aiBlogRouter from './ai/blog.js';

export default function aiRouter() {
    const router = Router();
    router.use('/blog', aiBlogRouter());
    return router;
}
