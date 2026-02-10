import "./global.css";
import { StyledComponentsRegistry } from "./registry";

export const metadata = {
  title: "Tailor Genie",
  description: "Conversation App with Bubble UI",
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
