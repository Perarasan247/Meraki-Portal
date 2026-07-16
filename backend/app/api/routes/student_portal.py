"""Student-facing portal API.

Every endpoint depends on `require_student`, which loads the student row and
rejects deactivated or expired accounts on each request. All reads use the
service client and are hard-scoped to the student's own branch + domain, so a
student can only ever reach content for their assigned internship domain.

Two rules that must never be broken here:
  1. Quiz `correct` answer keys and `explanation` are stripped before questions
     are sent to a student (RLS can gate rows but not columns).
  2. Quizzes are graded server-side from the stored answer keys — a client-
     submitted score is never trusted.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import CurrentStudent, require_student
from app.core.supabase_client import get_service_client

router = APIRouter(prefix="/student", tags=["student"])


# --------------------------------------------------------------------------- #
# Identity
# --------------------------------------------------------------------------- #
@router.get("/me")
def student_me(student: CurrentStudent = Depends(require_student)):
    client = get_service_client()
    domain = None
    if student.domain_id:
        rows = (
            client.table("domains").select("key,label").eq("id", student.domain_id).execute().data
        )
        domain = rows[0] if rows else None
    s = student.row
    return {
        "id": s["id"],
        "full_name": s["full_name"],
        "email": s["email"],
        "username": s.get("username"),
        "mobile": s.get("mobile"),
        "branch_id": s["branch_id"],
        "domain_id": s.get("domain_id"),
        "domain_key": domain["key"] if domain else None,
        "domain_label": domain["label"] if domain else None,
        "account_expiry": s.get("account_expiry"),
        "is_active": s.get("is_active", True),
    }


# --------------------------------------------------------------------------- #
# Course list (published curricula in the student's domain, with progress)
# --------------------------------------------------------------------------- #
@router.get("/courses")
def list_courses(student: CurrentStudent = Depends(require_student)):
    if not student.domain_id:
        return []
    client = get_service_client()

    curricula = (
        client.table("curricula")
        .select("*")
        .eq("branch_id", student.branch_id)
        .eq("domain_id", student.domain_id)
        .eq("status", "Published")
        .order("created_at", desc=True)
        .execute()
        .data
    )
    if not curricula:
        return []

    curriculum_ids = [c["id"] for c in curricula]
    modules = (
        client.table("curriculum_modules")
        .select("id,curriculum_id")
        .in_("curriculum_id", curriculum_ids)
        .eq("is_published", True)
        .execute()
        .data
    )
    module_to_curriculum = {m["id"]: m["curriculum_id"] for m in modules}
    module_ids = list(module_to_curriculum.keys())

    lessons = []
    if module_ids:
        lessons = (
            client.table("lessons")
            .select("id,module_id")
            .in_("module_id", module_ids)
            .eq("is_published", True)
            .execute()
            .data
        )
    lesson_to_curriculum = {
        ls["id"]: module_to_curriculum.get(ls["module_id"]) for ls in lessons
    }

    completed = (
        client.table("student_lesson_progress")
        .select("lesson_id")
        .eq("student_id", student.id)
        .execute()
        .data
    )
    completed_ids = {c["lesson_id"] for c in completed}

    total_by_curriculum: dict[str, int] = {}
    done_by_curriculum: dict[str, int] = {}
    for lesson_id, cid in lesson_to_curriculum.items():
        if cid is None:
            continue
        total_by_curriculum[cid] = total_by_curriculum.get(cid, 0) + 1
        if lesson_id in completed_ids:
            done_by_curriculum[cid] = done_by_curriculum.get(cid, 0) + 1

    out = []
    for c in curricula:
        total = total_by_curriculum.get(c["id"], 0)
        done = done_by_curriculum.get(c["id"], 0)
        out.append(
            {
                "id": c["id"],
                "title": c["title"],
                "program": c["program"],
                "total_lessons": total,
                "completed_lessons": done,
                "progress_pct": round((done / total) * 100) if total else 0,
            }
        )
    return out


def _load_domain_curriculum(client, curriculum_id: str, student: CurrentStudent) -> dict:
    """Fetch a curriculum and 404 unless it is published AND in the student's
    own branch + domain. This is the guard that stops a student from reaching
    another domain's content by guessing an id."""
    rows = client.table("curricula").select("*").eq("id", curriculum_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    c = rows[0]
    if (
        c["branch_id"] != student.branch_id
        or c.get("domain_id") != student.domain_id
        or c["status"] != "Published"
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    return c


def _public_question(q: dict) -> dict:
    """Question shape safe to expose to students — no answer key / explanation."""
    return {
        "id": q["id"],
        "quiz_id": q["quiz_id"],
        "prompt": q["prompt"],
        "type": q["type"],
        "order_index": q["order_index"],
        "options": q.get("options", []),
        "points": q.get("points", 1),
    }


# --------------------------------------------------------------------------- #
# Full course content (published only, answer keys stripped)
# --------------------------------------------------------------------------- #
@router.get("/courses/{curriculum_id}")
def get_course(curriculum_id: str, student: CurrentStudent = Depends(require_student)):
    client = get_service_client()
    curriculum = _load_domain_curriculum(client, curriculum_id, student)

    modules = (
        client.table("curriculum_modules")
        .select("*")
        .eq("curriculum_id", curriculum_id)
        .eq("is_published", True)
        .order("order_index")
        .execute()
        .data
    )
    module_ids = [m["id"] for m in modules]

    lessons = []
    if module_ids:
        lessons = (
            client.table("lessons")
            .select("*")
            .in_("module_id", module_ids)
            .eq("is_published", True)
            .order("order_index")
            .execute()
            .data
        )
    lesson_ids = [ls["id"] for ls in lessons]

    blocks = []
    if lesson_ids:
        blocks = (
            client.table("lesson_blocks")
            .select("*")
            .in_("lesson_id", lesson_ids)
            .order("order_index")
            .execute()
            .data
        )

    quizzes = (
        client.table("quizzes").select("*").eq("curriculum_id", curriculum_id).execute().data
    )
    quiz_ids = [q["id"] for q in quizzes]
    questions = []
    if quiz_ids:
        questions = (
            client.table("quiz_questions")
            .select("*")
            .in_("quiz_id", quiz_ids)
            .order("order_index")
            .execute()
            .data
        )

    # Student progress within this course.
    completed = (
        client.table("student_lesson_progress")
        .select("lesson_id")
        .eq("student_id", student.id)
        .in_("lesson_id", lesson_ids or ["00000000-0000-0000-0000-000000000000"])
        .execute()
        .data
    )
    completed_ids = {c["lesson_id"] for c in completed}

    attempts = []
    if quiz_ids:
        attempts = (
            client.table("student_quiz_attempts")
            .select("quiz_id,attempt_no,score,passed,submitted_at")
            .eq("student_id", student.id)
            .in_("quiz_id", quiz_ids)
            .execute()
            .data
        )
    best_attempt: dict[str, dict] = {}
    attempts_count: dict[str, int] = {}
    for a in attempts:
        attempts_count[a["quiz_id"]] = attempts_count.get(a["quiz_id"], 0) + 1
        cur = best_attempt.get(a["quiz_id"])
        if cur is None or a["score"] > cur["score"]:
            best_attempt[a["quiz_id"]] = a

    # Assemble quiz nodes (questions stripped of answer keys).
    q_by_id = {q["id"]: {**q, "questions": []} for q in quizzes}
    for qn in questions:
        if qn["quiz_id"] in q_by_id:
            q_by_id[qn["quiz_id"]]["questions"].append(_public_question(qn))

    def quiz_node(qid: str | None):
        if not qid or qid not in q_by_id:
            return None
        q = q_by_id[qid]
        return {
            "id": q["id"],
            "title": q["title"],
            "pass_percentage": q["pass_percentage"],
            "max_attempts": q.get("max_attempts"),
            "questions": q["questions"],
            "attempts_used": attempts_count.get(q["id"], 0),
            "best_score": best_attempt.get(q["id"], {}).get("score"),
            "passed": best_attempt.get(q["id"], {}).get("passed", False),
        }

    quiz_by_module = {q["module_id"]: q["id"] for q in quizzes if q.get("module_id")}
    quiz_by_lesson = {q["lesson_id"]: q["id"] for q in quizzes if q.get("lesson_id")}

    blocks_by_lesson: dict[str, list] = {}
    for b in blocks:
        blocks_by_lesson.setdefault(b["lesson_id"], []).append(b)

    lessons_by_module: dict[str, list] = {}
    for ls in lessons:
        lessons_by_module.setdefault(ls["module_id"], []).append(
            {
                "id": ls["id"],
                "title": ls["title"],
                "order_index": ls["order_index"],
                "estimated_minutes": ls.get("estimated_minutes"),
                "blocks": blocks_by_lesson.get(ls["id"], []),
                "quiz": quiz_node(quiz_by_lesson.get(ls["id"])),
                "completed": ls["id"] in completed_ids,
            }
        )

    module_tree = [
        {
            "id": m["id"],
            "title": m["title"],
            "description": m.get("description"),
            "order_index": m["order_index"],
            "lessons": lessons_by_module.get(m["id"], []),
            "quiz": quiz_node(quiz_by_module.get(m["id"])),
        }
        for m in modules
    ]

    return {
        "id": curriculum["id"],
        "title": curriculum["title"],
        "program": curriculum["program"],
        "modules": module_tree,
    }


# --------------------------------------------------------------------------- #
# Mark lesson complete
# --------------------------------------------------------------------------- #
@router.post("/lessons/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def complete_lesson(lesson_id: str, student: CurrentStudent = Depends(require_student)):
    client = get_service_client()
    # Confirm the lesson is in the student's domain before recording progress.
    lesson = (
        client.table("lessons").select("id,module_id,is_published").eq("id", lesson_id).execute().data
    )
    if not lesson or not lesson[0]["is_published"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
    module = (
        client.table("curriculum_modules")
        .select("curriculum_id")
        .eq("id", lesson[0]["module_id"])
        .execute()
        .data
    )
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
    _load_domain_curriculum(client, module[0]["curriculum_id"], student)  # guard

    client.table("student_lesson_progress").upsert(
        {"student_id": student.id, "lesson_id": lesson_id},
        on_conflict="student_id,lesson_id",
    ).execute()
    return {"lesson_id": lesson_id, "completed": True}


# --------------------------------------------------------------------------- #
# Submit a quiz — graded server-side
# --------------------------------------------------------------------------- #
class QuizSubmission(BaseModel):
    # question_id -> answer. choice: list[str] of option ids; true_false: bool;
    # short_answer: str.
    answers: dict[str, object]


def _grade_question(q: dict, given) -> bool:
    qtype = q["type"]
    correct = q.get("correct") or []
    if qtype in ("single_choice", "multi_choice"):
        given_set = set(given if isinstance(given, list) else [given] if given else [])
        return given_set == set(correct)
    if qtype == "true_false":
        if not correct:
            return False
        given_bool = given if isinstance(given, bool) else str(given).lower() in ("true", "1", "yes")
        return given_bool == bool(correct[0])
    if qtype == "short_answer":
        given_norm = str(given or "").strip().lower()
        return given_norm != "" and given_norm in [str(c).strip().lower() for c in correct]
    return False


@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(
    quiz_id: str, submission: QuizSubmission, student: CurrentStudent = Depends(require_student)
):
    client = get_service_client()

    quiz = client.table("quizzes").select("*").eq("id", quiz_id).execute().data
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz not found")
    quiz = quiz[0]
    _load_domain_curriculum(client, quiz["curriculum_id"], student)  # domain guard

    # Enforce attempt cap.
    prior = (
        client.table("student_quiz_attempts")
        .select("id")
        .eq("student_id", student.id)
        .eq("quiz_id", quiz_id)
        .execute()
        .data
    )
    max_attempts = quiz.get("max_attempts")
    if max_attempts is not None and len(prior) >= max_attempts:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, f"No attempts remaining (max {max_attempts})"
        )

    questions = (
        client.table("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz_id)
        .order("order_index")
        .execute()
        .data
    )
    if not questions:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Quiz has no questions")

    total_points = sum(q.get("points", 1) for q in questions)
    earned = 0
    results = []
    for q in questions:
        given = submission.answers.get(q["id"])
        is_correct = _grade_question(q, given)
        if is_correct:
            earned += q.get("points", 1)
        results.append(
            {
                "question_id": q["id"],
                "correct": is_correct,
                "correct_answer": q.get("correct"),
                "explanation": q.get("explanation"),
            }
        )

    score = round((earned / total_points) * 100, 2) if total_points else 0
    passed = score >= quiz["pass_percentage"]
    attempt_no = len(prior) + 1

    client.table("student_quiz_attempts").insert(
        {
            "student_id": student.id,
            "quiz_id": quiz_id,
            "attempt_no": attempt_no,
            "score": score,
            "passed": passed,
            "answers": submission.answers,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()

    return {
        "score": score,
        "passed": passed,
        "attempt_no": attempt_no,
        "pass_percentage": quiz["pass_percentage"],
        "max_attempts": max_attempts,
        "attempts_used": attempt_no,
        "results": results,
    }
