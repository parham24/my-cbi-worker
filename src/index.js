// =================================================================
// کد کامل و نهایی ورکر - نسخه 3.0
// =================================================================

/**
 * BankAnnouncer یک شیء پایدار (Durable Object) است که اتصالات WebSocket را
 * مدیریت کرده و پیام‌ها را به تمام کلاینت‌های متصل ارسال می‌کند.
 */
export class BankAnnouncer {
  constructor(state, env) {
    this.state = state;
    this.sessions = []; // لیستی از تمام کاربران (WebSocket) متصل
  }

  // متدی برای ارسال پیام به تمام کاربران متصل (Broadcast)
  async broadcast(message) {
    console.log(`Broadcasting message to ${this.sessions.length} clients...`);
    // پیام را به تمام session های فعال ارسال می‌کنیم
    this.sessions = this.sessions.filter(session => {
      try {
        session.send(message);
        return true; // اتصال سالم است، آن را در لیست نگه دار
      } catch (e) {
        // اگر ارسال ناموفق بود (یعنی کلاینت قطع شده)، آن را از لیست حذف می‌کنیم
        console.log("A client has disconnected. Removing from session list.");
        return false;
      }
    });
  }

  // این متد تمام درخواست‌های ورودی به این شیء پایدار را مدیریت می‌کند
  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");

    // حالت ۱: اگر درخواست برای اتصال WebSocket باشد
    if (upgradeHeader === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      this.sessions.push(server);
      console.log("New client connected via WebSocket. Total clients:", this.sessions.length);

      // مدیریت رویدادهای قطع شدن یا خطای اتصال برای پاک‌سازی لیست
      const closeOrErrorHandler = () => {
        this.sessions = this.sessions.filter(s => s !== server);
        console.log("Client disconnected. Total clients:", this.sessions.length);
      };
      server.addEventListener("close", closeOrErrorHandler);
      server.addEventListener("error", closeOrErrorHandler);

      return new Response(null, { status: 101, webSocket: client });
    }

    // حالت ۲: اگر درخواست برای اعلان (announce) یک بانک جدید باشد
    if (request.method === "POST") {
      try {
        const { bankName } = await request.json();
        if (!bankName) {
          return new Response("Error: 'bankName' is required in the JSON body.", { status: 400 });
        }
        
        // پیام را برای همه کاربران متصل ارسال کن
        await this.broadcast(JSON.stringify({ type: 'BANK_ANNOUNCEMENT', bankName: bankName }));
        
        return new Response(`Successfully announced '${bankName}' to clients.`, { status: 200 });

      } catch (e) {
        return new Response(`Error processing announce request: ${e.message}`, { status: 500 });
      }
    }
    
    // اگر درخواست نه WebSocket بود و نه POST
    return new Response("This endpoint is for WebSocket connections or POST announcements.", { status: 400 });
  }
}


/**
 * این بخش اصلی ورکر است که به عنوان روتر (Router) عمل می‌کند.
 * تمام درخواست‌ها ابتدا به اینجا می‌آیند.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // اگر درخواست برای مسیرهای /ws یا /announce بود، آن را به Durable Object بفرست
    if (url.pathname.startsWith('/ws') || url.pathname.startsWith('/announce')) {
      const id = env.BANK_ANNOUNCER.idFromName("global-announcer");
      const stub = env.BANK_ANNOUNCER.get(id);
      return stub.fetch(request);
    }

    // اینجا می‌توانید منطق دیگر خود (مثل ارسال پیام به تلگرام) را در آینده اضافه کنید
    // if (url.pathname === '/notify-telegram') { ... }

    // در صورتی که مسیر درخواست با هیچکدام از موارد بالا مطابقت نداشت
    return new Response("Path not found. Please use /ws or /announce.", { status: 404 });
  }
};
