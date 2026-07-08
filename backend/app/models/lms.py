"""Pydantic models for the LMS authoring API (admin/staff side)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

LessonBlockType = Literal["text", "video", "image"]
QuizQuestionType = Literal["single_choice", "multi_choice", "true_false", "short_answer"]


# --------------------------------------------------------------------------- #
# Modules
# --------------------------------------------------------------------------- #
class ModuleCreate(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    order_index: int = 0
    is_published: bool = False


class ModuleUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    order_index: int | None = None
    is_published: bool | None = None


class ModuleOut(BaseModel):
    id: str
    curriculum_id: str
    branch_id: str
    title: str
    description: str | None
    order_index: int
    is_published: bool
    created_at: datetime


# --------------------------------------------------------------------------- #
# Lessons
# --------------------------------------------------------------------------- #
class LessonCreate(BaseModel):
    title: str = Field(min_length=1)
    order_index: int = 0
    estimated_minutes: int | None = None
    is_published: bool = False


class LessonUpdate(BaseModel):
    title: str | None = None
    order_index: int | None = None
    estimated_minutes: int | None = None
    is_published: bool | None = None


class LessonOut(BaseModel):
    id: str
    module_id: str
    branch_id: str
    title: str
    order_index: int
    estimated_minutes: int | None
    is_published: bool
    created_at: datetime


# --------------------------------------------------------------------------- #
# Lesson content blocks
# --------------------------------------------------------------------------- #
class BlockCreate(BaseModel):
    type: LessonBlockType
    order_index: int = 0
    content: dict[str, Any] = Field(default_factory=dict)


class BlockUpdate(BaseModel):
    type: LessonBlockType | None = None
    order_index: int | None = None
    content: dict[str, Any] | None = None


class BlockOut(BaseModel):
    id: str
    lesson_id: str
    branch_id: str
    type: LessonBlockType
    order_index: int
    content: dict[str, Any]
    created_at: datetime


# --------------------------------------------------------------------------- #
# Quizzes + questions
# --------------------------------------------------------------------------- #
class QuizCreate(BaseModel):
    """Attach to exactly one of module_id / lesson_id."""

    module_id: str | None = None
    lesson_id: str | None = None
    title: str = "Quiz"
    pass_percentage: int = Field(default=70, ge=0, le=100)
    max_attempts: int | None = None


class QuizUpdate(BaseModel):
    title: str | None = None
    pass_percentage: int | None = Field(default=None, ge=0, le=100)
    max_attempts: int | None = None


class QuizOut(BaseModel):
    id: str
    curriculum_id: str
    branch_id: str
    module_id: str | None
    lesson_id: str | None
    title: str
    pass_percentage: int
    max_attempts: int | None
    created_at: datetime


class QuestionCreate(BaseModel):
    prompt: str = Field(min_length=1)
    type: QuizQuestionType
    order_index: int = 0
    options: list[dict[str, Any]] = Field(default_factory=list)
    correct: list[Any] = Field(default_factory=list)
    points: int = 1
    explanation: str | None = None


class QuestionUpdate(BaseModel):
    prompt: str | None = None
    type: QuizQuestionType | None = None
    order_index: int | None = None
    options: list[dict[str, Any]] | None = None
    correct: list[Any] | None = None
    points: int | None = None
    explanation: str | None = None


class QuestionOut(BaseModel):
    id: str
    quiz_id: str
    branch_id: str
    prompt: str
    type: QuizQuestionType
    order_index: int
    options: list[dict[str, Any]]
    correct: list[Any]
    points: int
    explanation: str | None
    created_at: datetime


# --------------------------------------------------------------------------- #
# Reorder helper + aggregate tree
# --------------------------------------------------------------------------- #
class ReorderRequest(BaseModel):
    ids: list[str]


class QuizWithQuestions(QuizOut):
    questions: list[QuestionOut] = []


class LessonTree(LessonOut):
    blocks: list[BlockOut] = []
    quiz: QuizWithQuestions | None = None


class ModuleTree(ModuleOut):
    lessons: list[LessonTree] = []
    quiz: QuizWithQuestions | None = None


class CurriculumContent(BaseModel):
    """Full authoring tree for one curriculum, in a single fetch."""

    curriculum_id: str
    modules: list[ModuleTree] = []
