import { SpeedInsights } from "@vercel/speed-insights/next";
import "./styles/buttons.css";
import "./styles/homepage.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
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
