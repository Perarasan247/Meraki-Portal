from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Standard paginated envelope returned by list endpoints."""

    items: list[T]
    total: int
    page: int
    page_size: int
