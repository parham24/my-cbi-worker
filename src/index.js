export class BankAnnouncer {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    
    server.accept();
    this.sessions.push(server);

    server.addEventListener("message", event => {
      console.log("Message received: " + event.data);
      server.send(JSON.stringify({ response: "Message received!" }));
    });

    const closeOrErrorHandler = () => {
      this.sessions = this.sessions.filter(session => session !== server);
    };
    server.addEventListener("close", closeOrErrorHandler);
    server.addEventListener("error", closeOrErrorHandler);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      try {
        const id = env.BANK_ANNOUNCER.idFromName("global-announcer");
        const stub = env.BANK_ANNOUNCER.get(id);
        return stub.fetch(request);
      } catch (e) {
        return new Response(e.message, { status: 500 });
      }
    }
    return new Response("Not found", { status: 404 });
  }
};
این هم wrangler github من : 
name = "tg-api"
main = "src/index.js"
compatibility_date = "2024-03-20"

[[kv_namespaces]]
binding = "DB"
id = "2dc096d76e484bb99717872c192b97a7"

[[kv_namespaces]]
binding = "SCORES_DB"
id = "ff32fe0bd69da49bc8f9f6bc2cc23e8e"

[[durable_objects.bindings]]
name = "BANK_ANNOUNCER"
class_name = "BankAnnouncer"

[migrations]
dir = "./migrations"
tag = "v9"
