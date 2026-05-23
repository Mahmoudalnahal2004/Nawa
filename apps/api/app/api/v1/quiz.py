from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.schemas.quiz import QuizStartRequest, QuizSessionResponse, AnswerRequest, AnswerFeedback, QuizResultSummary, BatchAnswerRequest, QuizAvailabilityRequest, QuizGenerateRequest, PauseSessionRequest
from app.services import quiz_service

router = APIRouter(prefix="/quiz", tags=["Quiz Engine"])
student_only = RoleChecker(["student"])


@router.post("/start", response_model=QuizSessionResponse, dependencies=[Depends(student_only)])
async def start_quiz(data: QuizStartRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    try:
        return await quiz_service.start_quiz(db, user.id, data.category_id, data.num_questions, data.mode)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/availability", response_model=dict[int, int], dependencies=[Depends(student_only)])
async def get_availability(data: QuizAvailabilityRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    return await quiz_service.get_quiz_availability(db, user.id, data.mode)


@router.post("/generate", response_model=QuizSessionResponse, dependencies=[Depends(student_only)])
async def generate_quiz(data: QuizGenerateRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    try:
        return await quiz_service.generate_custom_quiz(db, user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{session_id}", response_model=QuizSessionResponse, dependencies=[Depends(student_only)])
async def get_quiz(session_id: str, user: User = Depends(get_current_active_user)):
    session = quiz_service.get_quiz_session(session_id)
    if session is None or session["user_id"] != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found")
        
    questions = session["questions"]
    if session.get("status") == "completed":
        from app.schemas.quiz import QuizQuestion
        populated_questions = []
        for q in questions:
            key = session["answer_key"].get(q.id)
            if key:
                populated_questions.append(QuizQuestion(
                    **q.model_dump(exclude={'correct_answer', 'explanation'}),
                    correct_answer=key["correct_answer"],
                    explanation=key["explanation"]
                ))
            else:
                populated_questions.append(q)
        questions = populated_questions

    return QuizSessionResponse(
        session_id=session_id, 
        mode=session.get("mode", "practice"), 
        questions=questions, 
        total_questions=len(questions), 
        category_name=session["category_name"],
        status=session.get("status", "in_progress"),
        current_question_index=session.get("current_question_index", 0)
    )


@router.post("/{session_id}/answer", response_model=AnswerFeedback, dependencies=[Depends(student_only)])
async def submit_answer(session_id: str, data: AnswerRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    try:
        return await quiz_service.submit_answer(db, session_id, user.id, data.question_id, data.selected_answer)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{session_id}/pause", dependencies=[Depends(student_only)])
async def pause_quiz(session_id: str, data: PauseSessionRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    try:
        return await quiz_service.pause_quiz(session_id, user.id, data.current_question_index)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{session_id}/submit", dependencies=[Depends(student_only)])
async def submit_exam(session_id: str, user: User = Depends(get_current_active_user)):
    try:
        return await quiz_service.submit_exam(session_id, user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{session_id}/batch_answer", response_model=list[AnswerFeedback], dependencies=[Depends(student_only)])
async def submit_batch_answers(session_id: str, data: BatchAnswerRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    try:
        return await quiz_service.submit_batch_answers(db, session_id, user.id, data.answers)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{session_id}/results", response_model=QuizResultSummary, dependencies=[Depends(student_only)])
async def get_results(session_id: str, user: User = Depends(get_current_active_user)):
    try:
        return await quiz_service.get_quiz_results(session_id, user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
