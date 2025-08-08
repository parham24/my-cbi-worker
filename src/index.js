// =======================================================
// کد تست ساده برای بررسی اتصال WebSocket
// =======================================================
export default {
  async fetch(request, env) {
    // بررسی می‌کنیم که آیا درخواست برای ارتقا به WebSocket است
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('این ورکر فقط برای اتصالات WebSocket است.', { status: 426 });
    }

    // ایجاد یک جفت WebSocket
    const [client, server] = Object.values(new WebSocketPair());

    // قبول کردن اتصال در سمت سرور
    server.accept();

    // ارسال یک پیام خوشامدگویی به کلاینت به محض اتصال
    server.send(JSON.stringify({ message: "اتصال با ورکر تست با موفقیت برقرار شد!" }));

    // منتظر پیام از طرف کلاینت می‌مانیم
    server.addEventListener('message', event => {
      console.log(`پیام از کلاینت دریافت شد: ${event.data}`);
      // یک پاسخ به کلاینت ارسال می‌کنیم
      server.send(JSON.stringify({ reply: "پیام شما دریافت شد." }));
    });
    
    // مدیریت قطع اتصال
    server.addEventListener('close', () => {
      console.log("اتصال قطع شد.");
    });

    // برگرداندن پاسخ برای تکمیل فرآیند ارتقا به WebSocket
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  },
};
