import httpx
from app.config import settings


async def send_email(to: str, subject: str, html: str) -> bool:
    """Envía un email via Resend API. Retorna False si no hay API key configurada."""
    if not settings.resend_api_key:
        return False

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": f"RIC Conductor <{settings.from_email}>",
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
                timeout=10,
            )
            return res.status_code == 200
    except Exception:
        return False


async def send_welcome_email(email: str, name: str | None = None) -> bool:
    nombre = name or email.split("@")[0]
    html = f"""
    <div style="font-family: 'IBM Plex Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0D1117; color: #E6EDF3; padding: 32px; border-radius: 8px;">
      <div style="margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 18px; font-weight: 600; color: #E6EDF3;">
          RIC Conductor<span style="color: #F0B429;">.calc</span>
        </span>
      </div>
      <h1 style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">Bienvenido, {nombre}</h1>
      <p style="color: #8B949E; line-height: 1.7; margin-bottom: 20px;">
        Tu cuenta ha sido creada exitosamente. Ya podés comenzar a calcular conductores
        eléctricos conforme a la norma <strong style="color: #E6EDF3;">NCh Elec 4/2003 (RIC)</strong>.
      </p>
      <div style="background: #161B22; border: 1px solid #30363D; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #8B949E;">Lo que podés hacer:</p>
        <ul style="margin: 0; padding-left: 20px; color: #E6EDF3; font-size: 13px; line-height: 2;">
          <li>Calcular conductores BT, MT/AT y ERNC</li>
          <li>Organizar cálculos en proyectos</li>
          <li>Generar diagrama unifilar SVG</li>
          <li>Exportar memoria de cálculo PDF</li>
        </ul>
      </div>
      <a href="{settings.app_url}/dashboard"
         style="display: inline-block; background: #F0B429; color: #000; font-weight: 600; font-size: 14px; padding: 10px 24px; border-radius: 6px; text-decoration: none;">
        Ir al dashboard →
      </a>
      <p style="margin-top: 28px; font-size: 11px; color: #6E7681;">
        RIC Conductor.calc — NCh Elec 4/2003 · Chile
      </p>
    </div>
    """
    return await send_email(email, "Bienvenido a RIC Conductor.calc", html)
