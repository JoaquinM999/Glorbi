/**
 * base44Client.js — COMPATIBILITY SHIM (CORREGIDO)
 *
 * Este archivo existe solo por si algún componente que no actualizamos
 * todavía hace `import { base44 } from "@/api/base44Client"`.
 *
 * FIX: la versión anterior de este shim tenía redirectToLogin() sin
 * protección contra loops — si algo la llamaba repetidamente (por ejemplo,
 * un useEffect mal dependenciado, o un componente que aún no fue migrado),
 * generaba un redirect infinito con la URL creciendo sin control
 * (returnUrl=returnUrl=returnUrl=...).
 *
 * Ahora redirectToLogin():
 *   1. No hace nada si ya estás en /login (evita el loop de raíz)
 *   2. No vuelve a envolver una URL que ya tiene ?returnUrl= (evita el anidado)
 *
 * Lo ideal es que nada importe desde acá — usá @/api/auth directamente.
 * Podés borrar este archivo una vez confirmes que nada lo importa:
 *   grep -r "base44Client" src/
 */
import { getMe, login, logout, hasToken } from './auth'
import { entities } from './entities'
import { integrations } from './integrations'

export const base44 = {
  auth: {
    me: getMe,
    login,
    logout: () => logout(),
    hasToken,

    /**
     * Redirige a /login de forma segura — sin loops.
     */
    redirectToLogin: (returnUrl) => {
      // Guardia 1: si ya estamos en /login, no hacer nada
      if (window.location.pathname.startsWith('/login')) {
        return
      }
      // Guardia 2: no anidar returnUrl si la URL actual ya tiene uno
      const dest = returnUrl || window.location.href
      const alreadyHasReturnUrl = dest.includes('returnUrl=')
      const safeDest = alreadyHasReturnUrl
        ? window.location.pathname // usar solo el path limpio, sin query params anidados
        : dest

      window.location.href = `/login?returnUrl=${encodeURIComponent(safeDest)}`
    },
  },
  entities,
  integrations,
}

export default base44
