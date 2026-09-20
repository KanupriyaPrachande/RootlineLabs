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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,900&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          background: '#FAFAFA',
          color: '#2B2A28',
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root { 
                --font-display: 'Fraunces', serif; 
                --font-mono: 'JetBrains Mono', monospace; 
                --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              }
              * { box-sizing: border-box; }
            `,

          }}
        />
        {children}
      </body>
    </html>
  )
}
