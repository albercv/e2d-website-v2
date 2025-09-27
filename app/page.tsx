import { redirect } from 'next/navigation'

export default function RootRedirect() {
  // Redirect root to default locale
  redirect('/es')
}