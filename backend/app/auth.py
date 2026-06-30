from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt

security = HTTPBearer()

# In MVP, we expect a Supabase JWT or a simple static API Key for ingestion
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-token-for-dev-only")

async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to check if the user is an admin authorized to trigger ingestions.
    In MVP, we validate a JWT token matching the Supabase secret, or a static admin token.
    """
    token = credentials.credentials
    
    # Allow a simple static override for MVP testing
    if token == os.getenv("ADMIN_API_KEY", "zimfire-admin-key-2026"):
        return {"role": "admin", "type": "api_key"}
        
    try:
        # Decode the Supabase JWT
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        
        # Check standard Supabase roles
        role = payload.get("role")
        if role not in ["authenticated", "service_role"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. Must be authenticated."
            )
            
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
