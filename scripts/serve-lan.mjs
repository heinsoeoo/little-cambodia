import { networkInterfaces } from "node:os";
const adapters = networkInterfaces();
const addresses = [
  ...(adapters.en0 || []),
  ...Object.entries(adapters)
    .filter(([name]) => name !== "en0")
    .flatMap(([, items]) => items),
];
const lan = addresses.find(
  (a) =>
    a.family === "IPv4" &&
    !a.internal &&
    (/^(10\.|192\.168\.)/.test(a.address) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(a.address)),
);
if (!process.env.HOST && !lan)
  throw new Error(
    "Connect this computer to Wi-Fi or set HOST to its local network address.",
  );
process.env.HOST ||= lan.address;
process.env.PORT ||= "5175";
await import("../server/index.js");
