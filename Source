/**
 * CASHFREE PAYMENT GATEWAY - APPWRITE FUNCTION
 * Handles payment order creation and verification
 */

export default async ({ req, res, log, error }) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // Allow all origins (or specify your domain)
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.json({ ok: true }, 200, headers);
  }

  // Get Cashfree credentials from environment variables (preferred) or request body (fallback)
  const getCredentials = (requestBody) => {
    const parsed = requestBody ? JSON.parse(requestBody) : {};
    
    return {
      appId: process.env.CASHFREE_APP_ID || parsed.appId,
      secretKey: process.env.CASHFREE_SECRET_KEY || parsed.secretKey,
    };
  };

  // ROUTE: Create Payment Order
  if (req.method === 'POST' && !req.path.includes('/verify/')) {
    try {
      const {
        orderId,
        orderAmount,
        customerName,
        customerPhone,
        customerEmail,
        orderNote,
      } = JSON.parse(req.body);

      // Get credentials from environment or request
      const { appId, secretKey } = getCredentials(req.body);

      log('📝 Creating Cashfree payment order:', {
        orderId,
        amount: orderAmount,
        customer: customerName,
        usingEnvVars: !!process.env.CASHFREE_APP_ID,
      });

      // Validate inputs
      if (!orderId || !orderAmount || !customerName || !customerPhone) {
        throw new Error('Missing required order fields');
      }

      if (!appId || !secretKey) {
        throw new Error('Cashfree credentials not found. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY as environment variables.');
      }

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
          order_amount: orderAmount,
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
        error('❌ Cashfree API error:', cashfreeData);
        throw new Error(cashfreeData.message || 'Failed to create payment order');
      }

      log('✅ Payment order created successfully:', cashfreeData.order_id);

      return res.json({
        success: true,
        paymentSessionId: cashfreeData.payment_session_id,
        orderId: cashfreeData.order_id,
      }, 200, headers);

    } catch (err) {
      error('❌ Error creating payment order:', err.message);
      return res.json({
        success: false,
        error: err.message || 'Failed to create payment order'
      }, 500, headers);
    }
  }

  // ROUTE: Verify Payment
  if (req.method === 'POST' && req.path.includes('/verify/')) {
    try {
      const orderId = req.path.split('/verify/')[1];
      
      // Get credentials from environment or request
      const { appId, secretKey } = getCredentials(req.body);

      log('🔍 Verifying payment for order:', orderId);

      // Validate inputs
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      if (!appId || !secretKey) {
        throw new Error('Cashfree credentials not found. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY as environment variables.');
      }

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
        error('❌ Cashfree verification error:', cashfreeData);
        throw new Error('Payment verification failed');
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
      }, 200, headers);

    } catch (err) {
      error('❌ Error verifying payment:', err.message);
      return res.json({
        success: false,
        error: err.message || 'Payment verification failed'
      }, 500, headers);
    }
  }

  // Invalid route
  return res.json({
    success: false,
    error: 'Invalid route'
  }, 404, headers);
};
