import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.msn.messenger",
  appName: "MSN Messenger",
  webDir: "dist/client",
  server: {
    // Carrega o app publicado dentro do app nativo (hot reload sem recompilar).
    // Para empacotar 100% offline, remova o bloco "server" e rode: npm run build && npx cap sync
    url: "https://msn-danger.lovable.app",
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#0054e3",
    },
  },
};

export default config;