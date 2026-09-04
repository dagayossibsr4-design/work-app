import { ScrollViewStyleReset } from "expo-router/html";

/**
 * Root HTML document for the static web export. Expo Router wraps every
 * route's prerendered output in this shell, so this is the only place able
 * to set `<html lang/dir>` and page-level meta tags/title for the whole app.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0B1224" />
        <meta
          name="description"
          content="ProLifto - יומן אימונים ותזונה חכם: מעקב אימוני כוח ואירובי, תכנון תזונה ומאקרו, וניתוח התקדמות במקום אחד."
        />
        <title>ProLifto - יומן אימונים ותזונה</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
