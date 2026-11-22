"""Request and response shapes for /profile."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

import config

Gender = Literal["woman", "man", "non_binary", "other", "prefer_not_to_say"]


class ProfileIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=50)
    birth_year: int | None = None
    gender: Gender | None = None

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not value.isprintable():  # no control characters or hidden formatting tricks
            raise ValueError("invalid_name")
        return value

    @field_validator("birth_year")
    @classmethod
    def check_birth_year(cls, value: int | None) -> int | None:
        if value is None:
            return None
        this_year = datetime.now().year
        if not (this_year - 120 <= value <= this_year - config.MIN_AGE):
            raise ValueError("invalid_birth_year")
        return value


class ProfileOut(BaseModel):
    email: str  # comes from the account; it cannot be edited here
    display_name: str | None
    birth_year: int | None
    age: int | None  # worked out from birth_year; can be off by one before the birthday
    gender: Gender | None
    picture_url: str | None


class PictureOut(BaseModel):
    picture_url: str
