from pydantic import BaseModel

class GoogleAuthIn(BaseModel):
    id_token: str


class UserOut(BaseModel):
    email: str
    name: str | None = None
    picture: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
    is_admin: bool
