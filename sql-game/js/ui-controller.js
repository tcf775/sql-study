export class UIController {
    constructor(gameEngine, autoComplete) {
        this.gameEngine = gameEngine;
        this.autoComplete = autoComplete;
        this.currentHintLevel = 0;
        this.initializeElements();
        this.bindEvents();
        // ゲームオーバーレイを初期状態で非表示
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.classList.add('hidden');
        }
    }

    initializeElements() {
        this.elements = {
            challengeTitle: document.getElementById('challenge-title'),
            challengeDescription: document.getElementById('challenge-description'),
            difficultyStars: document.getElementById('difficulty-stars'),
            sqlEditor: document.getElementById('sql-editor'),
            runButton: document.getElementById('run-query'),
            hintButton: document.getElementById('show-hint'),
            solutionButton: document.getElementById('show-solution'),
            resultsContainer: document.getElementById('query-results'),
            executionStatus: document.getElementById('execution-status'),
            hintPanel: document.getElementById('hint-panel'),
            hintContent: document.getElementById('hint-content'),
            closeHint: document.getElementById('close-hint'),
            prevButton: document.getElementById('prev-challenge'),
            nextButton: document.getElementById('next-challenge'),
            currentScore: document.getElementById('current-score'),
            currentStage: document.getElementById('current-stage'),
            progressFill: document.getElementById('progress-fill'),
            loadingScreen: document.getElementById('loading-screen'),
            suggestionsDropdown: document.getElementById('suggestions-dropdown'),
            gameOverlay: document.getElementById('game-overlay'),
            suspenseText: document.getElementById('suspense-text'),
            resultAnimation: document.getElementById('result-animation'),
            resultText: document.getElementById('result-text'),
            resultIcon: document.getElementById('result-icon')
        };
    }

    bindEvents() {
        this.elements.runButton.addEventListener('click', () => this.executeQuery());
        this.elements.hintButton.addEventListener('click', () => this.showHint());
        this.elements.solutionButton.addEventListener('click', () => this.showSolution());
        this.elements.closeHint.addEventListener('click', () => this.hideHint());
        this.elements.prevButton.addEventListener('click', () => this.previousChallenge());
        this.elements.nextButton.addEventListener('click', () => this.nextChallenge());
        
        this.elements.sqlEditor.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.executeQuery();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                this.handleSuggestionNavigation(e);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                this.handleSuggestionSelect(e);
            } else if (e.key === 'Escape') {
                this.hideSuggestions();
            }
        });
        
        this.elements.sqlEditor.addEventListener('input', () => {
            this.showSuggestions();
        });
        
        this.elements.sqlEditor.addEventListener('blur', () => {
            setTimeout(() => this.hideSuggestions(), 150);
        });
    }

    updateChallenge() {
        const challenge = this.gameEngine.getCurrentChallenge();
        const progress = this.gameEngine.getProgress();
        
        this.elements.challengeTitle.textContent = challenge.title;
        this.elements.challengeDescription.textContent = challenge.description;
        this.elements.currentStage.textContent = progress.current;
        this.elements.progressFill.style.width = `${progress.percentage}%`;
        
        // 難易度表示
        this.elements.difficultyStars.innerHTML = '★'.repeat(challenge.difficulty) + 
                                                  '☆'.repeat(5 - challenge.difficulty);
        
        // ボタン状態更新
        this.elements.prevButton.disabled = progress.current === 1;
        this.elements.nextButton.disabled = progress.current === progress.total;
        
        // ヒントレベルリセット
        this.currentHintLevel = 0;
        this.hideHint();
        
        // エディタクリア
        this.elements.sqlEditor.value = '';
        this.clearResults();
    }

    async executeQuery() {
        const sql = this.elements.sqlEditor.value.trim();
        if (!sql) {
            this.showError('SQLクエリを入力してください');
            return;
        }

        this.elements.runButton.disabled = true;
        this.elements.executionStatus.textContent = '実行中...';
        
        try {
            if (!window.dbManager) {
                throw new Error('データベースが初期化されていません');
            }
            
            const result = await window.dbManager.executeQuery(sql);
            const answer = this.gameEngine.checkAnswer(result);
            
            if (answer.correct) {
                this.showSuccess(answer.message);
                this.displayResults(result);
                this.updateScore();
                
                // 次の問題へのボタンを有効化
                if (this.gameEngine.currentChallengeIndex < this.gameEngine.challenges.length - 1) {
                    this.elements.nextButton.disabled = false;
                }
            } else {
                this.showError(answer.message);
                if (result.success) {
                    this.displayResults(result);
                }
            }
        } catch (error) {
            this.showError(`実行エラー: ${error.message}`);
        } finally {
            this.elements.runButton.disabled = false;
        }
    }

    displayResults(result) {
        if (!result.success || !result.data.length) {
            this.elements.resultsContainer.innerHTML = '<p class="no-results">結果がありません</p>';
            return;
        }

        const table = document.createElement('table');
        
        // ヘッダー
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        result.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // データ行
        const tbody = document.createElement('tbody');
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            result.columns.forEach(col => {
                const td = document.createElement('td');
                td.textContent = row[col] || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        this.elements.resultsContainer.innerHTML = '';
        this.elements.resultsContainer.appendChild(table);
    }

    showHint() {
        const hint = this.gameEngine.getHint(this.currentHintLevel);
        if (hint) {
            this.elements.hintContent.textContent = hint;
            this.elements.hintPanel.classList.remove('hidden');
            this.currentHintLevel++;
        }
    }

    showSolution() {
        const challenge = this.gameEngine.getCurrentChallenge();
        this.elements.sqlEditor.value = challenge.solution;
    }

    hideHint() {
        this.elements.hintPanel.classList.add('hidden');
    }

    nextChallenge() {
        if (this.gameEngine.nextChallenge()) {
            this.updateChallenge();
        }
    }

    previousChallenge() {
        if (this.gameEngine.previousChallenge()) {
            this.updateChallenge();
        }
    }

    updateScore() {
        this.elements.currentScore.textContent = this.gameEngine.score;
    }

    showSuccess(message) {
        this.elements.executionStatus.textContent = message;
        this.elements.executionStatus.className = 'status-indicator status-success';
    }

    showError(message) {
        this.elements.executionStatus.textContent = message;
        this.elements.executionStatus.className = 'status-indicator status-error';
    }

    clearResults() {
        this.elements.resultsContainer.innerHTML = '<p class="no-results">クエリを実行すると結果がここに表示されます</p>';
        this.elements.executionStatus.textContent = '';
        this.elements.executionStatus.className = 'status-indicator';
    }

    hideLoading() {
        this.elements.loadingScreen.style.display = 'none';
    }

    showLoading() {
        this.elements.loadingScreen.style.display = 'flex';
    }
    
    showSuggestions() {
        const editor = this.elements.sqlEditor;
        const cursorPos = editor.selectionStart;
        const text = editor.value;
        
        const suggestions = this.autoComplete.getSuggestions(text, cursorPos);
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        this.autoComplete.currentSuggestions = suggestions;
        this.autoComplete.selectedIndex = -1;
        
        const dropdown = this.elements.suggestionsDropdown;
        dropdown.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const item = this.autoComplete.createSuggestionElement(suggestion);
            item.addEventListener('click', () => {
                this.insertSuggestion(suggestion.text);
                this.hideSuggestions();
            });
            dropdown.appendChild(item);
        });
        
        dropdown.classList.remove('hidden');
    }
    
    hideSuggestions() {
        this.elements.suggestionsDropdown.classList.add('hidden');
        this.autoComplete.currentSuggestions = [];
        this.autoComplete.selectedIndex = -1;
    }
    
    handleSuggestionNavigation(e) {
        if (this.autoComplete.currentSuggestions.length === 0) return;
        
        e.preventDefault();
        
        if (e.key === 'ArrowDown') {
            this.autoComplete.selectedIndex = Math.min(
                this.autoComplete.selectedIndex + 1,
                this.autoComplete.currentSuggestions.length - 1
            );
        } else if (e.key === 'ArrowUp') {
            this.autoComplete.selectedIndex = Math.max(
                this.autoComplete.selectedIndex - 1,
                -1
            );
        }
        
        this.updateSuggestionSelection();
    }
    
    handleSuggestionSelect(e) {
        if (this.autoComplete.currentSuggestions.length === 0 || this.autoComplete.selectedIndex === -1) {
            return;
        }
        
        e.preventDefault();
        const suggestion = this.autoComplete.currentSuggestions[this.autoComplete.selectedIndex];
        this.insertSuggestion(suggestion.text);
        this.hideSuggestions();
    }
    
    updateSuggestionSelection() {
        const items = this.elements.suggestionsDropdown.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.autoComplete.selectedIndex);
        });
    }
    
    insertSuggestion(text) {
        const editor = this.elements.sqlEditor;
        const cursorPos = editor.selectionStart;
        const beforeCursor = editor.value.substring(0, cursorPos);
        const afterCursor = editor.value.substring(cursorPos);
        
        const words = beforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];
        const beforeCurrentWord = beforeCursor.substring(0, beforeCursor.length - currentWord.length);
        
        editor.value = beforeCurrentWord + text + ' ' + afterCursor;
        editor.focus();
        editor.setSelectionRange(beforeCurrentWord.length + text.length + 1, beforeCurrentWord.length + text.length + 1);
    }
    
    async startGameAnimation() {
        this.elements.gameOverlay.classList.remove('hidden');
        this.elements.suspenseText.textContent = '判定中...';
        this.elements.resultAnimation.classList.add('hidden');
    }
    
    async showSuspense() {
        // 静かに待機（1.5秒）
        this.elements.suspenseText.textContent = '判定中...';
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    async showResult(isCorrect, message) {
        this.elements.suspenseText.style.display = 'none';
        this.elements.resultAnimation.classList.remove('hidden');
        
        if (isCorrect) {
            this.elements.resultText.textContent = '正解！';
            this.elements.resultText.className = 'result-text correct';
            this.elements.resultIcon.textContent = '🎉';
            this.createConfetti();
            this.playSuccessSound();
        } else {
            this.elements.resultText.textContent = '不正解...';
            this.elements.resultText.className = 'result-text incorrect';
            this.elements.resultIcon.textContent = '😢';
            this.playErrorSound();
        }
        
        // 結果表示時間
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    endGameAnimation() {
        this.elements.gameOverlay.classList.add('hidden');
        this.elements.suspenseText.style.display = 'block';
        // 紙吹雪をクリア
        const confetti = document.querySelectorAll('.confetti');
        confetti.forEach(c => c.remove());
    }
    
    playSuccessSound() {
        // Web Audio APIで成功音を生成
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
    
    playErrorSound() {
        // Web Audio APIでエラー音を生成
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    }
    
    createConfetti() {
        // クラッカー風紙吹雪を作成
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            this.elements.gameOverlay.appendChild(confetti);
        }
    }
}