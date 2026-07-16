"""Server-side pagination helper for list endpoints.

Callers build a PostgREST query whose ``select`` includes ``count="exact"`` so
the total is returned alongside the page — one round-trip, only ``page_size``
rows transferred.
"""

MAX_PAGE_SIZE = 100


def paginate(query, page: int, page_size: int) -> dict:
    page = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    start = (page - 1) * page_size
    end = start + page_size - 1
    res = query.range(start, end).execute()
    return {
        "items": res.data,
        "total": res.count or 0,
        "page": page,
        "page_size": page_size,
    }


def ilike_or(search: str, columns: list[str]) -> str:
    """Build a PostgREST ``or`` filter matching ``search`` across text columns."""
    term = search.strip().replace("%", "").replace(",", " ")
    return ",".join(f"{col}.ilike.%{term}%" for col in columns)
