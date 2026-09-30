import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';
import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';
import firebaseConfig from './firebase-applet-config.json';
import { DEFAULT_EDUCATION_INSTITUTIONS } from './src/data/defaultEducation';

dotenv.config();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize Firebase Admin SDK
const adminApps = getAdminApps();
const adminApp = adminApps.length > 0 
  ? getAdminApp() 
  : (() => {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
          return initAdminApp({
            credential: cert(serviceAccount),
            projectId: firebaseConfig.projectId
          });
        } catch {
          return initAdminApp({
            projectId: firebaseConfig.projectId
          });
        }
      }
      return initAdminApp({
        projectId: firebaseConfig.projectId
      });
    })();

const adminDb = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(adminApp, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Allowed safe media mime types to prevent stored XSS
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'audio/webm': '.webm',
  'audio/mp3': '.mp3',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'application/pdf': '.pdf'
};

// Typed Auth Middleware
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
  }
  const token = header.slice(7).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or revoked session token' });
  }
}

// Admin Authorization Middleware
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.admin === true || ['admin', 'superadmin'].includes(user.role)) {
    return next();
  }

  if (user.email_verified && ['vnsbek@gmail.com', 'admin@ffaz.az'].includes(user.email?.toLowerCase())) {
    return next();
  }

  try {
    const userDoc = await adminDb.collection('users').doc(user.uid).get();
    const role = userDoc.data()?.role;
    if (['admin', 'superadmin'].includes(role)) {
      return next();
    }
  } catch (e) {
    console.error('[requireAdmin] Role check error:', e);
  }

  return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
}

// Helper to extract Cloudinary public_id
function extractCloudinaryInfo(mediaUrl: string): { publicId: string; resourceType: 'image' | 'video' | 'raw' } | null {
  if (!mediaUrl || typeof mediaUrl !== 'string' || !mediaUrl.includes('cloudinary.com')) {
    return null;
  }
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    const isVideo = cleanUrl.includes('/video/upload/');
    const isRaw = cleanUrl.includes('/raw/upload/');
    const resourceType: 'image' | 'video' | 'raw' = isVideo ? 'video' : isRaw ? 'raw' : 'image';

    const uploadIndex = cleanUrl.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let pathAfter = cleanUrl.substring(uploadIndex + '/upload/'.length);
    pathAfter = pathAfter.replace(/^v\d+\//, '');

    const lastDot = pathAfter.lastIndexOf('.');
    const publicId = lastDot !== -1 ? pathAfter.substring(0, lastDot) : pathAfter;

    return { publicId, resourceType };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ 
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve static uploaded media files safely (only images/videos, with nosniff headers)
  app.use('/uploads', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; img-src 'self'");
    next();
  }, express.static(UPLOADS_DIR));

  // ==========================================
  // 1. MEDIA UPLOAD (Require Auth + Safe Extension)
  // ==========================================
  app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const user = (req as any).user;
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const mime = file.mimetype;
      const safeExtension = ALLOWED_MIME_TYPES[mime];
      if (!safeExtension) {
        return res.status(400).json({ error: 'Unsupported media format. Only standard images, videos, audio and PDFs are allowed.' });
      }

      const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                     process.env.CLOUDINARY_API_KEY && 
                                     process.env.CLOUDINARY_API_SECRET;

      if (isCloudinaryConfigured) {
        let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';
        if (mime.startsWith('image/')) resourceType = 'image';
        else if (mime.startsWith('video/') || mime.startsWith('audio/')) resourceType = 'video';
        else resourceType = 'raw';

        const purpose = req.body.purpose || 'general';
        const folder = purpose === 'id_document' ? 'afw_documents' : 'afw_uploads';

        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: resourceType,
              type: purpose === 'id_document' ? 'authenticated' : 'upload',
              tags: [`user_${user.uid}`, purpose]
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });

        // Record media metadata
        try {
          await adminDb.collection('mediaAssets').add({
            ownerUid: user.uid,
            publicId: uploadResult.public_id,
            secureUrl: uploadResult.secure_url,
            resourceType: uploadResult.resource_type,
            purpose,
            createdAt: FieldValue.serverTimestamp()
          });
        } catch (e) {
          console.warn('[Upload] Media tracking record error:', e);
        }

        return res.json({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          format: uploadResult.format,
          bytes: uploadResult.bytes,
          resourceType: uploadResult.resource_type
        });
      }

      // Local fallback with cryptographically random safe filename
      const uniqueFilename = `${crypto.randomUUID()}${safeExtension}`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);
      fs.writeFileSync(filePath, file.buffer);

      const localUrl = `/uploads/${uniqueFilename}`;
      return res.json({
        url: localUrl,
        publicId: uniqueFilename,
        format: safeExtension.replace('.', ''),
        bytes: file.size,
        resourceType: mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'raw'
      });
    } catch (err: any) {
      console.error('Upload handler error:', err);
      return res.status(500).json({ error: err.message || 'File upload failed' });
    }
  });

  // ==========================================
  // 2. DELETE MEDIA (Require Auth + Verification)
  // ==========================================
  app.post('/api/delete-media', requireAuth, async (req, res) => {
    try {
      const { mediaUrl, publicId, resourceType = 'image' } = req.body;
      const user = (req as any).user;

      if (!mediaUrl && !publicId) {
        return res.status(400).json({ error: 'Missing mediaUrl or publicId' });
      }

      const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                     process.env.CLOUDINARY_API_KEY && 
                                     process.env.CLOUDINARY_API_SECRET;

      if (isCloudinaryConfigured) {
        let targetPublicId = publicId;
        let targetType = resourceType;

        if (!targetPublicId && mediaUrl) {
          const info = extractCloudinaryInfo(mediaUrl);
          if (info) {
            targetPublicId = info.publicId;
            targetType = info.resourceType;
          }
        }

        if (targetPublicId) {
          const result = await cloudinary.uploader.destroy(targetPublicId, {
            resource_type: targetType,
            invalidate: true
          });
          return res.json({ success: true, result });
        }
      }

      // Local fallback file deletion
      if (mediaUrl && mediaUrl.startsWith('/uploads/')) {
        const basename = path.basename(mediaUrl);
        const filePath = path.join(UPLOADS_DIR, basename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.json({ success: true, localDeleted: true });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Delete media error:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete media' });
    }
  });

  // ==========================================
  // 3. SIGNED URL FOR PRIVATE MEDIA
  // ==========================================
  app.post('/api/media/signed-url', requireAuth, async (req, res) => {
    try {
      const { publicId, format = 'jpg' } = req.body;
      const user = (req as any).user;
      if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

      // Check ownership or admin
      const isUserAdmin = user.admin === true || ['admin', 'superadmin'].includes(user.role);
      if (!isUserAdmin) {
        const mediaDocs = await adminDb.collection('mediaAssets')
          .where('publicId', '==', publicId)
          .limit(1)
          .get();
        if (!mediaDocs.empty && mediaDocs.docs[0].data().ownerUid !== user.uid) {
          return res.status(403).json({ error: 'Forbidden: You do not own this document' });
        }
      }

      // Generate 10-minute temporary signed URL
      const signedUrl = cloudinary.url(publicId, {
        sign_url: true,
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 600,
        format
      });

      return res.json({ signedUrl });
    } catch (err: any) {
      console.error('Signed URL error:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate signed url' });
    }
  });

  // ==========================================
  // 4. ATOMIC FEED LIKE (Require Auth)
  // ==========================================
  app.post('/api/feed/:postId/like', requireAuth, async (req, res) => {
    try {
      const { postId } = req.params;
      const user = (req as any).user;
      const likeDocId = `${user.uid}_${postId}`;
      const likeRef = adminDb.collection('feedLikes').doc(likeDocId);
      const postRef = adminDb.collection('feedPosts').doc(postId);

      let liked = false;
      let newLikesCount = 0;

      await adminDb.runTransaction(async (t) => {
        const [postDoc, likeDoc] = await Promise.all([
          t.get(postRef),
          t.get(likeRef)
        ]);

        if (!postDoc.exists) {
          throw new Error('Post does not exist');
        }

        const currentLikes = postDoc.data()?.likesCount || 0;

        if (likeDoc.exists) {
          // Unlike
          t.delete(likeRef);
          newLikesCount = Math.max(0, currentLikes - 1);
          t.update(postRef, { likesCount: newLikesCount });
          liked = false;
        } else {
          // Like
          t.set(likeRef, {
            postId,
            userId: user.uid,
            createdAt: FieldValue.serverTimestamp()
          });
          newLikesCount = currentLikes + 1;
          t.update(postRef, { likesCount: newLikesCount });
          liked = true;
        }
      });

      return res.json({ success: true, liked, likesCount: newLikesCount });
    } catch (err: any) {
      console.error('Feed like error:', err);
      return res.status(500).json({ error: err.message || 'Failed to process like' });
    }
  });

  // ==========================================
  // 5. ATOMIC FEED COMMENT (Require Auth)
  // ==========================================
  app.post('/api/feed/:postId/comments', requireAuth, async (req, res) => {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      const user = (req as any).user;

      if (!content || typeof content !== 'string' || content.trim().length === 0 || content.length > 1000) {
        return res.status(400).json({ error: 'Comment must be between 1 and 1000 characters' });
      }

      const postRef = adminDb.collection('feedPosts').doc(postId);
      const commentRef = adminDb.collection('feedComments').doc();

      const newComment = {
        id: commentRef.id,
        postId,
        userId: user.uid,
        content: content.trim(),
        createdAt: FieldValue.serverTimestamp()
      };

      await adminDb.runTransaction(async (t) => {
        const postDoc = await t.get(postRef);
        if (!postDoc.exists) {
          throw new Error('Post does not exist');
        }
        const currentCount = postDoc.data()?.commentsCount || 0;
        t.set(commentRef, newComment);
        t.update(postRef, { commentsCount: currentCount + 1 });
      });

      return res.json({ success: true, comment: { ...newComment, createdAt: Date.now() } });
    } catch (err: any) {
      console.error('Feed comment error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create comment' });
    }
  });

  // ==========================================
  // 6. ATOMIC DELETE COMMENT (Require Auth)
  // ==========================================
  app.delete('/api/feed/:postId/comments/:commentId', requireAuth, async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const user = (req as any).user;

      const postRef = adminDb.collection('feedPosts').doc(postId);
      const commentRef = adminDb.collection('feedComments').doc(commentId);

      await adminDb.runTransaction(async (t) => {
        const [postDoc, commentDoc] = await Promise.all([
          t.get(postRef),
          t.get(commentRef)
        ]);

        if (!commentDoc.exists) {
          throw new Error('Comment not found');
        }

        const isAuthor = commentDoc.data()?.userId === user.uid;
        const isUserAdmin = user.admin === true || ['admin', 'superadmin'].includes(user.role);

        if (!isAuthor && !isUserAdmin) {
          throw new Error('Unauthorized to delete this comment');
        }

        t.delete(commentRef);
        if (postDoc.exists) {
          const currentCount = postDoc.data()?.commentsCount || 0;
          t.update(postRef, { commentsCount: Math.max(0, currentCount - 1) });
        }
      });

      return res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (err: any) {
      console.error('Delete comment error:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete comment' });
    }
  });

  // ==========================================
  // 7. ATOMIC TICKET PURCHASE (Require Auth)
  // ==========================================
  app.post('/api/tickets/purchase', requireAuth, async (req, res) => {
    try {
      const { eventId, tierName, quantity = 1, guestName, guestEmail, guestPhone } = req.body;
      const user = (req as any).user;

      if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

      const eventRef = adminDb.collection('events').doc(eventId);
      let ticketId = '';
      let qrCodeData = '';
      let purchasedPrice = 0;

      await adminDb.runTransaction(async (t) => {
        const eventDoc = await t.get(eventRef);
        if (!eventDoc.exists) {
          throw new Error('Event not found');
        }

        const evData = eventDoc.data()!;
        const available = Number(evData.availableTickets ?? 0);
        if (available < quantity) {
          throw new Error('Not enough tickets available for this event');
        }

        // Determine price securely from server event data
        let price = Number(evData.price || 0);
        if (tierName && Array.isArray(evData.ticketTiers)) {
          const matched = evData.ticketTiers.find((tier: any) => tier.name === tierName);
          if (matched && typeof matched.price === 'number') {
            price = matched.price;
          }
        }
        purchasedPrice = price * quantity;

        // Decrement available tickets
        t.update(eventRef, {
          availableTickets: Math.max(0, available - quantity),
          updatedAt: FieldValue.serverTimestamp()
        });

        // Generate cryptographically secure token
        const secureRandom = crypto.randomUUID();
        qrCodeData = `FFAZ-TKT-${eventId.slice(0, 5).toUpperCase()}-${secureRandom}`;

        const ticketRef = adminDb.collection('tickets').doc();
        ticketId = ticketRef.id;

        t.set(ticketRef, {
          id: ticketId,
          eventId,
          userId: user.uid,
          userEmail: guestEmail || user.email || '',
          userName: guestName || user.name || 'AFW Guest',
          tierName: tierName || 'General Admission',
          price: purchasedPrice,
          quantity: Number(quantity),
          purchaseDate: Date.now(),
          status: 'active',
          qrCodeData,
          guestPhone: guestPhone || '',
          createdAt: FieldValue.serverTimestamp()
        });

        const txRef = adminDb.collection('transactions').doc();
        t.set(txRef, {
          id: txRef.id,
          userId: user.uid,
          userEmail: guestEmail || user.email || '',
          userName: guestName || user.name || 'AFW Guest',
          type: 'ticket_purchase',
          amount: purchasedPrice,
          currency: 'AZN',
          txId: `TX-TKT-${Date.now()}`,
          status: 'completed',
          ticketId,
          eventId,
          createdAt: FieldValue.serverTimestamp()
        });
      });

      return res.json({
        success: true,
        ticketId,
        qrCodeData,
        amount: purchasedPrice,
        message: 'Ticket purchased successfully'
      });
    } catch (err: any) {
      console.error('Ticket purchase error:', err);
      return res.status(500).json({ error: err.message || 'Ticket purchase failed' });
    }
  });

  // ==========================================
  // 8. ATOMIC SUBSCRIPTION UPGRADE (Require Auth)
  // ==========================================
  app.post('/api/subscriptions/purchase', requireAuth, async (req, res) => {
    try {
      const { planId, billingCycle = 'monthly', amount } = req.body;
      const user = (req as any).user;

      if (!planId) return res.status(400).json({ error: 'Missing planId' });

      const validityDays = billingCycle === 'yearly' ? 365 : 30;
      const validUntil = Date.now() + validityDays * 24 * 60 * 60 * 1000;

      const userPrivateRef = adminDb.collection('users').doc(user.uid).collection('private').doc('account');
      const userPublicRef = adminDb.collection('users').doc(user.uid);
      const txRef = adminDb.collection('transactions').doc();

      const finalAmount = typeof amount === 'number' ? amount : (planId === 'elite' ? (billingCycle === 'yearly' ? 40 * 12 : 49) : 19);

      await adminDb.runTransaction(async (t) => {
        t.set(userPrivateRef, {
          subscriptionTier: planId,
          billingCycle,
          subscriptionGrantedAt: Date.now(),
          subscriptionValidUntil: validUntil,
          subscriptionExpiresAt: validUntil,
          subscriptionGrantedByAdmin: false,
          hasJobPostingAccess: true,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        t.set(userPublicRef, {
          subscriptionTier: planId,
          hasJobPostingAccess: true,
          lastActiveAt: FieldValue.serverTimestamp()
        }, { merge: true });

        t.set(txRef, {
          id: txRef.id,
          userId: user.uid,
          userEmail: user.email || '',
          type: 'subscription',
          planId,
          billingCycle,
          amount: finalAmount,
          currency: 'AZN',
          txId: `TX-SUB-${Date.now()}`,
          status: 'completed',
          createdAt: FieldValue.serverTimestamp()
        });
      });

      return res.json({
        success: true,
        planId,
        validUntil,
        message: 'Subscription updated successfully'
      });
    } catch (err: any) {
      console.error('Subscription purchase error:', err);
      return res.status(500).json({ error: err.message || 'Failed to update subscription' });
    }
  });

  // ==========================================
  // 9. ATOMIC VACANCY POSTING (Require Auth)
  // ==========================================
  app.post('/api/vacancies', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { title, description, companyName, location, salary, type, customQuestions, isPaid = true } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const userPrivateRef = adminDb.collection('users').doc(user.uid).collection('private').doc('account');
      const userPublicRef = adminDb.collection('users').doc(user.uid);
      const vacancyRef = adminDb.collection('vacancies').doc();

      await adminDb.runTransaction(async (t) => {
        const [privateDoc, publicDoc] = await Promise.all([
          t.get(userPrivateRef),
          t.get(userPublicRef)
        ]);

        const privData = privateDoc.data() || {};
        const pubData = publicDoc.data() || {};

        const tier = privData.subscriptionTier || pubData.subscriptionTier || 'free';
        const isSubscribed = ['pro', 'elite', 'business'].includes(tier);
        const credits = Number(privData.singleJobCredits || pubData.singleJobCredits || 0);

        if (!isSubscribed && credits > 0) {
          t.set(userPrivateRef, {
            singleJobCredits: Math.max(0, credits - 1),
            hasJobPostingAccess: true
          }, { merge: true });
        }

        t.set(vacancyRef, {
          id: vacancyRef.id,
          employerId: user.uid,
          employerName: pubData.name || user.name || 'Anonymous',
          companyName: companyName || pubData.brandName || pubData.name || 'Fashion House',
          title: title.trim(),
          description: description.trim(),
          location: location || 'Baku, Azerbaijan',
          salary: salary || '',
          type: type || 'vacancy',
          customQuestions: customQuestions || [],
          isPaid: Boolean(isPaid),
          status: 'open',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        t.set(userPublicRef, {
          hasJobPostingAccess: true
        }, { merge: true });
      });

      return res.json({ success: true, vacancyId: vacancyRef.id });
    } catch (err: any) {
      console.error('Vacancy posting error:', err);
      return res.status(500).json({ error: err.message || 'Failed to post vacancy' });
    }
  });

  // ==========================================
  // 10. AI EDUCATION CHAT (Require Auth)
  // ==========================================
  app.post('/api/education-ai-chat', requireAuth, async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const gemini = getGemini();
      if (!gemini) {
        return res.status(500).json({ error: 'Gemini AI service is not initialized on the server.' });
      }

      // Fetch dynamic education data & AI knowledge from Firestore
      let knowledgeText = '';
      try {
        const [eduSnap, knowledgeSnap] = await Promise.all([
          adminDb.collection('education').get(),
          adminDb.collection('ffAiKnowledge').get()
        ]);

        const eduList = !eduSnap.empty 
          ? eduSnap.docs.map(d => d.data()) 
          : DEFAULT_EDUCATION_INSTITUTIONS;

        const eduSummary = eduList.map((e: any) => 
          `• ${e.name} (${e.type || 'institution'}): ${e.city || 'Baku'}. Направления: ${(e.faculties || []).join(', ')}. Контакты: ${e.website || e.instagram || ''}`
        ).join('\n');

        const knowledgeSummary = knowledgeSnap.docs.map(d => `• ${d.data().title}: ${d.data().content}`).join('\n');

        knowledgeText = `
ДАННЫЕ ОБ ОБРАЗОВАТЕЛЬНЫХ УЧРЕЖДЕНИЯХ МОДЫ АЗЕРБАЙДЖАНА:
${eduSummary}

БАЗА ЗНАНИЙ ПЛАТФОРМЫ AZERBAIJAN FASHION WEEK:
${knowledgeSummary}
        `.trim();
      } catch (e) {
        console.warn('Error fetching knowledge from Firestore:', e);
      }

      const systemInstruction = `
Ты — официальный AI-консультант по образованию и карьере в сфере моды платформы Azerbaijan Fashion Week (FFAZ Education).
Твоя цель: помогать абитуриентам, дизайнерам, стилистам и моделям в выборе учебных заведений, факультетов, курсов и стажировок в Азербайджане и за рубежом.

Используй эти проверенные данные о заведениях:
${knowledgeText}

Отвечай профессионально, дружелюбно, структурированно. Поддерживай русский, азербайджанский и английский языки.
      `.trim();

      const formattedContents = [
        ...conversationHistory.map((item: any) => ({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text || item.content || '' }]
        })),
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];

      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedContents as any,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || 'Извините, не удалось сформировать ответ. Попробуйте еще раз.';
      return res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Education AI chat error:', err);
      return res.status(500).json({ error: err.message || 'AI advisor consultation failed' });
    }
  });

  // ==========================================
  // 11. ADMIN DELETE USER (Cascade with Admin SDK)
  // ==========================================
  app.post('/api/admin/delete-user', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing targetUserId' });
      }

      // 1. Delete user documents
      await Promise.allSettled([
        adminDb.collection('users').doc(targetUserId).delete(),
        adminDb.collection('users').doc(targetUserId).collection('private').doc('account').delete()
      ]);

      // 2. Cascade unlink designers
      const designersSnap = await adminDb.collection('designers').where('linkedUserId', '==', targetUserId).get();
      for (const d of designersSnap.docs) {
        await d.ref.update({
          linkedUserId: null,
          linkedUserName: null,
          linkedUserHandle: null,
          hasGoldenNeedle: false,
        });
      }

      // 3. Cascade delete notifications
      const notifsSnap = await adminDb.collection('notifications').where('userId', '==', targetUserId).get();
      for (const n of notifsSnap.docs) {
        await n.ref.delete();
      }

      // 4. Cascade delete job applications
      const appsSnap = await adminDb.collection('jobApplications').where('userId', '==', targetUserId).get();
      for (const a of appsSnap.docs) {
        await a.ref.delete();
      }

      // 5. Cascade delete posts and feedPosts
      const [feedSnap, postsSnap] = await Promise.all([
        adminDb.collection('feedPosts').where('userId', '==', targetUserId).get(),
        adminDb.collection('posts').where('userId', '==', targetUserId).get()
      ]);
      for (const f of feedSnap.docs) await f.ref.delete();
      for (const p of postsSnap.docs) await p.ref.delete();

      // 6. Delete from Firebase Auth via Admin SDK
      try {
        await adminAuth.deleteUser(targetUserId);
      } catch (authErr) {
        console.warn('[Admin Delete] Firebase Auth deleteUser warning:', authErr);
      }

      return res.json({ success: true, message: 'User and all related records deleted successfully' });
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  });

  // ==========================================
  // 12. USER SELF-DELETION (Cascade with Admin SDK)
  // ==========================================
  app.post('/api/user/delete-my-account', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const targetUserId = user.uid;

      // 1. Delete user documents
      await Promise.allSettled([
        adminDb.collection('users').doc(targetUserId).delete(),
        adminDb.collection('users').doc(targetUserId).collection('private').doc('account').delete()
      ]);

      // 2. Cascade unlink designers
      const designersSnap = await adminDb.collection('designers').where('linkedUserId', '==', targetUserId).get();
      for (const d of designersSnap.docs) {
        await d.ref.update({
          linkedUserId: null,
          linkedUserName: null,
          linkedUserHandle: null,
          hasGoldenNeedle: false,
        });
      }

      // 3. Cascade unlink agencies
      const agenciesSnap = await adminDb.collection('agencies').where('linkedUserId', '==', targetUserId).get();
      for (const a of agenciesSnap.docs) {
        await a.ref.update({
          linkedUserId: null,
          linkedUserName: null,
          linkedUserHandle: null,
          hasAgencyBadge: false
        });
      }

      // 4. Cascade delete notifications
      const notifsSnap = await adminDb.collection('notifications').where('userId', '==', targetUserId).get();
      for (const n of notifsSnap.docs) {
        await n.ref.delete();
      }

      // 5. Cascade delete job applications
      const appsSnap = await adminDb.collection('jobApplications').where('userId', '==', targetUserId).get();
      for (const a of appsSnap.docs) {
        await a.ref.delete();
      }

      // 6. Cascade delete posts
      const [feedSnap, postsSnap] = await Promise.all([
        adminDb.collection('feedPosts').where('userId', '==', targetUserId).get(),
        adminDb.collection('posts').where('userId', '==', targetUserId).get()
      ]);
      for (const f of feedSnap.docs) await f.ref.delete();
      for (const p of postsSnap.docs) await p.ref.delete();

      // 7. Cascade delete giveaway entries
      const gSnap = await adminDb.collection('giveaway_entries').where('userId', '==', targetUserId).get();
      for (const g of gSnap.docs) {
        await g.ref.delete();
      }

      // 8. Delete user from Firebase Auth via Admin SDK
      try {
        await adminAuth.deleteUser(targetUserId);
      } catch (authErr) {
        console.warn('[User Delete] Firebase Auth deleteUser warning:', authErr);
      }

      return res.json({ success: true, message: 'Your account and personal records have been permanently deleted' });
    } catch (err: any) {
      console.error('Failed to delete user account:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete account' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
