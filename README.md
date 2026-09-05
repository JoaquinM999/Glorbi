## Noticias en vivo

El radar RSS se actualiza automáticamente cada 60 segundos. Para activar las publicaciones de las cuentas X que cada usuario sigue, configura en el backend:

```env
X_BEARER_TOKEN=tu_token_de_X
LIBRETRANSLATE_URL=https://tu-instancia-de-libretranslate
# LIBRETRANSLATE_API_KEY=opcional
```

Desde `Signal Panel` se puede seguir cualquier usuario de X escribiendo su `@handle`. Las publicaciones se consultan cada 60 segundos y las noticias incluyen traducción bajo demanda entre español e inglés. X y la traducción son integraciones opcionales; no se guardan tokens en el navegador.

La verificación de email requiere un dominio remitente verificado en Resend para entregar mensajes a clientes reales. Configura `RESEND_API_KEY`, `EMAIL_FROM` con ese dominio y `FRONTEND_URL` con la URL pública. Los reportes enviados desde `Reportar` se guardan en SQLite y se notifican a `ADMIN_EMAIL` cuando está configurado.

