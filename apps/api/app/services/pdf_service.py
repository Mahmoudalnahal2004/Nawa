import io
import re
import pdfplumber
from app.schemas.question import QuestionCreate

async def parse_pdf_questions(file_bytes: bytes, category_id: int) -> list[QuestionCreate]:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"

    q_matches = list(re.finditer(r"(?:^|\n)\s*(?:Q(\d+)\.?\s+|(\d+)\.\s+)", text))
    if not q_matches:
      return []

    questions_data = {}
    ans_text = ""

    for i, match in enumerate(q_matches):
        q_num = int(match.group(1) or match.group(2))
        start_idx = match.end()
        end_idx = q_matches[i+1].start() if i + 1 < len(q_matches) else len(text)
        
        chunk = text[start_idx:end_idx]
        
        if i == len(q_matches) - 1:
            # Last question chunk. Look for the answer key start.
            ans_start_match = re.search(r"\b1[\.\)]?\s+[A-Ea-e]\b", chunk)
            if ans_start_match:
                ans_text = chunk[ans_start_match.start():]
                chunk = chunk[:ans_start_match.start()]
            else:
                ans_text = chunk

        # Parse options
        a_match = re.search(r"(?:\s|^)[Aa][\.\)]\s+", chunk)
        b_match = re.search(r"(?:\s|^)[Bb][\.\)]\s+", chunk)
        c_match = re.search(r"(?:\s|^)[Cc][\.\)]\s+", chunk)
        d_match = re.search(r"(?:\s|^)[Dd][\.\)]\s+", chunk)
        e_match = re.search(r"(?:\s|^)[Ee][\.\)]\s+", chunk)

        indices = []
        if a_match: indices.append(('A', a_match))
        if b_match: indices.append(('B', b_match))
        if c_match: indices.append(('C', c_match))
        if d_match: indices.append(('D', d_match))
        if e_match: indices.append(('E', e_match))

        if not indices:
            continue

        indices.sort(key=lambda x: x[1].start())
        
        q_text = chunk[:indices[0][1].start()].strip()
        
        opts = {}
        for j in range(len(indices)):
            opt_letter, match_obj = indices[j]
            start_pos = match_obj.end()
            end_pos = indices[j+1][1].start() if j+1 < len(indices) else len(chunk)
            opts[opt_letter] = chunk[start_pos:end_pos].strip()
            
        for letter in ['A', 'B', 'C', 'D', 'E']:
            if letter not in opts:
                opts[letter] = ""
                
        # Clean newlines
        q_text = " ".join(q_text.split())
        opts['A'] = " ".join(opts['A'].split())
        opts['B'] = " ".join(opts['B'].split())
        opts['C'] = " ".join(opts['C'].split())
        opts['D'] = " ".join(opts['D'].split())
        opts['E'] = " ".join(opts['E'].split())
        
        questions_data[q_num] = {
            "category_id": category_id,
            "question_text": q_text,
            "option_a": opts['A'],
            "option_b": opts['B'],
            "option_c": opts['C'],
            "option_d": opts['D'],
            "option_e": opts['E'],
            "correct_answer": "A", # default, will be overridden
            "explanation": ""
        }

    # Parse answers
    ans_text = re.sub(r',(?:\s*|""|\'\')?,', ',"A",', ans_text)
    ans_pattern = re.compile(r"\b(\d+)[\.\)]?\s*([A-Ea-e])\b\s*(.*?)(?=\b\d+[\.\)]?\s*[A-Ea-e]\b|\Z)", re.DOTALL)
    for match in ans_pattern.finditer(ans_text):
        q_num = int(match.group(1))
        ans_letter = match.group(2).upper()
        explanation = match.group(3).strip()
        explanation = " ".join(explanation.split())
        
        if q_num in questions_data:
            questions_data[q_num]["correct_answer"] = ans_letter
            questions_data[q_num]["explanation"] = explanation

    result = []
    for q_num in sorted(questions_data.keys()):
        result.append(QuestionCreate(**questions_data[q_num]))
        
    return result
