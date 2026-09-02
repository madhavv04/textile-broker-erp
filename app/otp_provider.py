"""
SMS provider abstraction for sending OTPs in production.

In dev (ENV=dev), OTPs are returned directly in the API response and this
module is not used. In prod, wire up a real provider below and set
SMS_PROVIDER + credentials via env vars.
"""
import logging
from .config import settings

logger = logging.getLogger("textile_broker.otp")


def send_otp_sms(mobile: str, otp: str) -> bool:
    """Send an OTP SMS. Returns True on (assumed) success.

    Replace the body with a real provider call, e.g.:

        # Twilio
        from twilio.rest import Client
        client = Client(settings.twilio_sid, settings.twilio_auth_token)
        client.messages.create(
            body=f"Your Textile Broker ERP OTP is {otp}. Valid for 5 minutes.",
            from_=settings.twilio_from_number,
            to=f"+91{mobile}",
        )

        # MSG91 / Fast2SMS (India-focused, common for +91 numbers)
        import requests
        requests.post("https://api.msg91.com/api/v5/otp", json={...})
    """
    if settings.is_dev:
        # Never actually send in dev — the OTP is already in the response.
        logger.info(f"[DEV] Skipping real SMS send for {mobile}; OTP={otp}")
        return True

    logger.warning(
        f"No SMS provider configured — OTP for {mobile} was generated but not sent. "
        "Set SMS_PROVIDER credentials in .env and implement send_otp_sms()."
    )
    return False
