import type { NextConfig } from "next";

// W przeciwieństwie do strony głównej (output: "export") ta aplikacja
// działa Z SERWEREM — Plugin 1 potrzebuje backendu (kanał JSON + dyspozytor
// AJAX od Działu 3, baza od Działu 2). Dev i start na porcie 3001.
const nextConfig: NextConfig = {};

export default nextConfig;
