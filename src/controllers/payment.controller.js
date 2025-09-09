import { createPaymentService, notifyPaymentService } from '../services/payment.service.js'

export const createPayment = async (req, res) => {
  try {
    const { transactionId } = req.body
    const result = await createPaymentService(transactionId)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: 'Failed to create payment', error: err.message })
  }
}

export const notifyPayment = async (req, res) => {
  try {
    const result = await notifyPaymentService(req.body)
    res.json({ message: "OK", result })
  } catch (err) {
    res.status(400).json({ message: 'Notify failed', error: err.message })
  }
}

export const paymentReturn = async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Return</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
          <div style="text-align:center;">
            <h2>Pembayaran selesai 🎉</h2>
            <p>Kamu bisa kembali ke aplikasi.</p>
          </div>
          <script>
            // kirim pesan ke React Native WebView
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage("close-webview");
            }
            // fallback: auto close kalau di browser biasa
            setTimeout(() => {
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ message: "Error rendering return page", error });
  }
};
