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
