from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import stripe

from app.config import settings
from app.db.session import get_session
from app.db.models import User
from app.api.deps import get_current_user

router = APIRouter()

# Inicializar Stripe solo si la clave está configurada
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

# ── Schemas ───────────────────────────────────────────────────────────────────

PLAN_LIMITS = {
    "free":       {"projects": 3,   "pdf": False, "historial_dias": 7,   "usuarios": 1},
    "pro":        {"projects": None, "pdf": True,  "historial_dias": 90,  "usuarios": 1},
    "enterprise": {"projects": None, "pdf": True,  "historial_dias": None, "usuarios": 20},
}

PLAN_PRICE_MAP = {
    "pro":        lambda: settings.stripe_price_pro,
    "enterprise": lambda: settings.stripe_price_enterprise,
}


class SubscriptionInfo(BaseModel):
    plan_type: str
    subscription_status: str
    stripe_customer_id: Optional[str]
    limits: dict


class CheckoutRequest(BaseModel):
    plan: str        # "pro" | "enterprise"
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalRequest(BaseModel):
    return_url: str


class PortalResponse(BaseModel):
    portal_url: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/subscription", response_model=SubscriptionInfo)
async def get_subscription(current_user: User = Depends(get_current_user)):
    """Retorna el plan y límites del usuario autenticado."""
    return SubscriptionInfo(
        plan_type=current_user.plan_type,
        subscription_status=current_user.subscription_status,
        stripe_customer_id=current_user.stripe_customer_id,
        limits=PLAN_LIMITS.get(current_user.plan_type, PLAN_LIMITS["free"]),
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Crea una sesión de Stripe Checkout y retorna la URL de pago."""
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagos no configurados en este entorno")

    if body.plan not in PLAN_PRICE_MAP:
        raise HTTPException(status_code=400, detail="Plan inválido. Opciones: pro, enterprise")

    price_id = PLAN_PRICE_MAP[body.plan]()
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Price ID para plan '{body.plan}' no configurado")

    # Crear o recuperar el customer de Stripe
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name or current_user.email,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        db.add(current_user)
        await db.commit()

    session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        metadata={"user_id": str(current_user.id), "plan": body.plan},
    )

    return CheckoutResponse(checkout_url=session.url)


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    body: PortalRequest,
    current_user: User = Depends(get_current_user),
):
    """Crea una sesión del Customer Portal de Stripe para gestionar la suscripción."""
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagos no configurados en este entorno")

    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="El usuario no tiene una suscripción activa")

    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=body.return_url,
    )

    return PortalResponse(portal_url=session.url)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_session),
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
):
    """Recibe eventos de Stripe. Requiere raw body para validar la firma."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret no configurado")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Firma de webhook inválida")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)

    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        await _handle_subscription_updated(db, data)

    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)

    return {"received": True}


# ── Helpers de webhook ────────────────────────────────────────────────────────

async def _handle_checkout_completed(db: AsyncSession, session: dict):
    user_id = session.get("metadata", {}).get("user_id")
    plan = session.get("metadata", {}).get("plan", "pro")
    subscription_id = session.get("subscription")

    if not user_id:
        return

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    user.plan_type = plan
    user.stripe_subscription_id = subscription_id
    user.subscription_status = "active"
    db.add(user)
    await db.commit()


async def _handle_subscription_updated(db: AsyncSession, subscription: dict):
    customer_id = subscription.get("customer")
    status = subscription.get("status")  # active, past_due, canceled, etc.

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    user.subscription_status = status
    if status not in ("active", "trialing"):
        user.plan_type = "free"

    db.add(user)
    await db.commit()


async def _handle_subscription_deleted(db: AsyncSession, subscription: dict):
    customer_id = subscription.get("customer")

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    user.plan_type = "free"
    user.stripe_subscription_id = None
    user.subscription_status = "canceled"
    db.add(user)
    await db.commit()
