import './globals.css'

export const metadata = {
  title: 'BenefitArc Tools',
  description: 'Financial analytics for Social Security Disability law practices',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
