import { ScrollViewStyleReset } from "expo-router/html";

/**
 * Root HTML document for the static web export. Expo Router wraps every
 * route's prerendered output in this shell, so this is the only place able
 * to set `<html lang>` and page-level meta tags/title for the whole app.
 *
 * IMPORTANT: do not set `dir="rtl"` here. Every screen already simulates RTL
 * manually with `flexDirection: "row-reverse"` and `textAlign: "right"`,
 * assuming the document's base direction is LTR. CSS flexbox auto-mirrors
 * `row`/`row-reverse` when `dir="rtl"` is set, which double-flips every one
 * of those layouts back to looking LTR - that visual regression is exactly
 * what setting `dir="rtl"` here caused.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he">
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
