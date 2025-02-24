document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-toggle-icon');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const micButton = document.getElementById('mic-button');
    const listeningIndicator = document.getElementById('listening-indicator');
    const resultSection = document.getElementById('result-section');
    const errorSection = document.getElementById('error-section');
    const wordOfDaySection = document.querySelector('.word-of-the-day');
    const speakResultButton = document.getElementById('speak-result-button');
    const copyButton = document.getElementById('copy-button');
    
    // Modal Elements
    const thesaurusModal = document.getElementById('thesaurus-modal');
    const gamesModal = document.getElementById('games-modal');
    const aboutModal = document.getElementById('about-modal');
    const thesaurusLink = document.getElementById('thesaurus-link');
    const gamesLink = document.getElementById('games-link');
    const aboutLink = document.getElementById('about-link');
    const closeButtons = document.querySelectorAll('.close');
    
    // Audio Elements
    const audioButton = document.getElementById('audio-button');
    const wotdAudioButton = document.getElementById('wotd-audio-button');
    let audioElement = new Audio();
    
    // Speech Recognition
    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            listeningIndicator.style.display = 'none';
            searchWord();
        };
        
        recognition.onerror = function(event) {
            listeningIndicator.style.display = 'none';
            showNotification('Error recognizing speech. Please try again.', 'error');
        };
        
        recognition.onend = function() {
            listeningIndicator.style.display = 'none';
        };
    } else {
        micButton.style.display = 'none';
    }
    
    // Speech Synthesis
    let synth = window.speechSynthesis;
    let isSpeaking = false;
    
    // Search History
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    
    // Theme Management
    function setTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-theme');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('darkTheme', 'true');
        } else {
            document.body.classList.remove('dark-theme');
            themeIcon.className = 'fas fa-moon';
            localStorage.setItem('darkTheme', 'false');
        }
    }
    
    // Initialize theme from localStorage
    if (localStorage.getItem('darkTheme') === 'true') {
        setTheme(true);
    }
    
    // Toggle theme
    themeToggle.addEventListener('click', function() {
        const isDarkTheme = document.body.classList.contains('dark-theme');
        setTheme(!isDarkTheme);
    });
    
    // Modal Management
    function openModal(modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal(modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    thesaurusLink.addEventListener('click', function(e) {
        e.preventDefault();
        openModal(thesaurusModal);
    });
    
    gamesLink.addEventListener('click', function(e) {
        e.preventDefault();
        openModal(gamesModal);
    });
    
    aboutLink.addEventListener('click', function(e) {
        e.preventDefault();
        openModal(aboutModal);
    });
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = button.closest('.modal');
            closeModal(modal);
        });
    });
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Notification System
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const notifications = document.getElementById('notifications');
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Word of the Day
    async function loadWordOfTheDay() {
        try {
            const response = await fetch('/random');
            if (!response.ok) throw new Error('Failed to fetch word of the day');
            
            const data = await response.json();
            
            document.getElementById('wotd-word').textContent = data.word;
            document.getElementById('wotd-phonetic').textContent = data.phonetic;
            
            let content = '';
            
            // Get first part of speech and its first definition
            if (data.meanings) {
                const firstPos = Object.keys(data.meanings)[0];
                const firstDef = data.meanings[firstPos][0].definition;
                
                content = `<span class="pos-title">${firstPos}</span>: ${firstDef}`;
                
                if (data.meanings[firstPos][0].example) {
                    content += `<p class="example">"${data.meanings[firstPos][0].example}"</p>`;
                }
            }
            
            document.getElementById('wotd-meaning').innerHTML = content;
            
            // Setup audio button
            if (data.audio) {
                wotdAudioButton.removeAttribute('disabled');
                wotdAudioButton.onclick = function() {
                    playAudio(data.audio);
                };
            } else {
                wotdAudioButton.setAttribute('disabled', 'true');
            }
            
        } catch (error) {
            console.error('Error loading word of the day:', error);
            document.getElementById('wotd-word').textContent = 'Serendipity';
            document.getElementById('wotd-phonetic').textContent = '/ˌsɛr.ənˈdɪp.ɪ.ti/';
            document.getElementById('wotd-meaning').innerHTML = `
                <span class="pos-title">noun</span>: The faculty or phenomenon of finding valuable or agreeable things not sought for.
                <p class="example">"The scientists made the discovery by serendipity."</p>
            `;
        }
    }
    
    // Load word data from API
    async function searchWord() {
        const word = searchInput.value.trim();
        
        if (!word) {
            showNotification('Please enter a word to search', 'info');
            return;
        }
        
        // Show loading state
        showLoading(true);
        
        try {
            const response = await fetch(`/search?word=${encodeURIComponent(word)}`);
            const data = await response.json();
            
            // Add to search history
            addToHistory(word);
            
            if (response.ok) {
                displayWordResult(data);
            } else {
                displayError(data);
            }
            
        } catch (error) {
            console.error('Error searching word:', error);
            showNotification('Failed to connect to dictionary service', 'error');
            showLoading(false);
        }
    }
    
    // Display word information
    function displayWordResult(data) {
        // Hide error section and show result section
        errorSection.style.display = 'none';
        resultSection.style.display = 'block';
        wordOfDaySection.style.display = 'none';
        
        // Set word and phonetic
        document.getElementById('result-word').textContent = data.word;
        document.getElementById('result-phonetic').textContent = data.phonetic || '';
        
        // Setup audio button
        if (data.audio) {
            audioButton.removeAttribute('disabled');
            audioButton.onclick = function() {
                playAudio(data.audio);
            };
        } else {
            audioButton.setAttribute('disabled', 'true');
        }
        
        // Display definitions by part of speech
        const resultContent = document.getElementById('result-content');
        resultContent.innerHTML = '';
        
        for (const [pos, definitions] of Object.entries(data.meanings)) {
            const posSection = document.createElement('div');
            posSection.className = 'pos-section';
            
            const posTitle = document.createElement('h3');
            posTitle.className = 'pos-title';
            posTitle.textContent = pos;
            posSection.appendChild(posTitle);
            
            definitions.forEach(def => {
                const defItem = document.createElement('div');
                defItem.className = 'definition-item';
                
                const definition = document.createElement('p');
                definition.className = 'definition';
                definition.textContent = def.definition;
                defItem.appendChild(definition);
                
                if (def.example) {
                    const example = document.createElement('p');
                    example.className = 'example';
                    example.textContent = `"${def.example}"`;
                    defItem.appendChild(example);
                }
                
                posSection.appendChild(defItem);
            });
            
            resultContent.appendChild(posSection);
        }
        
        // Display examples, synonyms, and antonyms
        const extraInfo = document.getElementById('extra-info');
        const examplesContainer = document.getElementById('examples-container');
        const synonymsContainer = document.getElementById('synonyms-container');
        const antonymsContainer = document.getElementById('antonyms-container');
        
        // Reset containers
        extraInfo.style.display = 'none';
        examplesContainer.style.display = 'none';
        synonymsContainer.style.display = 'none';
        antonymsContainer.style.display = 'none';
        
        // Examples
        const examplesList = document.getElementById('examples-list');
        examplesList.innerHTML = '';
        
        if (data.examples && data.examples.length > 0) {
            data.examples.forEach(example => {
                const li = document.createElement('li');
                li.textContent = example;
                examplesList.appendChild(li);
            });
            examplesContainer.style.display = 'block';
            extraInfo.style.display = 'block';
        }
        
        // Synonyms
        const synonymsList = document.getElementById('synonyms-list');
        synonymsList.innerHTML = '';
        
        if (data.synonyms && data.synonyms.length > 0) {
            data.synonyms.forEach(synonym => {
                const chip = document.createElement('div');
                chip.className = 'word-chip';
                chip.textContent = synonym;
                chip.addEventListener('click', function() {
                    searchInput.value = synonym;
                    searchWord();
                });
                synonymsList.appendChild(chip);
            });
            synonymsContainer.style.display = 'block';
            extraInfo.style.display = 'block';
        }
        
        // Antonyms
        const antonymsList = document.getElementById('antonyms-list');
        antonymsList.innerHTML = '';
        
        if (data.antonyms && data.antonyms.length > 0) {
            data.antonyms.forEach(antonym => {
                const chip = document.createElement('div');
                chip.className = 'word-chip';
                chip.textContent = antonym;
                chip.addEventListener('click', function() {
                    searchInput.value = antonym;
                    searchWord();
                });
                antonymsList.appendChild(chip);
            });
            antonymsContainer.style.display = 'block';
            extraInfo.style.display = 'block';
        }
        
        // Show floating action buttons
        speakResultButton.style.display = 'flex';
        copyButton.style.display = 'flex';
        
        // Hide loading
        showLoading(false);
    }
    
    // Display error message
    function displayError(data) {
        // Hide result section and show error section
        resultSection.style.display = 'none';
        errorSection.style.display = 'block';
        wordOfDaySection.style.display = 'none';
        
        // Set error message
        document.getElementById('error-title').textContent = 'Word Not Found';
        document.getElementById('error-message').textContent = data.message || 'Sorry, we couldnt find that word in our dictionary.';
        
        // Display suggestions if available
        const suggestionsContainer = document.getElementById('suggestions-container');
        const suggestionsList = document.getElementById('suggestions-list');
        suggestionsList.innerHTML = '';
        
        if (data.suggestions && data.suggestions.length > 0) {
            data.suggestions.forEach(suggestion => {
                const chip = document.createElement('div');
                chip.className = 'word-chip';
                chip.textContent = suggestion;
                chip.addEventListener('click', function() {
                    searchInput.value = suggestion;
                    searchWord();
                });
                suggestionsList.appendChild(chip);
            });
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
        
        // Hide floating action buttons
        speakResultButton.style.display = 'none';
        copyButton.style.display = 'none';
        
        // Hide loading
        showLoading(false);
    }
    
    // Show/hide loading spinner
    function showLoading(isLoading) {
        if (isLoading) {
            // Hide word of day and result sections
            wordOfDaySection.style.display = 'none';
            resultSection.style.display = 'none';
            errorSection.style.display = 'none';
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loading-indicator';
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.margin = '3rem 0';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            loadingDiv.appendChild(spinner);
            
            const loadingText = document.createElement('p');
            loadingText.style.marginTop = '1rem';
            loadingText.textContent = 'Searching...';
            loadingDiv.appendChild(loadingText);
            
            document.querySelector('main').appendChild(loadingDiv);
        } else {
            // Remove loading indicator if exists
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    }
    
    // Play audio
    function playAudio(audioUrl) {
        if (!audioUrl) return;
        
        audioElement.src = audioUrl;
        audioElement.play()
            .catch(error => {
                console.error('Error playing audio:', error);
                showNotification('Could not play pronunciation audio', 'error');
            });
    }
    
    // Speak text using speech synthesis
    function speakText(text) {
        if (isSpeaking) {
            synth.cancel();
            isSpeaking = false;
            return;
        }
        
        if (!text) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        
        utterance.onend = function() {
            isSpeaking = false;
            speakResultButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        };
        
        synth.speak(utterance);
        isSpeaking = true;
        speakResultButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
    
    // Copy word definition to clipboard
    function copyToClipboard() {
        const word = document.getElementById('result-word').textContent;
        const phonetic = document.getElementById('result-phonetic').textContent;
        const content = document.getElementById('result-content').innerText;
        
        const textToCopy = `${word} ${phonetic}\n\n${content}`;
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showNotification('Definition copied to clipboard', 'success');
            })
            .catch(() => {
                showNotification('Failed to copy to clipboard', 'error');
            });
    }
    
    // Add word to search history
    function addToHistory(word) {
        if (!word) return;
        
        word = word.toLowerCase();
        
        // Remove if already exists
        const index = searchHistory.indexOf(word);
        if (index !== -1) {
            searchHistory.splice(index, 1);
        }
        
        // Add to beginning of array
        searchHistory.unshift(word);
        
        // Limit history size
        if (searchHistory.length > 10) {
            searchHistory.pop();
        }
        
        // Save to localStorage
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        
        // Update history display
        updateHistoryDisplay();
    }
    
    // Display search history
    function updateHistoryDisplay() {
        const historySection = document.querySelector('.search-history');
        
        if (!historySection) {
            // Create history section if not exists
            const section = document.createElement('section');
            section.className = 'search-history';
            
            const heading = document.createElement('h3');
            heading.textContent = 'Recent Searches';
            section.appendChild(heading);
            
            const chips = document.createElement('div');
            chips.className = 'history-chips';
            section.appendChild(chips);
            
            document.querySelector('main').insertBefore(section, document.querySelector('.word-of-the-day'));
        }
        
        const historyChips = document.querySelector('.history-chips');
        if (historyChips) {
            historyChips.innerHTML = '';
            
            if (searchHistory.length > 0) {
                searchHistory.forEach(word => {
                    const chip = document.createElement('div');
                    chip.className = 'history-chip';
                    chip.textContent = word;
                    chip.addEventListener('click', function() {
                        searchInput.value = word;
                        searchWord();
                    });
                    historyChips.appendChild(chip);
                });
                
                document.querySelector('.search-history').style.display = 'block';
            } else {
                document.querySelector('.search-history').style.display = 'none';
            }
        }
    }
    
    // Event Listeners
    searchButton.addEventListener('click', searchWord);
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchWord();
        }
    });
    
    micButton.addEventListener('click', function() {
        if (recognition) {
            listeningIndicator.style.display = 'flex';
            recognition.start();
        }
    });
    
    speakResultButton.addEventListener('click', function() {
        const resultContent = document.getElementById('result-content');
        const word = document.getElementById('result-word').textContent;
        speakText(word + '. ' + resultContent.innerText);
    });
    
    copyButton.addEventListener('click', copyToClipboard);
    
    // Initialize the app
    function initApp() {
        // Load word of the day
        loadWordOfTheDay();
        
        // Display search history
        updateHistoryDisplay();
        
        // Focus on search input
        searchInput.focus();
    }
    
    // Start the app
    initApp();
});