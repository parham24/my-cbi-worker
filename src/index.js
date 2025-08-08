// =================================================================
// بخش ۱: شیء پایدار برای مدیریت اتصالات مرورگرها (WebSocket)
// =================================================================
export class BankAnnouncer {
  constructor(state, env) {
    this.state = state;
    this.sessions = []; // لیستی از تمام کاربران متصل
  }

  // متدی برای ارسال پیام به تمام کاربران متصل
  async broadcast(message) {
    console.log(`Broadcasting message to ${this.sessions.length} clients...`);
    // پیام را به تمام session های فعال ارسال می‌کنیم
    this.sessions = this.sessions.filter(session => {
      try {
        session.send(message);
        return true; // اتصال سالم است، نگهش دار
      } catch (e) {
        // اگر ارسال ناموفق بود (کلاینت قطع شده)، آن را از لیست حذف می‌کنیم
        console.log("A client has disconnected. Removing from session list.");
        return false;
      }
    });
  }

  // مدیریت درخواست‌های ورودی به این شیء
  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");

    // اگر درخواست برای اتصال WebSocket از طرف یوزراسکرپیت بود
    if (upgradeHeader === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      this.sessions.push(server);
      console.log("New client connected via WebSocket. Total clients:", this.sessions.length);

      // پاک کردن session در صورت قطع اتصال
      const closeOrErrorHandler = () => {
        this.sessions = this.sessions.filter(s => s !== server);
        console.log("Client disconnected. Total clients:", this.sessions.length);
      };
      server.addEventListener("close", closeOrErrorHandler);
      server.addEventListener("error", closeOrErrorHandler);

      return new Response(null, { status: 101, webSocket: client });
    }

    // اگر درخواست برای اعلان بانک بود (از curl یا اسکریپت دیگر)
    if (request.method === "POST") {
      try {
        const { bankName } = await request.json();
        if (!bankName) {
          return new Response("Error: 'bankName' is required.", { status: 400 });
        }
        
        // پیام را برای همه کاربران متصل ارسال کن
        await this.broadcast(JSON.stringify({ type: 'BANK_ANNOUNCEMENT', bankName: bankName }));
        
        return new Response(`Successfully announced '${bankName}' to clients.`, { status: 200 });

      } catch (e) {
        return new Response(`Error processing announce request: ${e.message}`, { status: 500 });
      }
    }
    
    return new Response("This endpoint is for WebSocket connections or POST announcements.", { status: 400 });
  }
}


// =================================================================
// بخش ۲: روتر اصلی ورکر (نقطه ورود همه درخواست‌ها)
// =================================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // مسیر ۱: برای اتصال WebSocket و اعلان بانک (مربوط به یوزراسکرپیت)
    if (url.pathname === '/ws' || url.pathname === '/announce') {
      console.log(`Routing request for ${url.pathname} to BankAnnouncer...`);
      const id = env.BANK_ANNOUNCER.idFromName("global-announcer");
      const stub = env.BANK_ANNOUNCER.get(id);
      
      // اگر مسیر /announce بود، یک درخواست POST جدید بساز که فقط حاوی بدنه باشد
      // این کار برای سادگی در منطق Durable Object انجام می‌شود
      if (url.pathname === '/announce') {
          return stub.fetch(new Request(url, {
              method: 'POST',
              headers: request.headers,
              body: request.body
          }));
      }
      
      return stub.fetch(request);
    }

    // مسیر ۲: برای اطلاع‌رسانی به تلگرام (کد شما در اینجا قرار می‌گیرد)
    // من یک مسیر نمونه به نام /notify-telegram ایجاد کردم
    if (url.pathname === '/notify-telegram') {
      console.log("Routing request to Telegram notifier...");
      // ================================================================
      // !!!!!!!!!! کد مربوط به ارسال پیام به تلگرام خود را اینجا قرار دهید !!!!!!!!!!
      // برای مثال:
      // const BOT_TOKEN = env.BOT_TOKEN; // توکن را از Secrets بگیرید
      // const CHAT_ID = env.CHAT_ID; // آیدی کانال را از Secrets بگیرید
      // const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=Bank refreshed!`);
      // return response;
      // ================================================================
      return new Response("This is the Telegram notification endpoint. Implement your logic here.", { status: 200 });
    }

    // در صورتی که هیچ مسیری مطابقت نداشت
    return new Response("Not found. Available paths: /ws, /announce, /notify-telegram", { status: 404 });
  }
};
