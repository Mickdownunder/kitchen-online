'use client'

import LoginForm from '@/components/Auth/LoginForm'

export default function LoginPage() {
  // Don't check session here - let middleware handle it
  // This prevents redirect loops
  return <LoginForm />
}
