from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import requests
import os
import logging
from difflib import get_close_matches
import json
import random

app = Flask(__name__, static_folder='static')
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cache for API responses to reduce API calls
word_cache = {}

def get_word_details(word):
    """Get word details from the dictionary API with enhanced error handling and caching"""
    # Check cache first
    if word in word_cache:
        logger.info(f"Retrieved '{word}' from cache")
        return word_cache[word]
    
    try:
        logger.info(f"Looking up word: {word}")
        response = requests.get(f'https://api.dictionaryapi.dev/api/v2/entries/en/{word}', 
                                timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract audio URL if available
            audio_url = None
            if 'phonetics' in data[0] and data[0]['phonetics']:
                for phonetic in data[0]['phonetics']:
                    if 'audio' in phonetic and phonetic['audio']:
                        audio_url = phonetic['audio']
                        break
            
            # Process meanings with more detailed information
            meanings = {}
            examples = []
            synonyms = []
            antonyms = []

            for entry in data[0]['meanings']:
                pos = entry['partOfSpeech']
                definitions = []
                
                for d in entry['definitions']:
                    def_info = {
                        'definition': d['definition'],
                        'example': d.get('example', '')
                    }
                    definitions.append(def_info)
                    
                    if 'example' in d and d['example']:
                        examples.append(d['example'])
                
                meanings[pos] = definitions
                
                # Collect synonyms and antonyms
                if 'synonyms' in entry and entry['synonyms']:
                    synonyms.extend(entry['synonyms'][:5])  # Limit to 5 per part of speech
                if 'antonyms' in entry and entry['antonyms']:
                    antonyms.extend(entry['antonyms'][:5])  # Limit to 5 per part of speech
            
            result = {
                "word": data[0]['word'],
                "meanings": meanings,
                "phonetic": data[0].get('phonetic', ''),
                "audio": audio_url,
                "examples": examples[:3],  # Limit to 3 examples
                "synonyms": list(set(synonyms))[:10],  # Remove duplicates and limit to 10
                "antonyms": list(set(antonyms))[:10],  # Remove duplicates and limit to 10
                "original_word": word,
                "suggestions": []
            }
            
            # Store in cache
            word_cache[word] = result
            return result
        
        elif response.status_code == 404:
            # Load more comprehensive word list for better suggestions
            try:
                with open('static/data/common_words.json', 'r') as f:
                    word_list = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                # Fallback word list if file is not available
                word_list = ['happy', 'sad', 'joy', 'book', 'read', 'write', 'help', 'love', 'like', 'good',
                           'great', 'awesome', 'amazing', 'terrible', 'awful', 'bad', 'horrible', 'nice',
                           'kind', 'mean', 'angry', 'upset', 'mad', 'glad', 'excited', 'bored', 'interesting',
                           'language', 'dictionary', 'vocabulary', 'learning', 'knowledge', 'wisdom', 'education',
                           'school', 'university', 'college', 'student', 'teacher', 'professor', 'lecture']
            
            close_matches = get_close_matches(word, word_list, n=5, cutoff=0.6)
            
            if close_matches:
                return {
                    "error": "Word not found",
                    "suggestions": close_matches,
                    "message": f"Did you mean: {', '.join(close_matches)}?"
                }
            
            return {
                "error": "Word not found",
                "message": "Sorry, we couldn't find that word in our dictionary."
            }
        
        else:
            logger.warning(f"API returned unexpected status code: {response.status_code}")
            return {
                "error": "API error",
                "message": f"Dictionary service responded with status code: {response.status_code}"
            }
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to dictionary API: {str(e)}")
        return {
            "error": "API error",
            "message": "Could not connect to dictionary service. Please check your internet connection."
        }
    except Exception as e:
        logger.error(f"Error looking up word: {str(e)}")
        return {
            "error": "Server error",
            "message": "An error occurred while looking up the word."
        }

def get_word_of_the_day():
    """Get a random interesting word of the day"""
    interesting_words = [
        "serendipity", "ephemeral", "luminous", "mellifluous", "eloquent", 
        "resplendent", "ethereal", "effervescent", "quintessential", "perennial",
        "surreptitious", "pernicious", "ubiquitous", "voracious", "tenacious"
    ]
    word = random.choice(interesting_words)
    return get_word_details(word)

@app.route('/')
def home():
    """Render the main page"""
    return render_template('index.html')
@app.route('/hangman')
def hangmangame():
    return render_template('hangmangame.html')
@app.route('/puzzle')
def puzzlegame():
    return render_template('puzzlegame.html')
@app.route('/scrabble')
def scrabblegame():
    return render_template('scrabblegame.html')
@app.route('/wordgame')
def wordgame():
    return render_template('wordgame.html')
@app.route('/anagram')
def anagramgame():
    return render_template('anagramgame.html')
@app.route('/lookup/<word>')
def lookup_word(word):
    """API endpoint to look up a word"""
    word = word.lower().strip()
    result = get_word_details(word)
    
    if "error" in result:
        return jsonify(result), 404 if result["error"] == "Word not found" else 500
        
    return jsonify(result)

@app.route('/random')
def random_word():
    """API endpoint to get a random word"""
    return jsonify(get_word_of_the_day())

@app.route('/search')
def search_word():
    """API endpoint to search a word (supports query parameter)"""
    word = request.args.get('word', '').lower().strip()
    if not word:
        return jsonify({"error": "No word provided"}), 400
    
    result = get_word_details(word)
    
    if "error" in result:
        return jsonify(result), 404 if result["error"] == "Word not found" else 500
        
    return jsonify(result)

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "version": "1.2.0"})

# Create directory for static files if it doesn't exist
os.makedirs('static/data', exist_ok=True)

# Create a sample word list file if it doesn't exist
if not os.path.exists('static/data/common_words.json'):
    common_words = [
        "happy", "sad", "joy", "book", "read", "write", "help", "love", "like", "good",
        "great", "awesome", "amazing", "terrible", "awful", "bad", "horrible", "nice",
        "kind", "mean", "angry", "upset", "mad", "glad", "excited", "bored", "interesting",
        "language", "dictionary", "vocabulary", "learning", "knowledge", "wisdom", "education",
        "school", "university", "college", "student", "teacher", "professor", "lecture"
    ]
    with open('static/data/common_words.json', 'w') as f:
        json.dump(common_words, f)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    debug_mode = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)