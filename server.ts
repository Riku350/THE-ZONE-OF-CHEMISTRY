import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import { adminAuth, adminDb } from './src/lib/firebase-admin.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SUPER_ADMIN_EMAIL = 'godrikuop@gmail.com';
const MEDIA_STORAGE_DIR = path.resolve(process.cwd(), '.media_storage');
if (!fs.existsSync(MEDIA_STORAGE_DIR)) {
  fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });
}

interface RequestWithRawBody extends express.Request {
  rawBody?: string;
}

app.use('/api/media/upload', express.raw({ type: ['video/*', 'application/pdf', 'image/*', 'application/octet-stream'], limit: '150mb' }));
app.use(
  express.json({
    limit: '6mb',
    verify: (req: RequestWithRawBody, _res, buf) => {
      if (req.originalUrl?.startsWith('/api/payments/cashfree/webhook')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  })
);
app.use('/src/assets/images', express.static(path.resolve(process.cwd(), 'src/assets/images')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', institute: 'THE ZONE OF CHEMISTRY' });
});

function getCashfreeConfig() {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  const envRaw = (process.env.CASHFREE_ENV || 'sandbox').trim().toLowerCase();
  const mode: 'sandbox' | 'production' = envRaw === 'production' ? 'production' : 'sandbox';
  const baseUrl = mode === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  return {
    configured: Boolean(appId && secretKey),
    appId,
    secretKey,
    mode,
    baseUrl,
  };
}

async function isUserBlocked(uid: string): Promise<{ blocked: boolean; reason?: string }> {
  const userSnap = await adminDb.collection('users').doc(uid).get().catch(() => null);
  if (!userSnap || !userSnap.exists) return { blocked: false };
  const data = userSnap.data() || {};
  if (data.isBlocked !== true) return { blocked: false };
  if (data.blockType === 'temporary' && data.blockedUntil) {
    const until = new Date(data.blockedUntil).getTime();
    if (!Number.isNaN(until) && until <= Date.now()) {
      await adminDb.collection('users').doc(uid).set({ isBlocked: false, blockReason: '', blockedUntil: '' }, { merge: true }).catch(() => {});
      return { blocked: false };
    }
  }
  return { blocked: true, reason: data.blockReason || 'Account access restricted by administration.' };
}

async function isStaffUser(uid: string, email?: string, emailVerified?: boolean): Promise<boolean> {
  if (!emailVerified) return false;
  const cleanEmail = (email || '').toLowerCase();
  if (cleanEmail === SUPER_ADMIN_EMAIL) return true;
  const adminSnap = await adminDb.collection('admins').doc(uid).get().catch(() => null);
  if (adminSnap && adminSnap.exists) return true;
  if (cleanEmail) {
    const teacherSnap = await adminDb.collection('teachers_by_email').doc(cleanEmail).get().catch(() => null);
    if (teacherSnap && teacherSnap.exists) return true;
  }
  return false;
}

async function activateOrderPaymentInFirestore(
  orderData: FirebaseFirestore.DocumentData,
  cfPaymentId: string
): Promise<{ receiptNo: string; alreadyProcessed: boolean }> {
  const orderRef = adminDb.collection('orders').doc(orderData.orderId);
  const freshOrderSnap = await orderRef.get();
  const current = freshOrderSnap.data();
  if (current?.status === 'PAID' && current?.receiptNo) {
    return { receiptNo: current.receiptNo, alreadyProcessed: true };
  }

  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const receiptNo = current?.receiptNo || `RCP-${year}-${Math.floor(10000 + Math.random() * 90000)}`;

  await orderRef.set(
    {
      status: 'PAID',
      cfPaymentId,
      receiptNo,
      updatedAt: now,
    },
    { merge: true }
  );

  // Activate enrollment if tied to a course
  if (orderData.courseId && orderData.courseId !== 'fee-payment') {
    const enrollId = `${orderData.studentUid}_${orderData.courseId}`;
    await adminDb
      .collection('enrollments')
      .doc(enrollId)
      .set(
        {
          studentUid: orderData.studentUid,
          studentName: orderData.studentName,
          studentEmail: orderData.studentEmail,
          courseId: orderData.courseId,
          courseTitle: orderData.courseTitle,
          orderId: orderData.orderId,
          amountPaid: Number(orderData.amount || 0),
          status: 'Active',
          enrolledAt: now,
        },
        { merge: true }
      );
  }

  // Update fee record if tied to feeRecordId
  let admissionId = 'ONLINE';
  let studentId = orderData.studentUid;
  const studentQ = await adminDb.collection('students').where('uid', '==', orderData.studentUid).limit(1).get().catch(() => null);
  if (studentQ && !studentQ.empty) {
    admissionId = studentQ.docs[0].data()?.admissionId || 'ONLINE';
    studentId = studentQ.docs[0].id;
  }

  if (orderData.feeRecordId) {
    const feeRef = adminDb.collection('fee_records').doc(orderData.feeRecordId);
    const feeSnap = await feeRef.get();
    if (feeSnap.exists) {
      const f = feeSnap.data() || {};
      const newPaid = Number(f.paidAmount || 0) + Number(orderData.amount || 0);
      const netTotal = Math.max(
        0,
        Number(f.totalFees || 0) - Number(f.discount || 0) - Number(f.scholarship || 0) + Number(f.lateFee || 0)
      );
      const nextStatus = newPaid >= netTotal ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
      await feeRef.set({ paidAmount: newPaid, status: nextStatus, updatedAt: now }, { merge: true });
    }
  }

  // Idempotent payment receipt write
  await adminDb
    .collection('payments')
    .doc(`pay_${orderData.orderId}`)
    .set(
      {
        receiptNo,
        feeRecordId: orderData.feeRecordId || '',
        orderId: orderData.orderId,
        cashfreeOrderId: orderData.cfOrderId || orderData.orderId,
        cfPaymentId,
        courseId: orderData.courseId || '',
        courseTitle: orderData.courseTitle || '',
        studentId,
        studentUid: orderData.studentUid,
        studentName: orderData.studentName,
        admissionId,
        amount: Number(orderData.amount || 0),
        mode: 'Cashfree',
        referenceId: cfPaymentId || orderData.orderId,
        paymentStatus: 'PAID',
        refundStatus: 'None',
        verified: true,
        paidAt: now,
        recordedBy: 'cashfree_verified',
      },
      { merge: true }
    );

  // Notify student
  await adminDb.collection('notifications').add({
    title: 'Payment Successful & Course Unlocked',
    message: `₹${Number(orderData.amount || 0).toLocaleString('en-IN')} received for ${orderData.courseTitle}. Receipt: ${receiptNo}`,
    type: 'payment',
    targetType: 'student',
    targetUid: orderData.studentUid,
    createdAt: now,
  });

  return { receiptNo, alreadyProcessed: false };
}

// 1. Cashfree Public Config Check (Zero Secrets Exposed)
app.get('/api/payments/cashfree/config', (_req, res) => {
  const cfg = getCashfreeConfig();
  res.json({
    configured: cfg.configured,
    mode: cfg.mode,
    appIdConfigured: Boolean(cfg.appId),
  });
});

// 2. Create Cashfree Payment Order (Course Checkout or Student Fee Payment)
app.post('/api/payments/cashfree/create-order', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const blockCheck = await isUserBlocked(uid);
    if (blockCheck.blocked) {
      res.status(403).json({ error: `Account blocked: ${blockCheck.reason}` });
      return;
    }

    const cfg = getCashfreeConfig();
    if (!cfg.configured) {
      res.status(400).json({
        configured: false,
        offlineFallbackAllowed: true,
        error:
          'Cashfree online gateway keys are not configured yet. Configure CASHFREE_APP_ID and CASHFREE_SECRET_KEY in environment secrets, or apply via Offline Campus Payment.',
      });
      return;
    }

    const { courseId, courseTitle, feeRecordId, amount, customerPhone, customerName } = req.body || {};
    let payableAmount = Number(amount || 0);
    let resolvedCourseTitle = String(courseTitle || 'Chemistry Course').slice(0, 160);
    const resolvedCourseId = String(courseId || 'fee-payment').slice(0, 128);

    // Always prefer authoritative course fee if courseId resolves in Firestore
    if (courseId && courseId !== 'fee-payment') {
      const courseSnap = await adminDb.collection('courses').doc(String(courseId)).get().catch(() => null);
      if (courseSnap && courseSnap.exists) {
        const cData = courseSnap.data()!;
        payableAmount = Number(cData.fees || payableAmount);
        resolvedCourseTitle = String(cData.title || resolvedCourseTitle);
      }
    }

    if (!payableAmount || payableAmount <= 0 || Number.isNaN(payableAmount)) {
      res.status(400).json({ error: 'Valid payable amount (> ₹0) is required' });
      return;
    }

    const cleanPhone = String(customerPhone || '9431000000').replace(/\D/g, '').slice(-10) || '9431000000';
    const orderId = `ZOC_${Date.now()}_${uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)}`;
    const appOrigin = (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')
      ? process.env.APP_URL
      : req.headers.origin || `http://localhost:${PORT}`
    ).replace(/\/+$/, '');
    const returnUrl = `${appOrigin}/student?tab=orders&order_id={order_id}`;

    const cfPayload = {
      order_id: orderId,
      order_amount: Number(payableAmount.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48),
        customer_name: String(customerName || req.user?.name || req.user?.email || 'Student').slice(0, 80),
        customer_email: req.user?.email || 'student@zoneofchemistry.in',
        customer_phone: cleanPhone.length === 10 ? cleanPhone : '9431000000',
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: `${appOrigin}/api/payments/cashfree/webhook`,
      },
      order_note: `${resolvedCourseTitle} — THE ZONE OF CHEMISTRY`,
    };

    const cfRes = await fetch(`${cfg.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': cfg.appId,
        'x-client-secret': cfg.secretKey,
      },
      body: JSON.stringify(cfPayload),
    });

    const cfData: any = await cfRes.json().catch(() => ({}));
    if (!cfRes.ok || !cfData?.payment_session_id) {
      console.error('Cashfree create-order failure:', cfData);
      res.status(502).json({
        configured: true,
        error: cfData?.message || 'Cashfree rejected order initialization. Check App ID/Secret Key & mode.',
      });
      return;
    }

    const now = new Date().toISOString();
    const orderRecord = {
      orderId,
      cfOrderId: String(cfData.cf_order_id || orderId),
      studentUid: uid,
      studentName: String(customerName || req.user?.name || req.user?.email || 'Student'),
      studentEmail: (req.user?.email || '').toLowerCase(),
      studentPhone: cleanPhone,
      courseId: resolvedCourseId,
      courseTitle: resolvedCourseTitle,
      feeRecordId: feeRecordId ? String(feeRecordId) : '',
      amount: payableAmount,
      currency: 'INR',
      status: 'CREATED',
      refundStatus: 'None',
      paymentSessionId: String(cfData.payment_session_id),
      gatewayMode: cfg.mode,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('orders').doc(orderId).set(orderRecord);

    res.json({
      configured: true,
      mode: cfg.mode,
      orderId,
      cfOrderId: orderRecord.cfOrderId,
      paymentSessionId: cfData.payment_session_id,
      amount: payableAmount,
    });
  } catch (error) {
    console.error('Cashfree create-order error:', error);
    res.status(500).json({ error: 'Failed to create Cashfree payment order' });
  }
});

// 3. Server-Side Cashfree Payment Verification (Called on Checkout Finish / Return URL)
app.post('/api/payments/cashfree/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { orderId } = req.body || {};
    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ error: 'Valid orderId is required' });
      return;
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      res.status(404).json({ error: 'Order record not found' });
      return;
    }

    const orderData = orderSnap.data()!;
    if (orderData.studentUid !== uid && !(await isStaffUser(uid, req.user?.email, req.user?.email_verified))) {
      res.status(403).json({ error: 'Unauthorized to verify this order' });
      return;
    }

    if (orderData.status === 'PAID') {
      res.json({
        success: true,
        verified: true,
        status: 'PAID',
        alreadyProcessed: true,
        receiptNo: orderData.receiptNo,
        order: orderData,
      });
      return;
    }

    const cfg = getCashfreeConfig();
    if (!cfg.configured) {
      res.status(400).json({ error: 'Cashfree gateway secret is not configured on server' });
      return;
    }

    const cfRes = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': cfg.appId,
        'x-client-secret': cfg.secretKey,
      },
    });
    const cfOrder: any = await cfRes.json().catch(() => ({}));
    if (!cfRes.ok) {
      res.status(502).json({ error: cfOrder?.message || 'Unable to verify order status from Cashfree' });
      return;
    }

    const orderStatus = String(cfOrder.order_status || '').toUpperCase();
    if (orderStatus === 'PAID') {
      const paymentsRes = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
        method: 'GET',
        headers: {
          'x-api-version': '2023-08-01',
          'x-client-id': cfg.appId,
          'x-client-secret': cfg.secretKey,
        },
      });
      const paymentsList: any = await paymentsRes.json().catch(() => []);
      const successPay = Array.isArray(paymentsList)
        ? paymentsList.find((p) => String(p.payment_status).toUpperCase() === 'SUCCESS') || paymentsList[0]
        : null;
      const cfPaymentId = String(successPay?.cf_payment_id || cfOrder.cf_order_id || '');
      const result = await activateOrderPaymentInFirestore(orderData, cfPaymentId);
      res.json({
        success: true,
        verified: true,
        status: 'PAID',
        receiptNo: result.receiptNo,
        alreadyProcessed: result.alreadyProcessed,
      });
      return;
    }

    const mappedStatus = orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED' ? 'FAILED' : 'PENDING';
    await orderRef.set({ status: mappedStatus, updatedAt: new Date().toISOString() }, { merge: true });
    res.json({
      success: false,
      verified: false,
      status: mappedStatus,
      message: `Cashfree order status is ${orderStatus}`,
    });
  } catch (error) {
    console.error('Cashfree verify error:', error);
    res.status(500).json({ error: 'Cashfree verification failed' });
  }
});

// 4. Cashfree Webhook Handler (Signature Verified + Idempotent)
app.post('/api/payments/cashfree/webhook', async (req: RequestWithRawBody, res) => {
  try {
    const cfg = getCashfreeConfig();
    if (!cfg.configured) {
      res.status(400).send('Cashfree secret missing');
      return;
    }

    const signature = String(req.headers['x-webhook-signature'] || '');
    const timestamp = String(req.headers['x-webhook-timestamp'] || '');
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const expectedSig = crypto.createHmac('sha256', cfg.secretKey).update(`${timestamp}${rawBody}`).digest('base64');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).json({ error: 'Invalid Cashfree webhook signature' });
      return;
    }

    const eventType = String(req.body?.type || '');
    const orderId = String(req.body?.data?.order?.order_id || '');
    const cfPaymentId = String(req.body?.data?.payment?.cf_payment_id || '');
    const paymentStatus = String(req.body?.data?.payment?.payment_status || '');

    if (!orderId) {
      res.status(200).json({ received: true });
      return;
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      res.status(200).json({ received: true, unknownOrder: true });
      return;
    }

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS') {
      await activateOrderPaymentInFirestore(orderSnap.data()!, cfPaymentId);
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK' || paymentStatus === 'FAILED') {
      await orderRef.set({ status: 'FAILED', updatedAt: new Date().toISOString() }, { merge: true });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Cashfree webhook error:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// 5. Protected Direct Media Upload (Teacher / Admin Video & PDF Upload)
app.post('/api/media/upload', requireAuth, async (req: AuthRequest, res) => {
  try {
    const staff = await isStaffUser(req.user!.uid, req.user?.email, req.user?.email_verified);
    if (!staff) {
      res.status(403).json({ error: 'Only teachers or admins can upload course media files.' });
      return;
    }

    const buf = Buffer.isBuffer(req.body) ? req.body : null;
    if (!buf || buf.length === 0) {
      res.status(400).json({ error: 'Empty file upload payload' });
      return;
    }

    const mimeType = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0];
    const origName = String(req.headers['x-file-name'] || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
    const courseId = String(req.headers['x-course-id'] || '').slice(0, 128);
    const ext = path.extname(origName) || (mimeType.includes('mp4') ? '.mp4' : mimeType.includes('webm') ? '.webm' : mimeType.includes('pdf') ? '.pdf' : '.bin');
    const mediaId = `med_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
    const diskPath = path.join(MEDIA_STORAGE_DIR, `${mediaId}${ext}`);

    fs.writeFileSync(diskPath, buf);
    await adminDb.collection('media_assets').doc(mediaId).set({
      mediaId,
      diskName: `${mediaId}${ext}`,
      mimeType,
      size: buf.length,
      courseId,
      uploadedBy: req.user!.email || req.user!.uid,
      createdAt: new Date().toISOString(),
    });

    res.json({
      mediaId,
      mimeType,
      size: buf.length,
      streamUrl: `/api/media/stream/${mediaId}`,
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Failed to store uploaded media file' });
  }
});

// 6. Protected Video / PDF Streaming (Enrollment & Block Enforced + HTTP Range Seeking)
app.get('/api/media/stream/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const rawAuth = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : typeof req.query.token === 'string'
      ? req.query.token
      : '';

    if (!rawAuth) {
      res.status(401).json({ error: 'Authentication required to stream course media' });
      return;
    }

    const decoded = await adminAuth.verifyIdToken(rawAuth).catch(() => null);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired media token' });
      return;
    }

    const blockCheck = await isUserBlocked(decoded.uid);
    if (blockCheck.blocked) {
      res.status(403).json({ error: 'Access denied: account blocked' });
      return;
    }

    const assetSnap = await adminDb.collection('media_assets').doc(mediaId).get();
    if (!assetSnap.exists) {
      res.status(404).json({ error: 'Media asset not found' });
      return;
    }

    const asset = assetSnap.data()!;
    const staff = await isStaffUser(decoded.uid, decoded.email, decoded.email_verified);
    if (!staff && asset.courseId) {
      const enrSnap = await adminDb.collection('enrollments').doc(`${decoded.uid}_${asset.courseId}`).get().catch(() => null);
      const hasEnrollment = Boolean(enrSnap && enrSnap.exists && enrSnap.data()?.status === 'Active');
      let hasStudentCourse = false;
      if (!hasEnrollment) {
        const stuQ = await adminDb
          .collection('students')
          .where('uid', '==', decoded.uid)
          .where('courseId', '==', asset.courseId)
          .limit(1)
          .get()
          .catch(() => null);
        hasStudentCourse = Boolean(stuQ && !stuQ.empty);
      }
      if (!hasEnrollment && !hasStudentCourse) {
        res.status(403).json({ error: 'Course purchase or active admission required to stream this video' });
        return;
      }
    }

    const filePath = path.join(MEDIA_STORAGE_DIR, asset.diskName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Media file missing on disk' });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mimeType = asset.mimeType || 'application/octet-stream';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Protected media stream error:', error);
    res.status(500).json({ error: 'Media stream error' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist/index.html'));
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`THE ZONE OF CHEMISTRY server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
