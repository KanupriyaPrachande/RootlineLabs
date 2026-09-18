export const metadata = {
  title: 'Rootline',
  description: 'Runtime trust layer for AI agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#0A0D0A',
          color: '#EDEDE5',
          minHeight: '100vh',
        }}
      >
                <style
          dangerouslySetInnerHTML={{
            __html: `:root { --font-display: 'Fraunces', serif; --font-mono: 'JetBrains Mono', monospace; }`,
          }}
        />
        
        {children}
      </body>
    </html>
  )
}
