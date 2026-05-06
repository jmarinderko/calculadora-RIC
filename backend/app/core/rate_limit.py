"""
Rate limiting centralizado con slowapi.

Estrategia:
- Por IP del cliente (X-Forwarded-For respetado tras proxy Railway).
- Storage en memoria por defecto (suficiente para una sola instancia del backend).
  Para multi-instance escalar a Redis: storage_uri=settings.redis_url.
- Endpoints sensibles (login, register, google) tienen límites estrictos.
- Endpoints /public (calc, mtat, ernc, pf) tienen límites generosos pero
  evitan que un atacante sature la CPU con DoS.

En tests (`environment=test`) el limiter se deshabilita para no romper la
suite — los rate limits son comportamiento de runtime, no de unit tests.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


def _is_test_env() -> bool:
    return settings.environment.lower() in ("test", "testing")


# Storage en memoria local — simple y suficiente para una sola instancia
# del backend. Si en el futuro se escala horizontalmente, migrar a:
#   storage_uri=settings.redis_url
# (verificar antes que el cliente redis síncrono está disponible y la URL
# es accesible desde el container).
_storage_uri = "memory://"


limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    # En tests, fingimos que estamos siempre fuera de los límites
    enabled=not _is_test_env(),
    # Estrategia: ventana fija — más eficiente y predecible
    strategy="fixed-window",
    # headers_enabled=False: con FastAPI + endpoints que retornan Pydantic
    # models (no Response), slowapi falla al intentar inyectar headers de
    # rate-limit (`parameter response must be an instance of ...Response`).
    # El cliente igual puede inferir límites del 429 retornado al exceder.
    headers_enabled=False,
)
