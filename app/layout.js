import './globals.css';

export const metadata = {
  title: 'Pulse — Customer Intelligence',
  description: 'Churn risk and review sentiment analysis for your customers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
