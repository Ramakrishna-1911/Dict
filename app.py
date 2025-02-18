from flask import Flask, jsonify, render_template
from flask_cors import CORS
import requests
import os
import logging
from difflib import get_close_matches

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for development

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_word_details(word):
    try:
        logger.info(f"Looking up word: {word}")
        response = requests.get(f'https://api.dictionaryapi.dev/api/v2/entries/en/{word}')
        
        if response.status_code == 200:
            data = response.json()
            meanings = {}

            for entry in data[0]['meanings']:
                pos = entry['partOfSpeech']
                definitions = [d['definition'] for d in entry['definitions']]
                meanings[pos] = definitions

            return {
                "word": word,
                "meanings": meanings,
                "phonetic": data[0].get('phonetic', ''),
                "original_word": word,
                "suggestions": []
            }
        
        # Better word list for suggestions
        word_list = ['happy', 'sad', 'joy', 'book', 'read', 'write', 'help', 'love', 'like', 'good',
                   'great', 'awesome', 'amazing', 'terrible', 'awful', 'bad', 'horrible', 'nice',
                   'kind', 'mean', 'angry', 'upset', 'mad', 'glad', 'excited', 'bored', 'interesting']
        close_matches = get_close_matches(word, word_list, n=3, cutoff=0.6)
        
        if close_matches:
            return {
                "error": "Word not found",
                "suggestions": close_matches,
                "message": f"Did you mean: {', '.join(close_matches)}?"
            }
        
        return {
            "error": "Word not found",
            "message": "Sorry, we couldn't find that word."
        }
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to dictionary API: {str(e)}")
        return {
            "error": "API error",
            "message": "Could not connect to dictionary service."
        }
    except Exception as e:
        logger.error(f"Error looking up word: {str(e)}")
        return {
            "error": "Server error",
            "message": "An error occurred while looking up the word."
        }

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/lookup/<word>')
def lookup_word(word):
    word = word.lower().strip()
    result = get_word_details(word)
    
    if "error" in result:
        return jsonify(result), 404 if result["error"] == "Word not found" else 500
        
    return jsonify(result)

@app.route('/health')
def health_check():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=False)  # Set debug=False for production