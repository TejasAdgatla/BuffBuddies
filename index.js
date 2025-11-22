/**
 * CASHFREE PAYMENT GATEWAY - APPWRITE FUNCTION (CommonJS Format)
 * Handles payment order creation and verification
 */

module.exports = async ({ req, res, log, error }) => {
  // CORS Headers - must be in every response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Log incoming request
    log('📨 Incoming request:', {
      method: req.method,
      path: req.path || '/',
      hasBody: !!req.body,
    });

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      log('✅ Handling OPTIONS preflight request');
      return res.json({ ok: true }, 200, corsHeaders);
    }

    // Get Cashfree credentials from environment variables
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    log('🔑 Environment check:', {
      hasAppId: !!appId,
      hasSecretKey: !!secretKey,
      appIdPrefix: appId ? appId.substring(0, 5) : 'missing',
    });

    // Validate environment variables
    if (!appId || !secretKey) {
      error('❌ Missing Cashfree credentials in environment variables');
      return res.json({
        success: false,
        error: 'Cashfree credentials not configured. Please add CASHFREE_APP_ID and CASHFREE_SECRET_KEY as environment variables.',
      }, 500, corsHeaders);
    }

    // Parse request body safely
    let requestData;
    try {
      requestData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      log('📦 Request data parsed successfully');
    } catch (parseError) {
      error('❌ Failed to parse request body:', parseError);
      return res.json({
        success: false,
        error: 'Invalid request body. Expected JSON.',
      }, 400, corsHeaders);
    }

    // ROUTE 1: Create Payment Order
    if (req.method === 'POST' && !req.path.includes('verify')) {
      log('💳 Processing payment order creation...');

      // Extract and validate required fields
      const {
        orderId,
        orderAmount,
        customerName,
        customerPhone,
        customerEmail,
        orderNote,
      } = requestData;

      // Validate required fields
      if (!orderId || !orderAmount || !customerName || !customerPhone) {
        error('❌ Missing required fields');
        return res.json({
          success: false,
          error: 'Missing required fields: orderId, orderAmount, customerName, customerPhone',
        }, 400, corsHeaders);
      }

      log('📝 Creating Cashfree payment order:', {
        orderId,
        amount: orderAmount,
        customer: customerName,
        phone: customerPhone,
      });

      try {
        // Call Cashfree API
        const cashfreeResponse = await fetch('https://api.cashfree.com/pg/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: parseFloat(orderAmount),
            order_currency: 'INR',
            customer_details: {
              customer_id: customerPhone,
              customer_name: customerName,
              customer_email: customerEmail || `${customerPhone}@buffbuddies.com`,
              customer_phone: customerPhone,
            },
            order_meta: {
              return_url: `https://buffbuddies.synthory.space/booking/success?order_id=${orderId}`,
            },
            order_note: orderNote || 'Buff Buddies Booking',
          }),
        });

        const cashfreeData = await cashfreeResponse.json();

        if (!cashfreeResponse.ok) {
          error('❌ Cashfree API error:', {
            status: cashfreeResponse.status,
            data: cashfreeData,
          });
          return res.json({
            success: false,
            error: cashfreeData.message || 'Failed to create payment order with Cashfree',
          }, 500, corsHeaders);
        }

        log('✅ Payment order created successfully:', cashfreeData.order_id);

        return res.json({
          success: true,
          paymentSessionId: cashfreeData.payment_session_id,
          orderId: cashfreeData.order_id,
        }, 200, corsHeaders);

      } catch (fetchError) {
        error('❌ Error calling Cashfree API:', fetchError);
        return res.json({
          success: false,
          error: 'Failed to connect to Cashfree. Please try again.',
        }, 500, corsHeaders);
      }
    }

    // ROUTE 2: Verify Payment
    if (req.method === 'POST' && req.path.includes('verify')) {
      log('🔍 Processing payment verification...');

      // Extract order ID from path
      const pathParts = req.path.split('/');
      const orderId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

      if (!orderId) {
        error('❌ Order ID missing in path');
        return res.json({
          success: false,
          error: 'Order ID is required in path',
        }, 400, corsHeaders);
      }

      log('🔍 Verifying payment for order:', orderId);

      try {
        // Call Cashfree API to get order status
        const cashfreeResponse = await fetch(
          `https://api.cashfree.com/pg/orders/${orderId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-client-id': appId,
              'x-client-secret': secretKey,
              'x-api-version': '2023-08-01',
            },
          }
        );

        const cashfreeData = await cashfreeResponse.json();

        if (!cashfreeResponse.ok) {
          error('❌ Cashfree verification error:', {
            status: cashfreeResponse.status,
            data: cashfreeData,
          });
          return res.json({
            success: false,
            error: 'Payment verification failed',
          }, 500, corsHeaders);
        }

        log('✅ Payment verified:', {
          orderId: cashfreeData.order_id,
          status: cashfreeData.order_status,
          amount: cashfreeData.order_amount,
        });

        return res.json({
          success: true,
          order_status: cashfreeData.order_status,
          order_amount: cashfreeData.order_amount,
          cf_order_id: cashfreeData.cf_order_id,
          transactionId: cashfreeData.order_id,
        }, 200, corsHeaders);

      } catch (fetchError) {
        error('❌ Error verifying payment:', fetchError);
        return res.json({
          success: false,
          error: 'Failed to verify payment. Please try again.',
        }, 500, corsHeaders);
      }
    }

    // ROUTE 3: Health Check / Invalid Route
    if (req.method === 'GET') {
      log('💚 Health check');
      return res.json({
        success: true,
        message: 'Cashfree payment function is running',
        timestamp: new Date().toISOString(),
      }, 200, corsHeaders);
    }

    // Invalid route
    log('❌ Invalid route');
    return res.json({
      success: false,
      error: 'Invalid route. Use POST for payment operations.',
    }, 404, corsHeaders);

  } catch (unexpectedError) {
    // Catch-all error handler
    error('❌ Unexpected error:', unexpectedError);
    return res.json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      details: unexpectedError.message,
    }, 500, corsHeaders);
  }
};
