import './global.css';
import { StyledComponentsRegistry } from './registry';
import { StoreProvider } from '../lib/StoreProvider';

export const metadata = {
  title: 'Tailor Genie',
  description: 'Conversation App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <StoreProvider>
          <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
        </StoreProvider>
      </body>
    </html>
  );
}
