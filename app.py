# app.py
from flask import Flask, jsonify, render_template
from flask_cors import CORS
import requests
from difflib import get_close_matches

app = Flask(__name__)
CORS(app)

def get_word_details(word):
    try:
        # Using Free Dictionary API
        response = requests.get(f'https://api.dictionaryapi.dev/api/v2/entries/en/{word}')
        
        if response.status_code == 200:
            data = response.json()
            
            # Format the response
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
        
        # If word not found, try to find similar words
        word_list = ['happy', 'sad', 'joy', 'book', 'read', 'write', 'help', 'love', 'like', 'good']  # Basic word list
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
            
    except Exception as e:
        print(f"Error looking up word: {str(e)}")
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
        return jsonify(result), 404
        
    return jsonify(result)

if __name__ == '__main__':
    print("Server starting...")
    print("Go to http://localhost:5000 in your web browser")
    app.run(debug=True)