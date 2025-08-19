import { SpeedInsights } from "@vercel/speed-insights/next";
import "./styles/buttons.css";
import "./styles/homepage.css";
import "./styles/hover-effects.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          fontFamily:
            '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"',
          color: "#fff",
          backgroundColor: "#000",
        }}
      >
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root">
          {children}
        </div>
        <SpeedInsights />

      </body>
    </html>
  );
}
