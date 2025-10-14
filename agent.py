import ollama
import json

async def get_ai_response(query: str, context_data: dict) -> str:
    """
    Calls the Ollama model with a specific system prompt and user query, including a few-shot example.
    """
    # Convert the context data dictionary to a JSON string
    context_str = json.dumps(context_data, indent=2)

    # A lean system prompt focusing on the persona and formatting.
    system_prompt = """You are "CityScape," a friendly and helpful AI concierge for hotel guests in Tallinn. Your tone must be warm and helpful. You MUST follow the structure and Markdown formatting (bolding with **, bullet points with -, and links with [text](URL)) shown in the user's example EXACTLY to make your answers clear and easy to read."""

    # A more detailed few-shot example to guide the model's behavior with better formatting.
    few_shot_example = """
    HERE ARE EXAMPLES OF HOW TO ANSWER. FOLLOW THESE STRUCTURES AND FORMATTING EXACTLY:

    ---
    EXAMPLE 1: TOUR INFO
    ---
    EXAMPLE DATA:
    { "partner_experiences": [ { "company": "Example Tour Co.", "experience_name": "Old Town Ghost Tour", "price_eur": 30, "contact": { "phone": "+372 555 98765", "website": "https://exampleghosts.ee" } } ] }
    ---
    EXAMPLE USER'S QUESTION:
    Tell me about a ghost tour.
    ---
    EXAMPLE CORRECT RESPONSE:
    Of course! I'd recommend the **Old Town Ghost Tour** by **Example Tour Co.** for a spooky evening.

    Here are the details:
    - **Price:** €30 per person

    **How to book:**
    - **Phone:** +372 555 98765
    - **Website:** [Visit their website](https://exampleghosts.ee)

    ---
    EXAMPLE 2: DIRECTIONS
    ---
    EXAMPLE DATA:
    { "directions": { "summary": "Route from Mustamäe to Town Hall Square", "planner_link": "https://transport.tallinn.ee/#plan/Mustam%C3%A4e/Town%20Hall%20Square?lang=en" } }
    ---
    EXAMPLE USER'S QUESTION:
    How do I get to the tour from Mustamäe?
    ---
    EXAMPLE CORRECT RESPONSE:
    Certainly! The best way to get real-time public transport options is to use the official **Tallinn Transport journey planner**.

    I've created a direct link for your route from **Mustamäe** to the **Town Hall Square**:
    - [View Live Route on Tallinn Transport](https://transport.tallinn.ee/#plan/Mustam%C3%A4e/Town%20Hall%20Square?lang=en)
    """

    # Construct a new user message that includes the example, the context data, and the original query.
    user_message_with_context = f"""
    {few_shot_example}

    NOW, FOLLOW THE EXAMPLES ABOVE TO ANSWER THE REAL QUESTION.

    **CRITICAL INSTRUCTION: Use ONLY the following real data. Do not use any other information.**

    ---
    REAL AVAILABLE DATA:
    {context_str}
    ---

    REAL USER'S QUESTION:
    {query}
    """

    try:
        response = await ollama.AsyncClient().chat(
            model='gpt-oss:120b-cloud',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_message_with_context},
            ],
        )
        # The frontend will handle converting markdown to HTML
        return response['message']['content']
    except Exception as e:
        print(f"Error connecting to Ollama: {e}")
        return "I'm sorry, I'm having trouble connecting to my knowledge base at the moment. Please ensure the Ollama service is running."


