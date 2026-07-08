"""LMS authoring API (admin/staff). Gated by the `curriculum` module.

Content hierarchy: curriculum -> modules -> lessons -> blocks; quizzes attach
to a module or a lesson; questions belong to a quiz. Every child row
denormalizes branch_id (resolved from its parent) so RLS branch policies apply.
Student-facing read/grade endpoints are intentionally NOT here — that surface
is built later for the separate student website.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.scoping import log_audit
from app.core.supabase_client import get_scoped_client
from app.models.lms import (
    BlockCreate,
    BlockOut,
    BlockUpdate,
    CurriculumContent,
    LessonCreate,
    LessonOut,
    LessonUpdate,
    ModuleCreate,
    ModuleOut,
    ModuleUpdate,
    QuestionCreate,
    QuestionOut,
    QuestionUpdate,
    QuizCreate,
    QuizOut,
    QuizUpdate,
    ReorderRequest,
)

router = APIRouter(prefix="/lms", tags=["lms"])

MODULE = "curriculum"


def _row_branch(client, table: str, row_id: str, extra: str = "") -> dict:
    """Fetch a parent row (branch_id + optional extra cols) or 404."""
    cols = "branch_id" + (f",{extra}" if extra else "")
    res = client.table(table).select(cols).eq("id", row_id).single().execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{table[:-1]} not found")
    return res.data


def _reorder(client, table: str, ids: list[str]) -> None:
    for i, row_id in enumerate(ids):
        client.table(table).update({"order_index": i}).eq("id", row_id).execute()


# --------------------------------------------------------------------------- #
# Full authoring tree
# --------------------------------------------------------------------------- #
@router.get("/curricula/{curriculum_id}/content", response_model=CurriculumContent)
def get_content(curriculum_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    _row_branch(client, "curricula", curriculum_id)

    modules = (
        client.table("curriculum_modules")
        .select("*")
        .eq("curriculum_id", curriculum_id)
        .order("order_index")
        .execute()
        .data
    )
    lessons = (
        client.table("lessons").select("*").order("order_index").execute().data
    )
    blocks = (
        client.table("lesson_blocks").select("*").order("order_index").execute().data
    )
    quizzes = client.table("quizzes").select("*").eq("curriculum_id", curriculum_id).execute().data
    questions = client.table("quiz_questions").select("*").order("order_index").execute().data

    q_by_id = {q["id"]: {**q, "questions": []} for q in quizzes}
    for qn in questions:
        if qn["quiz_id"] in q_by_id:
            q_by_id[qn["quiz_id"]]["questions"].append(qn)
    quiz_by_module = {q["module_id"]: q for q in q_by_id.values() if q.get("module_id")}
    quiz_by_lesson = {q["lesson_id"]: q for q in q_by_id.values() if q.get("lesson_id")}

    blocks_by_lesson: dict[str, list] = {}
    for b in blocks:
        blocks_by_lesson.setdefault(b["lesson_id"], []).append(b)

    lessons_by_module: dict[str, list] = {}
    for ls in lessons:
        node = {**ls, "blocks": blocks_by_lesson.get(ls["id"], []), "quiz": quiz_by_lesson.get(ls["id"])}
        lessons_by_module.setdefault(ls["module_id"], []).append(node)

    module_tree = [
        {
            **m,
            "lessons": lessons_by_module.get(m["id"], []),
            "quiz": quiz_by_module.get(m["id"]),
        }
        for m in modules
    ]
    return {"curriculum_id": curriculum_id, "modules": module_tree}


# --------------------------------------------------------------------------- #
# Modules
# --------------------------------------------------------------------------- #
@router.post("/curricula/{curriculum_id}/modules", response_model=ModuleOut, status_code=201)
def create_module(
    curriculum_id: str, payload: ModuleCreate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    branch_id = _row_branch(client, "curricula", curriculum_id)["branch_id"]
    data = payload.model_dump()
    data.update(curriculum_id=curriculum_id, branch_id=branch_id)
    row = client.table("curriculum_modules").insert(data).execute().data[0]
    log_audit(client, user, "create", "module", row["id"], {"title": row["title"]})
    return row


@router.patch("/modules/{module_id}", response_model=ModuleOut)
def update_module(
    module_id: str, payload: ModuleUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    res = client.table("curriculum_modules").update(updates).eq("id", module_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Module not found")
    return res.data[0]


@router.delete("/modules/{module_id}", status_code=204)
def delete_module(module_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    res = client.table("curriculum_modules").delete().eq("id", module_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Module not found")
    log_audit(client, user, "delete", "module", module_id)


@router.post("/curricula/{curriculum_id}/modules/reorder", status_code=204)
def reorder_modules(
    curriculum_id: str, payload: ReorderRequest, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    _reorder(client, "curriculum_modules", payload.ids)


# --------------------------------------------------------------------------- #
# Lessons
# --------------------------------------------------------------------------- #
@router.post("/modules/{module_id}/lessons", response_model=LessonOut, status_code=201)
def create_lesson(
    module_id: str, payload: LessonCreate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    branch_id = _row_branch(client, "curriculum_modules", module_id)["branch_id"]
    data = payload.model_dump()
    data.update(module_id=module_id, branch_id=branch_id)
    row = client.table("lessons").insert(data).execute().data[0]
    log_audit(client, user, "create", "lesson", row["id"], {"title": row["title"]})
    return row


@router.patch("/lessons/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: str, payload: LessonUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    res = client.table("lessons").update(updates).eq("id", lesson_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
    return res.data[0]


@router.delete("/lessons/{lesson_id}", status_code=204)
def delete_lesson(lesson_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    res = client.table("lessons").delete().eq("id", lesson_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
    log_audit(client, user, "delete", "lesson", lesson_id)


@router.post("/modules/{module_id}/lessons/reorder", status_code=204)
def reorder_lessons(
    module_id: str, payload: ReorderRequest, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    _reorder(client, "lessons", payload.ids)


# --------------------------------------------------------------------------- #
# Lesson content blocks
# --------------------------------------------------------------------------- #
@router.post("/lessons/{lesson_id}/blocks", response_model=BlockOut, status_code=201)
def create_block(
    lesson_id: str, payload: BlockCreate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    branch_id = _row_branch(client, "lessons", lesson_id)["branch_id"]
    data = payload.model_dump()
    data.update(lesson_id=lesson_id, branch_id=branch_id)
    return client.table("lesson_blocks").insert(data).execute().data[0]


@router.patch("/blocks/{block_id}", response_model=BlockOut)
def update_block(
    block_id: str, payload: BlockUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    res = client.table("lesson_blocks").update(updates).eq("id", block_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Block not found")
    return res.data[0]


@router.delete("/blocks/{block_id}", status_code=204)
def delete_block(block_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    res = client.table("lesson_blocks").delete().eq("id", block_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Block not found")


@router.post("/lessons/{lesson_id}/blocks/reorder", status_code=204)
def reorder_blocks(
    lesson_id: str, payload: ReorderRequest, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    _reorder(client, "lesson_blocks", payload.ids)


# --------------------------------------------------------------------------- #
# Quizzes (module- or lesson-level)
# --------------------------------------------------------------------------- #
@router.post("/quizzes", response_model=QuizOut, status_code=201)
def create_quiz(payload: QuizCreate, user: CurrentUser = Depends(require_module(MODULE))):
    if bool(payload.module_id) == bool(payload.lesson_id):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Provide exactly one of module_id or lesson_id"
        )
    client = get_scoped_client(user.access_token)

    if payload.module_id:
        parent = _row_branch(client, "curriculum_modules", payload.module_id, "curriculum_id")
    else:
        # lesson -> module -> curriculum
        lesson = _row_branch(client, "lessons", payload.lesson_id, "module_id")
        module = _row_branch(client, "curriculum_modules", lesson["module_id"], "curriculum_id")
        parent = {"branch_id": lesson["branch_id"], "curriculum_id": module["curriculum_id"]}

    data = payload.model_dump()
    data.update(branch_id=parent["branch_id"], curriculum_id=parent["curriculum_id"])
    row = client.table("quizzes").insert(data).execute().data[0]
    log_audit(client, user, "create", "quiz", row["id"], {"title": row["title"]})
    return row


@router.patch("/quizzes/{quiz_id}", response_model=QuizOut)
def update_quiz(
    quiz_id: str, payload: QuizUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    res = client.table("quizzes").update(updates).eq("id", quiz_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz not found")
    return res.data[0]


@router.delete("/quizzes/{quiz_id}", status_code=204)
def delete_quiz(quiz_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    res = client.table("quizzes").delete().eq("id", quiz_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz not found")
    log_audit(client, user, "delete", "quiz", quiz_id)


# --------------------------------------------------------------------------- #
# Quiz questions
# --------------------------------------------------------------------------- #
@router.post("/quizzes/{quiz_id}/questions", response_model=QuestionOut, status_code=201)
def create_question(
    quiz_id: str, payload: QuestionCreate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    branch_id = _row_branch(client, "quizzes", quiz_id)["branch_id"]
    data = payload.model_dump()
    data.update(quiz_id=quiz_id, branch_id=branch_id)
    return client.table("quiz_questions").insert(data).execute().data[0]


@router.patch("/questions/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: str, payload: QuestionUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    res = client.table("quiz_questions").update(updates).eq("id", question_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return res.data[0]


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    res = client.table("quiz_questions").delete().eq("id", question_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")


@router.post("/quizzes/{quiz_id}/questions/reorder", status_code=204)
def reorder_questions(
    quiz_id: str, payload: ReorderRequest, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    _reorder(client, "quiz_questions", payload.ids)
