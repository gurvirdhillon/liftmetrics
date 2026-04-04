const quote = document.querySelector('#thequote')
const getButton = document.querySelector('#getButton')

let quotes = []

async function loadQuotes() {
  try {
    const response = await fetch('./quotes.json')
    quotes = await response.json()
    generateRandomQuote()
  } catch (err) {
    console.error('Failed to load quotes:', err)
  }
}

function generateRandomQuote() {
  if (!quotes.length || !quote) return

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
  quote.textContent = `"${randomQuote.quote}" — ${randomQuote.author}`
}

if (getButton) {
  getButton.addEventListener('click', generateRandomQuote)
}

window.addEventListener('load', loadQuotes)