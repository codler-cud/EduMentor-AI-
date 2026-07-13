"""
EduMentor AI – watsonx_client.py
Handles all IBM watsonx.ai API interactions using IBM Granite Foundation Models.
Provides secure authentication, prompt building, error handling, and response formatting.
"""

import os
import logging
from typing import Optional
from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

# Configure logging
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# AGENT INSTRUCTIONS
# Customise the AI assistant's persona and behaviour here.
# ──────────────────────────────────────────────────────────────────────────────
AGENT_INSTRUCTIONS = """
You are EduMentor AI, an experienced, friendly, and highly knowledgeable educational assistant
powered by IBM Granite Foundation Models. Your role is to act as a personal tutor helping
students understand concepts deeply and build lasting knowledge.

Core Behaviour Rules:
- Behave like a passionate, experienced teacher who genuinely cares about student success.
- Be warm, supportive, encouraging, and motivating at all times.
- Adjust the depth, complexity, and vocabulary of your explanations to match the specified difficulty level:
    * Beginner: Use simple language, relatable real-life examples, and avoid jargon.
    * Intermediate: Use proper terminology, introduce concepts progressively, and include examples.
    * Advanced: Use technical precision, deep analysis, and connect to broader concepts.
- Use bullet points, numbered lists, and clear headings to structure responses.
- Include simple real-life analogies and examples wherever appropriate.
- Keep all responses clear, well-structured, and concise.
- Focus exclusively on educational content.
- Politely decline any harmful, inappropriate, or off-topic requests.
- Encourage conceptual understanding and critical thinking over rote memorisation.
- Celebrate curiosity and frame mistakes as learning opportunities.
"""


def build_education_prompt(subject: str, topic: str, difficulty: str) -> str:
    """
    Constructs a detailed, structured educational prompt for IBM Granite.

    Args:
        subject:    The academic subject (e.g. "Mathematics").
        topic:      The specific topic (e.g. "Quadratic Equations").
        difficulty: One of "Beginner", "Intermediate", or "Advanced".

    Returns:
        A fully formatted prompt string ready to send to the model.
    """
    return f"""{AGENT_INSTRUCTIONS}

A student has requested personalised educational assistance. Please provide a comprehensive,
well-structured learning response for the following:

Subject:    {subject}
Topic:      {topic}
Difficulty: {difficulty}

Please structure your complete response EXACTLY as follows — use each heading exactly as written:

## 📚 Concept Explanation
Provide a clear, detailed explanation of "{topic}" under {subject} at the {difficulty} level.
Use simple language, real-life examples, and analogies. Break it into logical sub-sections.

## 📝 Revision Notes
List 6–8 concise, exam-ready revision bullet points covering the most important aspects of this topic.

## ⭐ Key Points
List 5 critical key points a student must remember about this topic.

## ❓ Quiz Questions
Generate exactly 5 multiple-choice questions (MCQs) with 4 options each (A, B, C, D).
Clearly mark the correct answer after each question like: ✅ Correct Answer: [option]

## 💡 Study Tips
Provide 4–5 personalised study tips tailored to the {difficulty} level for mastering this topic.

## ⚠️ Common Mistakes
List 4–5 common mistakes students make when learning this topic, and how to avoid them.

## 🔗 Related Topics
Suggest 5 related topics the student should explore next to deepen their understanding.

## 📌 Summary
Write a concise summary of "{topic}" in under 150 words. Make it memorable and motivating.

Remember: Adjust all content to the {difficulty} level. Be encouraging and supportive throughout.
"""


def get_watsonx_response(subject: str, topic: str, difficulty: str) -> dict:
    """
    Sends an educational prompt to IBM watsonx.ai and returns a parsed response.

    Args:
        subject:    Academic subject.
        topic:      Specific topic to explain.
        difficulty: Difficulty level (Beginner / Intermediate / Advanced).

    Returns:
        A dict with keys: 'success' (bool), 'content' (str), 'error' (str or None).
    """
    api_key    = os.getenv("IBM_API_KEY")
    project_id = os.getenv("IBM_PROJECT_ID")
    ibm_url    = os.getenv("IBM_URL", "https://us-south.ml.cloud.ibm.com")
    model_id = "ibm/granite-8b-code-instruct"

    # ── Validate configuration ───────────────────────────────────────────────
    if not api_key or not project_id:
        logger.error("IBM_API_KEY or IBM_PROJECT_ID is not configured.")
        return {
            "success": False,
            "content": "",
            "error": "IBM watsonx.ai credentials are not configured. "
                     "Please set IBM_API_KEY and IBM_PROJECT_ID in your .env file."
        }

    try:
        # ── Authenticate with IBM watsonx.ai ─────────────────────────────────
        credentials = Credentials(url=ibm_url, api_key=api_key)
        print("IBM_URL =", ibm_url)
        client = APIClient(credentials=credentials)

        # ── Configure generation parameters ──────────────────────────────────
        gen_params = {
    GenParams.DECODING_METHOD:   "sample",
    GenParams.MAX_NEW_TOKENS:    1800,
    GenParams.MIN_NEW_TOKENS:    200,
    GenParams.STOP_SEQUENCES:    [],
    GenParams.TEMPERATURE:       0.3,
    GenParams.TOP_P:             0.9,
    GenParams.TOP_K:             50,
    GenParams.REPETITION_PENALTY: 1.1,
}

        # ── Initialise model inference ────────────────────────────────────────
        model = Model(
    model_id=model_id,
    params=gen_params,
    credentials=credentials,
    project_id=project_id
)

        # ── Build and send prompt ─────────────────────────────────────────────
        prompt = build_education_prompt(subject, topic, difficulty)
        logger.info(f"Sending prompt to IBM Granite | Subject: {subject} | Topic: {topic} | Difficulty: {difficulty}")

        response = model.generate_text(prompt)

        print("\n================ RAW AI RESPONSE ================\n")
        print(response)
        print("\n=================================================\n")

        if response:
            logger.info("Successfully received response from IBM watsonx.ai.")
            return {
                "success": True,
                "content": response.strip(),
                "error": None
            }
        else:
            logger.warning("Received empty response from IBM watsonx.ai.")
            return {
                "success": False,
                "content": "",
                "error": "The model returned an empty response. Please try again."
            }

    except Exception as exc:
        logger.exception(f"IBM watsonx.ai API error: {exc}")
        return {
            "success": False,
            "content": "",
            "error": f"An error occurred while contacting IBM watsonx.ai: {str(exc)}"
        }


def parse_sections(raw_text: str) -> dict:
    """
    Parses the structured AI response into individual named sections.

    Args:
        raw_text: The raw markdown text returned by the model.

    Returns:
        A dict mapping section names to their content strings.
    """
    section_markers = {
        "explanation":  "## 📚 Concept Explanation",
        "notes":        "## 📝 Revision Notes",
        "key_points":   "## ⭐ Key Points",
        "quiz":         "## ❓ Quiz Questions",
        "study_tips":   "## 💡 Study Tips",
        "mistakes":     "## ⚠️ Common Mistakes",
        "related":      "## 🔗 Related Topics",
        "summary":      "## 📌 Summary",
    }

    sections: dict = {key: "" for key in section_markers}
    ordered_keys = list(section_markers.keys())
    ordered_headers = list(section_markers.values())

    for i, (key, header) in enumerate(section_markers.items()):
        if header not in raw_text:
            continue
        start = raw_text.index(header) + len(header)
        # Find the next section header to determine end boundary
        end = len(raw_text)
        for next_header in ordered_headers[i + 1:]:
            if next_header in raw_text:
                end = raw_text.index(next_header)
                break
        sections[key] = raw_text[start:end].strip()

    return sections
