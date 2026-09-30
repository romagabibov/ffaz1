import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { Firestore, doc, runTransaction, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// ============================================================================
// 1. TypeScript Interfaces & DTOs
// ============================================================================

export interface RawBodyRequest extends Request {
 rawBody?: Buffer | string;
}

export type WebhookEventType = 
 | 'TICKET_PURCHASED' 
 | 'ORDER_PAID' 
 | 'TICKET_REFUNDED' 
 | 'ORDER_CANCELLED';

export interface WebhookTicketItemDTO {
 ticketId: string;
 userEmail: string;
 userName?: string;
 tierName?: string;
 price?: number;
 qrCodeData?: string;
 userId?: string | null;
}

export interface ITicketsWebhookPayload {
 webhookEventId?: string;
 transactionId?: string;
 eventId: string;
 eventType: WebhookEventType;
 timestamp?: number | string;
 data?: {
 tickets?: WebhookTicketItemDTO[];
 ticketId?: string;
 ticketIds?: string[];
 userEmail?: string;
 userName?: string;
 tierName?: string;
 price?: number;
 qrCodeData?: string;
 quantity?: number;
 userId?: string | null;
 refundReason?: string;
 };
}

export interface TicketDocument {
 ticketId: string;
 eventId: string;
 userId: string | null;
 userEmail: string;
 userName: string;
 tierName: string;
 price: number;
 qrCodeData: string;
 status: 'active' | 'used' | 'cancelled';
 purchaseDate: number;
 checkedInAt: number | null;
 source: 'itickets_gateway';
 updatedAt?: number;
}

export interface ProcessedWebhookDocument {
 webhookEventId: string;
 eventType: string;
 eventId: string;
 processedAt: number;
 status: 'success' | 'failed' | 'ignored';
 summary?: string;
 rawPayloadSummary?: Record<string, any>;
}

export interface CheckInRequestDTO {
 qrCodeData: string;
 eventId?: string;
 operatorId?: string;
}

export interface ReconcileRequestDTO {
 eventId: string;
 externalAvailableCount?: number;
 externalSoldTicketsCount?: number;
}

// ============================================================================
// 2. Cryptographic HMAC-SHA256 & Auth Middlewares
// ============================================================================

/**
 * Middleware validating HMAC-SHA256 signature of incoming webhooks.
 * Uses timingSafeEqual to guard against timing side-channel attacks.
 */
export function verifyHmacSignature(secretEnvVar = 'ITICKETS_WEBHOOK_SECRET') {
 return (req: RawBodyRequest, res: Response, next: NextFunction): void => {
 const secret = process.env[secretEnvVar];
 
 // In strict production, missing secret is a critical server configuration error
 if (!secret) {
 console.warn(`[Webhook Auth] Warning: ${secretEnvVar} environment variable is not configured.`);
 // If running in development without secret, allow bypass with warning, otherwise block
 if (process.env.NODE_ENV === 'production') {
 res.status(500).json({ error: 'Server configuration error: Webhook secret not configured' });
 return;
 }
 }

 const signatureHeader = 
 (req.headers['x-signature'] as string) || 
 (req.headers['x-hub-signature-256'] as string) ||
 (req.headers['x-itickets-signature'] as string);

 if (!signatureHeader && secret) {
 res.status(401).json({ 
 error: 'Unauthorized: Missing webhook signature header (x-signature or x-hub-signature-256)' 
 });
 return;
 }

 if (secret && signatureHeader) {
 try {
 const rawBody = req.rawBody 
 ? (Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody))
 : Buffer.from(JSON.stringify(req.body || {}));

 // Clean signature prefix if formatted as sha256=...
 const expectedPrefix = 'sha256=';
 const cleanSignature = signatureHeader.startsWith(expectedPrefix)
 ? signatureHeader.substring(expectedPrefix.length)
 : signatureHeader;

 const hmac = crypto.createHmac('sha256', secret);
 hmac.update(rawBody);
 const calculatedDigest = hmac.digest('hex');

 const signatureBuffer = Buffer.from(cleanSignature.toLowerCase(), 'hex');
 const calculatedBuffer = Buffer.from(calculatedDigest.toLowerCase(), 'hex');

 if (
 signatureBuffer.length !== calculatedBuffer.length || 
 !crypto.timingSafeEqual(signatureBuffer, calculatedBuffer)
 ) {
 console.error('[Webhook Auth] HMAC Signature mismatch detected.', {
 receivedLength: signatureBuffer.length,
 calculatedLength: calculatedBuffer.length
 });
 res.status(401).json({ error: 'Unauthorized: Invalid cryptographic signature' });
 return;
 }
 } catch (err: any) {
 console.error('[Webhook Auth] Error validating signature:', err);
 res.status(401).json({ error: 'Unauthorized: Signature verification failed' });
 return;
 }
 }

 next();
 };
}

/**
 * Middleware ensuring cron operations are protected via CRON_SECRET token.
 */
export function verifyCronSecret(req: Request, res: Response, next: NextFunction): void {
 const cronSecret = process.env.CRON_SECRET;
 const authHeader = req.headers.authorization;
 const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-cron-secret'] as string);

 if (cronSecret && token !== cronSecret) {
 res.status(401).json({ error: 'Unauthorized: Invalid or missing CRON_SECRET authorization token' });
 return;
 }

 next();
}

// ============================================================================
// 3. Tickets & Webhooks Router Factory
// ============================================================================

export function createTicketsWebhookRouter(db: Firestore): express.Router {
 const router = express.Router();

 /**
 * Helper to look up a registered user UID by email (optional enrichment)
 */
 async function resolveUserIdByEmail(email?: string): Promise<string | null> {
 if (!email) return null;
 try {
 const usersRef = collection(db, 'users');
 const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
 const snap = await getDocs(q);
 if (!snap.empty) {
 return snap.docs[0].id;
 }
 } catch (e) {
 console.warn('[Webhook] Could not resolve userId by email:', e);
 }
 return null;
 }

 // --------------------------------------------------------------------------
 // A. Webhook Ingress (POST /api/webhooks/tickets)
 // --------------------------------------------------------------------------
 router.post('/tickets', verifyHmacSignature(), async (req: Request, res: Response) => {
 try {
 const payload = req.body as ITicketsWebhookPayload;

 if (!payload || typeof payload !== 'object') {
 return res.status(400).json({ error: 'Malformed request: Payload body is missing or empty' });
 }

 const webhookEventId = payload.webhookEventId || payload.transactionId;
 const { eventType, eventId, data } = payload;

 if (!webhookEventId) {
 return res.status(400).json({ error: 'Invalid payload: Missing unique webhookEventId or transactionId' });
 }

 if (!eventType || !eventId) {
 return res.status(400).json({ error: 'Invalid payload: Missing required eventType or eventId' });
 }

 // 1. Idempotency Check
 const processedRef = doc(db, 'processed_webhooks', webhookEventId);
 const processedSnap = await getDoc(processedRef);

 if (processedSnap.exists()) {
 console.log(`[Webhook Idempotency] Event ${webhookEventId} already processed. Returning 200 OK.`);
 return res.status(200).json({
 success: true,
 idempotent: true,
 message: 'Webhook event already processed previously',
 webhookEventId,
 });
 }

 // 2. Handle Event Types atomically with Firestore Transactions
 if (eventType === 'TICKET_PURCHASED' || eventType === 'ORDER_PAID') {
 // Normalize tickets list
 const rawTickets: WebhookTicketItemDTO[] = Array.isArray(data?.tickets) && data.tickets.length > 0
 ? data.tickets
 : [{
 ticketId: data?.ticketId || `TICK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
 userEmail: data?.userEmail || 'guest@itickets.az',
 userName: data?.userName || 'Fashion Week Guest',
 tierName: data?.tierName || 'Standard',
 price: Number(data?.price) || 0,
 qrCodeData: data?.qrCodeData,
 userId: data?.userId || null,
 }];

 const purchaseQuantity = data?.quantity || rawTickets.length;

 const transactionResult = await runTransaction(db, async (transaction) => {
 // Verify idempotency within transaction snapshot
 const txProcessedSnap = await transaction.get(processedRef);
 if (txProcessedSnap.exists()) {
 return { idempotent: true };
 }

 // Fetch event doc
 const eventRef = doc(db, 'events', eventId);
 const eventSnap = await transaction.get(eventRef);

 if (!eventSnap.exists()) {
 throw new Error(`Event with ID '${eventId}' not found in database`);
 }

 const eventData = eventSnap.data();
 const currentAvailable = Number(eventData.availableTickets);

 if (isNaN(currentAvailable) || currentAvailable < purchaseQuantity) {
 throw new Error(`Insufficient tickets: Requested ${purchaseQuantity}, but only ${currentAvailable || 0} available`);
 }

 // Decrement available tickets
 transaction.update(eventRef, {
 availableTickets: currentAvailable - purchaseQuantity,
 updatedAt: Date.now(),
 });

 // Create ticket documents
 const createdTickets: TicketDocument[] = [];
 const now = Date.now();

 for (const item of rawTickets) {
 const ticketId = item.ticketId || `TICK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
 const ticketRef = doc(db, 'tickets', ticketId);

 const qrData = item.qrCodeData || JSON.stringify({
 ticketId,
 eventId,
 email: item.userEmail,
 issuedAt: now,
 securityToken: crypto.randomBytes(8).toString('hex')
 });

 const ticketDoc: TicketDocument = {
 ticketId,
 eventId,
 userId: item.userId || null,
 userEmail: item.userEmail || 'guest@itickets.az',
 userName: item.userName || 'Fashion Guest',
 tierName: item.tierName || 'Front Row VIP',
 price: Number(item.price) || 0,
 qrCodeData: qrData,
 status: 'active',
 purchaseDate: now,
 checkedInAt: null,
 source: 'itickets_gateway',
 };

 transaction.set(ticketRef, ticketDoc);
 createdTickets.push(ticketDoc);
 }

 // Mark webhook as processed
 const processedDoc: ProcessedWebhookDocument = {
 webhookEventId,
 eventType,
 eventId,
 processedAt: now,
 status: 'success',
 summary: `Processed purchase of ${createdTickets.length} ticket(s) for event ${eventId}`,
 };
 transaction.set(processedRef, processedDoc);

 return { idempotent: false, createdTickets };
 });

 if (transactionResult.idempotent) {
 return res.status(200).json({
 success: true,
 idempotent: true,
 message: 'Webhook was already processed concurrently',
 webhookEventId
 });
 }

 return res.status(200).json({
 success: true,
 message: 'Tickets successfully issued and inventory updated',
 webhookEventId,
 ticketsIssuedCount: transactionResult.createdTickets.length,
 tickets: transactionResult.createdTickets
 });

 } else if (eventType === 'TICKET_REFUNDED' || eventType === 'ORDER_CANCELLED') {
 const ticketIdsToRefund: string[] = Array.isArray(data?.ticketIds) && data.ticketIds.length > 0
 ? data.ticketIds
 : data?.ticketId ? [data.ticketId] : [];

 if (ticketIdsToRefund.length === 0) {
 return res.status(400).json({ error: 'Refund payload missing ticketId or ticketIds' });
 }

 const refundResult = await runTransaction(db, async (transaction) => {
 // Check idempotency in transaction
 const txProcessedSnap = await transaction.get(processedRef);
 if (txProcessedSnap.exists()) {
 return { idempotent: true, cancelledCount: 0 };
 }

 const eventRef = doc(db, 'events', eventId);
 const eventSnap = await transaction.get(eventRef);

 let cancelledCount = 0;

 for (const tid of ticketIdsToRefund) {
 const tRef = doc(db, 'tickets', tid);
 const tSnap = await transaction.get(tRef);
 if (tSnap.exists()) {
 const currentStatus = tSnap.data().status;
 if (currentStatus === 'active') {
 transaction.update(tRef, {
 status: 'cancelled',
 updatedAt: Date.now(),
 refundReason: data?.refundReason || 'Partner webhook cancellation'
 });
 cancelledCount++;
 }
 }
 }

 // Increment available tickets back to event if event exists
 if (eventSnap.exists() && cancelledCount > 0) {
 const currentAvailable = Number(eventSnap.data().availableTickets) || 0;
 transaction.update(eventRef, {
 availableTickets: currentAvailable + cancelledCount,
 updatedAt: Date.now()
 });
 }

 // Mark webhook as processed
 transaction.set(processedRef, {
 webhookEventId,
 eventType,
 eventId,
 processedAt: Date.now(),
 status: 'success',
 summary: `Cancelled ${cancelledCount} ticket(s) and restored inventory.`,
 });

 return { idempotent: false, cancelledCount };
 });

 return res.status(200).json({
 success: true,
 message: 'Tickets refunded/cancelled and inventory synchronized',
 webhookEventId,
 cancelledCount: refundResult.cancelledCount
 });

 } else {
 // Unknown or unhandled event type
 await runTransaction(db, async (transaction) => {
 transaction.set(processedRef, {
 webhookEventId,
 eventType,
 eventId,
 processedAt: Date.now(),
 status: 'ignored',
 summary: `Ignored unhandled eventType: ${eventType}`
 });
 });

 return res.status(200).json({
 success: true,
 message: `Event type '${eventType}' recorded and ignored`,
 webhookEventId
 });
 }

 } catch (error: any) {
 console.error('[Webhook Processing Error]:', error);
 return res.status(500).json({
 error: 'Failed to process ticket webhook transaction',
 details: error.message || 'Internal Firestore transaction failure'
 });
 }
 });

 // --------------------------------------------------------------------------
 // B. Inventory Reconciliation Cron (POST /api/cron/reconcile-tickets)
 // --------------------------------------------------------------------------
 router.post('/cron/reconcile-tickets', verifyCronSecret, async (req: Request, res: Response) => {
 try {
 const { eventId, externalAvailableCount, externalSoldTicketsCount } = req.body as ReconcileRequestDTO;

 if (!eventId) {
 return res.status(400).json({ error: 'Missing required eventId for reconciliation' });
 }

 const report = await runTransaction(db, async (transaction) => {
 const eventRef = doc(db, 'events', eventId);
 const eventSnap = await transaction.get(eventRef);

 if (!eventSnap.exists()) {
 throw new Error(`Event with ID '${eventId}' not found`);
 }

 const eventData = eventSnap.data();
 const currentFirestoreAvailable = Number(eventData.availableTickets) || 0;
 const totalTickets = Number(eventData.totalTickets) || 0;

 let targetAvailable = currentFirestoreAvailable;

 if (externalAvailableCount !== undefined && !isNaN(Number(externalAvailableCount))) {
 targetAvailable = Math.max(0, Number(externalAvailableCount));
 } else if (externalSoldTicketsCount !== undefined && !isNaN(Number(externalSoldTicketsCount))) {
 targetAvailable = Math.max(0, totalTickets - Number(externalSoldTicketsCount));
 }

 const difference = targetAvailable - currentFirestoreAvailable;

 if (difference !== 0) {
 transaction.update(eventRef, {
 availableTickets: targetAvailable,
 lastReconciledAt: Date.now(),
 updatedAt: Date.now()
 });
 }

 return {
 eventId,
 eventTitle: eventData.title,
 totalTickets,
 previousAvailable: currentFirestoreAvailable,
 reconciledAvailable: targetAvailable,
 driftAdjusted: difference,
 timestamp: Date.now()
 };
 });

 return res.status(200).json({
 success: true,
 message: 'Reconciliation completed successfully',
 report
 });

 } catch (error: any) {
 console.error('[Reconciliation Error]:', error);
 return res.status(500).json({
 error: 'Failed to reconcile tickets inventory',
 details: error.message || 'Transaction error during reconciliation'
 });
 }
 });

 // --------------------------------------------------------------------------
 // C. Gate Scanner Check-in Endpoint (POST /api/tickets/check-in)
 // --------------------------------------------------------------------------
 router.post('/tickets/check-in', async (req: Request, res: Response) => {
 try {
 const { qrCodeData, eventId } = req.body as CheckInRequestDTO;

 if (!qrCodeData) {
 return res.status(400).json({ error: 'Missing qrCodeData payload' });
 }

 // 1. Resolve ticket document ID
 let targetTicketId: string | null = null;

 // Try parsing JSON payload if QR contains encoded object
 try {
 const parsed = JSON.parse(qrCodeData);
 if (parsed.ticketId) targetTicketId = parsed.ticketId;
 } catch {
 // Raw ticket string / code
 targetTicketId = qrCodeData.trim();
 }

 // Execute atomic verification and state change
 const checkInResult = await runTransaction(db, async (transaction) => {
 let ticketDocSnap = null;
 let ticketRef = null;

 if (targetTicketId) {
 ticketRef = doc(db, 'tickets', targetTicketId);
 const snap = await transaction.get(ticketRef);
 if (snap.exists()) {
 ticketDocSnap = snap;
 }
 }

 // If not found by direct ID, search by qrCodeData field
 if (!ticketDocSnap) {
 const ticketsColl = collection(db, 'tickets');
 const q = query(ticketsColl, where('qrCodeData', '==', qrCodeData));
 const searchSnap = await getDocs(q);
 if (!searchSnap.empty) {
 ticketRef = doc(db, 'tickets', searchSnap.docs[0].id);
 ticketDocSnap = await transaction.get(ticketRef);
 }
 }

 if (!ticketDocSnap || !ticketDocSnap.exists() || !ticketRef) {
 return { status: 'NOT_FOUND' };
 }

 const ticketData = ticketDocSnap.data() as TicketDocument;

 // Check event ID mismatch if eventId was specified by the gate scanner
 if (eventId && ticketData.eventId && ticketData.eventId !== eventId) {
 return { 
 status: 'EVENT_MISMATCH', 
 expectedEvent: eventId, 
 ticketEvent: ticketData.eventId 
 };
 }

 // Check if ticket is cancelled
 if (ticketData.status === 'cancelled') {
 return { status: 'CANCELLED', ticket: ticketData };
 }

 // Check if ticket was already used (Double-scan defense)
 if (ticketData.status === 'used') {
 return { 
 status: 'ALREADY_USED', 
 checkedInAt: ticketData.checkedInAt || ticketData.updatedAt || Date.now(),
 ticket: ticketData 
 };
 }

 // Valid Active Ticket -> Atomic Check-in
 const checkInTime = Date.now();
 transaction.update(ticketRef, {
 status: 'used',
 checkedInAt: checkInTime,
 updatedAt: checkInTime,
 checkInOperator: req.body.operatorId || 'main_gate_scanner'
 });

 return {
 status: 'SUCCESS',
 checkedInAt: checkInTime,
 ticket: {
 ...ticketData,
 status: 'used',
 checkedInAt: checkInTime
 }
 };
 });

 // Format response according to check-in result status
 if (checkInResult.status === 'NOT_FOUND') {
 return res.status(404).json({
 error: 'Ticket not found',
 message: 'The scanned QR code does not match any valid ticket in the system.'
 });
 }

 if (checkInResult.status === 'EVENT_MISMATCH') {
 return res.status(400).json({
 error: 'Event mismatch',
 message: `This ticket is valid for event ID ${checkInResult.ticketEvent}, but scanned at gate for event ${checkInResult.expectedEvent}.`
 });
 }

 if (checkInResult.status === 'CANCELLED') {
 return res.status(403).json({
 error: 'Ticket cancelled',
 message: 'This ticket has been refunded or invalidated by administration.',
 ticketId: checkInResult.ticket.ticketId
 });
 }

 if (checkInResult.status === 'ALREADY_USED') {
 const firstPassDate = new Date(checkInResult.checkedInAt).toLocaleString('en-US', {
 dateStyle: 'medium',
 timeStyle: 'medium'
 });

 return res.status(409).json({
 error: 'Ticket already used',
 conflict: true,
 checkedInAt: checkInResult.checkedInAt,
 message: `Double entry alert! This ticket was already checked in at ${firstPassDate}. Re-entry with screenshots is forbidden.`,
 ticket: {
 ticketId: checkInResult.ticket.ticketId,
 userName: checkInResult.ticket.userName,
 tierName: checkInResult.ticket.tierName,
 userEmail: checkInResult.ticket.userEmail,
 checkedInAt: checkInResult.checkedInAt
 }
 });
 }

 // Check-in Success
 return res.status(200).json({
 success: true,
 message: 'Guest verified successfully. Access granted.',
 checkedInAt: checkInResult.checkedInAt,
 guest: {
 ticketId: checkInResult.ticket.ticketId,
 userName: checkInResult.ticket.userName,
 userEmail: checkInResult.ticket.userEmail,
 tierName: checkInResult.ticket.tierName,
 price: checkInResult.ticket.price,
 status: 'used'
 }
 });

 } catch (error: any) {
 console.error('[Check-in Error]:', error);
 return res.status(500).json({
 error: 'Failed to process ticket check-in',
 details: error.message || 'Internal database error during scanner transaction'
 });
 }
 });

 return router;
}
