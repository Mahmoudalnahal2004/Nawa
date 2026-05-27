import aiosmtplib
from email.message import EmailMessage
from app.core.config import settings

async def send_verification_email(email: str, token: str):
    """Sends a verification email using SMTP or falls back to print."""
    verify_url = f"{settings.FRONTEND_URL}/verify?token={token}"
    
    try:
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD and settings.SMTP_SERVER:
            message = EmailMessage()
            message["Subject"] = "Verify your Nawa Q-Bank Account"
            message["From"] = settings.SMTP_USERNAME
            message["To"] = email
            
            html_content = f"""
            <html>
                <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Welcome to Nawa Q-Bank!</h2>
                    <p>Please click the link below to verify your account and get started:</p>
                    <p>
                        <a href="{verify_url}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #10b981; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Account</a>
                    </p>
                    <br/>
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p><a href="{verify_url}">{verify_url}</a></p>
                </body>
            </html>
            """
            
            message.set_content(html_content, subtype="html")
            
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_SERVER,
                port=settings.SMTP_PORT,
                start_tls=True,
                username=settings.SMTP_USERNAME,
                password=settings.SMTP_PASSWORD,
            )
        else:
            # Fallback if SMTP is not fully configured
            print(f"MOCK EMAIL: {verify_url}")
    except Exception as e:
        # Fallback if sending fails
        print(f"Failed to send email: {e}")
        print(f"MOCK EMAIL: {verify_url}")
