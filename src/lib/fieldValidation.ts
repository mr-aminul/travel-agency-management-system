/** Shared field checks used across create/edit forms. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSPORT_RE = /^[A-Za-z0-9]{6,12}$/
const NAME_RE = /^[\p{L}\p{M} .'-]{2,80}$/u

export function trimmed(value: string): string {
  return value.trim()
}

export function isFilled(value: string): boolean {
  return trimmed(value).length > 0
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed(value))
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function validateRequiredText(
  value: string,
  label: string,
  minLength = 1,
): string | undefined {
  const text = trimmed(value)
  if (!text) return `${label} is required.`
  if (text.length < minLength) {
    return minLength === 1
      ? `${label} is required.`
      : `Enter at least ${minLength} characters.`
  }
  return undefined
}

export function validateRequiredName(
  value: string,
  label = 'Full name',
): string | undefined {
  const required = validateRequiredText(value, label, 2)
  if (required) return required
  if (!NAME_RE.test(trimmed(value))) return `Enter a valid ${label.toLowerCase()}.`
  return undefined
}

export function validateOptionalPersonName(
  value: string,
  label: string,
): string | undefined {
  const text = trimmed(value)
  if (!text) return undefined
  if (text.length < 2 || !NAME_RE.test(text)) {
    return `Enter a valid ${label.toLowerCase()}.`
  }
  return undefined
}

export function validateRequiredPhone(
  value: string,
  options: { duplicateName?: string; label?: string } = {},
): string | undefined {
  const label = options.label ?? 'Mobile number'
  const text = trimmed(value)
  if (!text) return `${label} is required.`
  if (/[^\d+\s()-]/.test(text)) {
    return 'Use digits only for the mobile number.'
  }
  const digits = digitsOnly(text)
  if (digits.length < 10 || digits.length > 15) {
    return 'Enter a valid mobile number (10–15 digits).'
  }
  if (options.duplicateName) {
    return `This mobile number is already registered to ${options.duplicateName}.`
  }
  return undefined
}

export function validateOptionalEmail(value: string): string | undefined {
  const text = trimmed(value)
  if (!text) return undefined
  if (!EMAIL_RE.test(text)) return 'Enter a valid email address.'
  return undefined
}

export function validateRequiredEmail(value: string): string | undefined {
  const text = trimmed(value)
  if (!text) return 'Email is required.'
  return validateOptionalEmail(text)
}

export function validateRequiredPassword(value: string): string | undefined {
  if (!value) return 'Password is required.'
  if (value.length < 4) return 'Password must be at least 4 characters.'
  return undefined
}

export function validateOptionalPassport(value: string): string | undefined {
  const text = trimmed(value)
  if (!text) return undefined
  if (!PASSPORT_RE.test(text)) {
    return 'Passport should be 6–12 letters or numbers.'
  }
  return undefined
}

export function validateRequiredPassport(value: string): string | undefined {
  const text = trimmed(value)
  if (!text) return 'Passport number is required.'
  return validateOptionalPassport(text)
}

export function validateOptionalNid(value: string): string | undefined {
  const text = trimmed(value)
  if (!text) return undefined
  if (/[^\d\s-]/.test(text)) return 'NID should contain digits only.'
  const digits = digitsOnly(text)
  if (![10, 13, 17].includes(digits.length)) {
    return 'NID should be 10, 13, or 17 digits.'
  }
  return undefined
}

export function validateOptionalText(
  value: string,
  label: string,
  maxLength = 200,
): string | undefined {
  const text = trimmed(value)
  if (!text) return undefined
  if (text.length < 2) return `Enter a valid ${label.toLowerCase()}.`
  if (text.length > maxLength) {
    return `${label} is too long (max ${maxLength} characters).`
  }
  return undefined
}

export function validateOptionalDate(
  value: string,
  label: string,
): string | undefined {
  const text = trimmed(value)
  if (!text) return undefined
  if (!parseDate(text)) return `Enter a valid ${label.toLowerCase()}.`
  return undefined
}

export function validateOptionalDateOfBirth(value: string): string | undefined {
  const base = validateOptionalDate(value, 'Date of birth')
  if (base) return base
  const date = parseDate(value)
  if (!date) return undefined
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date > today) return 'Date of birth cannot be in the future.'
  return undefined
}

/**
 * Passport dates stay optional until a passport number is entered;
 * then both issue and expiry are required.
 */
export function validatePassportDates(
  issuedOn: string,
  expiry: string,
  passport = '',
): { issuedOn?: string; expiry?: string } {
  const needsDates = isFilled(passport)
  const issuedError = needsDates && !isFilled(issuedOn)
    ? 'Date of issue is required when passport number is set.'
    : validateOptionalDate(issuedOn, 'Date of issue')
  const expiryError = needsDates && !isFilled(expiry)
    ? 'Date of expiry is required when passport number is set.'
    : validateOptionalDate(expiry, 'Date of expiry')
  if (issuedError || expiryError) {
    return { issuedOn: issuedError, expiry: expiryError }
  }
  const issued = parseDate(issuedOn)
  const expires = parseDate(expiry)
  if (issued && expires && expires < issued) {
    return { expiry: 'Expiry must be on or after the issue date.' }
  }
  return {}
}

export function validateOptionalMoney(
  value: string,
  label = 'Amount',
): string | undefined {
  const text = trimmed(value)
  if (!text) return undefined
  if (!/^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(text)) {
    return `Enter a valid ${label.toLowerCase()}.`
  }
  const amount = Number(text.replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount < 0) {
    return `Enter a valid ${label.toLowerCase()}.`
  }
  return undefined
}

export function validateRequiredMoney(
  value: string,
  label = 'Amount',
): string | undefined {
  const text = trimmed(value)
  if (!text) return `${label} is required.`
  const formatError = validateOptionalMoney(text, label)
  if (formatError) return formatError
  const amount = Number(text.replace(/,/g, ''))
  if (amount <= 0) return `${label} must be greater than 0.`
  return undefined
}

export function validateRequiredSelect(
  value: string,
  label: string,
): string | undefined {
  return trimmed(value) ? undefined : `Select a ${label.toLowerCase()}.`
}
