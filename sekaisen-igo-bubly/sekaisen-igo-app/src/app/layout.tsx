import "./global.css";
import { StyledComponentsRegistry } from "./registry";

export const metadata = {
  title: "世界線囲碁",
  description: "Go Game with World Line Graph",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
