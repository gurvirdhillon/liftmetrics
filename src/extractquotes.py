import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://quotes.toscrape.com"
START_URL = f"{BASE_URL}/page/1/"

ALLOWED_KEYWORDS = [
    "discipline", "success", "strength", "strong", "effort", "work",
    "hard work", "focus", "goal", "dream", "progress", "push",
    "perseverance", "resilience", "courage", "grind", "mindset",
    "impossible", "continue", "keep going", "failure", "believe",
    "achieve", "dedication", "determination"
]

BLOCKED_KEYWORDS = [
    "love", "lover", "romance", "romantic", "heart", "kiss",
    "relationship", "marriage", "husband", "wife", "boyfriend",
    "girlfriend", "friendship"
]

BLOCKED_TAGS = {
    "love", "romance", "friends", "friendship", "books", "reading", "humor"
}


def normalize_text(text):
    return " ".join(text.strip().lower().split())


def choose_category(quote_text, tags):
    text = normalize_text(quote_text)
    tag_set = {tag.lower() for tag in tags}

    if any(word in text for word in ["discipline", "habit", "routine", "consistency", "dedication", "determination"]):
        return "discipline"

    if any(word in text for word in ["strength", "strong", "power", "resilience"]):
        return "strength"

    if any(word in text for word in ["success", "achieve", "goal", "win", "failure"]):
        return "success"

    if any(word in text for word in ["continue", "keep going", "impossible", "perseverance", "courage"]):
        return "perseverance"

    if any(word in text for word in ["dream", "believe", "mindset", "focus"]):
        return "mindset"

    if any(word in text for word in ["work", "hard work", "effort", "grind", "push", "progress"]):
        return "hard-work"

    if "inspirational" in tag_set:
        return "motivation"

    return None


def is_relevant(quote_text, tags):
    text = normalize_text(quote_text)
    tag_set = {tag.lower() for tag in tags}

    if any(word in text for word in BLOCKED_KEYWORDS):
        return False

    if tag_set.intersection(BLOCKED_TAGS):
        return False

    if any(word in text for word in ALLOWED_KEYWORDS):
        return True

    if "inspirational" in tag_set:
        return True

    return False


def scrape_quotes():
    url = START_URL
    filtered_quotes = []
    seen_quotes = set()
    next_id = 1

    while url:
        print(f"Scraping: {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        quote_blocks = soup.select(".quote")

        for block in quote_blocks:
            text_el = block.select_one(".text")
            author_el = block.select_one(".author")
            tag_els = block.select(".tags .tag")

            if not text_el or not author_el:
                continue

            quote_text = text_el.get_text(strip=True).replace("“", "").replace("”", "")
            author = author_el.get_text(strip=True)
            tags = [tag.get_text(strip=True) for tag in tag_els]

            normalized_quote = normalize_text(quote_text)
            if normalized_quote in seen_quotes:
                continue

            if not is_relevant(quote_text, tags):
                continue

            category = choose_category(quote_text, tags)
            if not category:
                continue

            filtered_quotes.append({
                "id": next_id,
                "quote": quote_text,
                "category": category,
                "author": author
            })
            seen_quotes.add(normalized_quote)
            next_id += 1

        next_link = soup.select_one("li.next > a")
        url = urljoin(BASE_URL, next_link["href"]) if next_link else None

    return filtered_quotes


def save_quotes(quotes, filename="quotes.json"):
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(quotes, file, ensure_ascii=False, indent=2)
    print(f"Saved {len(quotes)} quotes to {filename}")


if __name__ == "__main__":
    try:
        quotes = scrape_quotes()
        save_quotes(quotes)
    except requests.RequestException as error:
        print(f"Request failed: {error}")
    except Exception as error:
        print(f"Something went wrong: {error}")
