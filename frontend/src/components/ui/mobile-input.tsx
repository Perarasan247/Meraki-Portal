import * as React from 'react'
import { Input } from './input'

type MobileInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type'
> & {
  value: string
  /** Receives the sanitized value (digits only, max 10). */
  onValueChange: (value: string) => void
}

/**
 * Mobile-number input used across the whole site and portal. Accepts digits
 * only and caps at exactly 10 characters — non-numeric input is stripped as the
 * user types, so the bound value is always a clean 0–10 digit string.
 */
export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ value, onValueChange, placeholder, ...props }, ref) => (
    <Input
      ref={ref}
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      maxLength={10}
      placeholder={placeholder ?? '10-digit mobile number'}
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
    />
  ),
)
MobileInput.displayName = 'MobileInput'
