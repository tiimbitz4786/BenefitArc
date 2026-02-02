import './globals.css'
import AuthWrapper from '@/components/AuthWrapper'

export const metadata = {
  title: 'BenefitArc Tools',
  description: 'Financial analytics for Social Security Disability law practices',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  )
}
