"""
ORION - Web Search Tool
Provides live internet search capabilities via DuckDuckGo without requiring an API key.
Features error resilience and formatted Markdown output.
"""
import logging
from typing import List, Dict, Optional

logger = logging.getLogger("orion.tools.web_search")


def search_web(query: str, max_results: int = 3) -> str:
    """
    Search the live web using DuckDuckGo.
    
    Args:
        query: Search keywords or question.
        max_results: Number of search results to return (default: 3).
        
    Returns:
        Formatted markdown string containing titles, snippets, and source links.
    """
    query = (query or "").strip()
    if not query:
        return "Search query cannot be empty."

    # Try DDGS (preferred modern package)
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        with DDGS(timeout=10) as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            
        if results:
            formatted_chunks = []
            for i, r in enumerate(results, 1):
                title = r.get("title", f"Result {i}").strip()
                body = r.get("body", "").strip()
                href = r.get("href", "").strip()
                formatted_chunks.append(f"**{title}**\n{body}\nSource: {href}")
            return "\n\n".join(formatted_chunks)
    except Exception as e:
        logger.warning("DuckDuckGo search error: %s. Attempting fallback...", e)

    # Secondary fallback using duckduckgo html search via requests
    try:
        import requests
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        resp = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers=headers,
            timeout=8
        )
        if resp.status_code == 200:
            import re
            # Extract simple snippets and links using regex from DuckDuckGo HTML
            snippets = re.findall(r'<a class="result__snippet[^"]*"[^>]*>(.*?)</a>', resp.text, re.DOTALL)
            titles = re.findall(r'<a class="result__url[^"]*"[^>]*>(.*?)</a>', resp.text, re.DOTALL)
            if snippets:
                clean_snippets = [re.sub(r'<[^>]+>', '', s).strip() for s in snippets[:max_results]]
                return "\n\n".join([f"**Search Result {i+1}**\n{snip}" for i, snip in enumerate(clean_snippets)])
    except Exception as fallback_err:
        logger.warning("Web search fallback also failed: %s", fallback_err)

    return f"No live search results found for query '{query}' (Network may be offline or search service throttled)."


if __name__ == "__main__":
    print("Testing live web search...")
    res = search_web("Latest Mars rover discoveries", max_results=2)
    print("\nSearch Output:\n", res)
