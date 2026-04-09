from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Esto es vital: permite que tu frontend (localhost:5173) hable con este servidor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción pondrás la URL de tu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DATOS ---
class LoginData(BaseModel):
    email: str
    password: str

class UserSettings(BaseModel):
    binance_api_key: str
    binance_api_secret: str

# --- RUTAS DE AUTENTICACIÓN (Auth) ---
@app.post("/auth/login")
def login(data: LoginData):
    # Aquí irá tu lógica de verificación. Por ahora forzamos un OK.
    if data.email == "admin@glorbi.com" and data.password == "1234":
        return {
            "access_token": "token-falso-12345", 
            "user": {"id": 1, "email": data.email, "full_name": "Admin", "role": "admin"}
        }
    raise HTTPException(status_code=401, detail="Credenciales incorrectas")

@app.get("/auth/me")
def get_me():
    # El frontend usa esto para saber si la sesión sigue activa
    return {"id": 1, "email": "admin@glorbi.com", "full_name": "Admin", "role": "admin"}

@app.post("/auth/logout")
def logout():
    return {"message": "Sesión cerrada"}


# --- RUTAS DE ENTIDADES (Base de datos / Binance) ---
@app.get("/api/user-settings")
def get_settings(created_by: str):
    # Aquí irás a tu base de datos a buscar las claves de este usuario
    return [{
        "id": 1, 
        "binance_api_key": "tu_api_key_aqui", 
        "binance_api_secret": "tu_api_secret_aqui"
    }]