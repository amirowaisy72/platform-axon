import { LiveSupportProvider } from './AllContext/ChatContext';
import { UsersProvider } from './AllContext/UsersContext';
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Dashboard</title>
      </head>
      <body>
        <UsersProvider><LiveSupportProvider>{children}</LiveSupportProvider></UsersProvider>
      </body>
    </html>
  )
}

export const metadata = {
  generator: 'v0.dev'
};
