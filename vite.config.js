import { defineConfig } from "vite";
import { createMultiplayer } from "./server/multiplayer.js";
export default defineConfig({
  plugins: [
    {
      name: "riverside-multiplayer",
      configureServer(server) {
        if (!server.httpServer) return;
        const multiplayer = createMultiplayer(server.httpServer);
        server.httpServer.once("close", () => multiplayer.close());
      },
    },
  ],
});
