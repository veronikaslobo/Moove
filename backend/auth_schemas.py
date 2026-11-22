"""Request and response shapes for /auth. No response ever contains a password hash."""

from datetime import date

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    # Length matters more than symbol rules. The max stops absurdly long inputs.
    password: str = Field(min_length=10, max_length=128)
    # "YYYY-MM-DD". Only used to check the person is 18 or older, never stored.
    birth_date: date


class LoginIn(BaseModel):
    # Plain str on purpose: a malformed email must give the same generic 401 as a wrong password.
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    email: str
