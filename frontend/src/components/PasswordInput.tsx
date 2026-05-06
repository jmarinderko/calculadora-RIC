'use client'

import { useState } from 'react'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  autoComplete?: string
  className?: string
  id?: string
  name?: string
}

/**
 * Input de contraseña con toggle "ver/ocultar" — icono ojo a la derecha.
 *
 * Reutilizable en login, register y cambio de password.
 * Mantiene el styling de los inputs del proyecto (dark mode, foco azul).
 */
export function PasswordInput({
  value,
  onChange,
  required = false,
  placeholder,
  autoComplete = 'current-password',
  className,
  id,
  name,
}: PasswordInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={
          className ??
          'w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 pr-10 text-sm text-[#E6EDF3] placeholder:text-[#6E7681] focus:outline-none focus:border-[#58A6FF] transition-colors'
        }
        // Padding right reservado para no superponer con el icono
        style={{ paddingRight: '2.25rem' }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[#6E7681] hover:text-[#E6EDF3] focus:outline-none focus:text-[#58A6FF] transition-colors"
      >
        {show ? (
          // Ojo tachado (ocultar) — icono Heroicons "eye-slash"
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          // Ojo abierto (mostrar) — icono Heroicons "eye"
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
