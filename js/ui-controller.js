export class UIController {
    constructor(gameEngine, autoComplete) {
        this.gameEngine = gameEngine;
        this.autoComplete = autoComplete;
        this.currentHintLevel = 0;
        this.wordReorderUI = null;
        this.sqlTokenizer = null;
        this.currentChallengeType = null; // 現在選択されている問題タイプ
        this.isMobile = this.detectMobileDevice(); // モバイルデバイス検出
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
            sqlEditorSection: document.getElementById('sql-editor-section'),
            resultsSection: document.querySelector('.results-section'),
            slideSection: document.getElementById('slide-section'),
            slideTitle: document.getElementById('slide-title'),
            slideIframe: document.getElementById('slide-iframe'),
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
            resultIcon: document.getElementById('result-icon'),
            sidebar: document.querySelector('.sidebar'),
            toggleSidebar: document.getElementById('toggle-sidebar'),
            schemaInfo: document.getElementById('schema-info'),
            wordReorderSection: document.getElementById('word-reorder-section')
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
        
        this.elements.toggleSidebar.addEventListener('click', () => this.toggleSidebar());
        
        // 問題タイプ選択のイベントリスナーを追加
        this.bindChallengeTypeEvents();
    }

    /**
     * モバイルデバイスを検出
     * @returns {boolean} モバイルデバイスかどうか
     */
    detectMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
        
        // ユーザーエージェントでの検出
        const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
        
        // 画面サイズでの検出
        const isMobileScreen = window.innerWidth <= 768;
        
        // タッチデバイスの検出
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    /**
     * 問題タイプ選択のイベントリスナーを設定
     */
    bindChallengeTypeEvents() {
        const sqlEditorButton = document.getElementById('type-sql-editor');
        const wordReorderButton = document.getElementById('type-word-reorder');
        const typeDescriptionText = document.getElementById('type-description-text');
        
        if (sqlEditorButton && wordReorderButton) {
            sqlEditorButton.addEventListener('click', () => {
                this.switchChallengeType('challenge');
                this.updateTypeButtons('challenge');
                if (typeDescriptionText) {
                    typeDescriptionText.textContent = 'SQLを直接入力して実行します';
                }
            });
            
            wordReorderButton.addEventListener('click', () => {
                this.switchChallengeType('word-reorder');
                this.updateTypeButtons('word-reorder');
                if (typeDescriptionText) {
                    typeDescriptionText.textContent = '単語をタップして正しい順序に並び替えます';
                }
            });
        }
    }
    
    /**
     * 問題タイプボタンの表示を更新
     * @param {string} activeType - アクティブなタイプ
     */
    updateTypeButtons(activeType) {
        const sqlEditorButton = document.getElementById('type-sql-editor');
        const wordReorderButton = document.getElementById('type-word-reorder');
        
        if (sqlEditorButton && wordReorderButton) {
            sqlEditorButton.classList.toggle('active', activeType === 'challenge');
            wordReorderButton.classList.toggle('active', activeType === 'word-reorder');
        }
    }
    
    /**
     * 問題タイプを切り替え
     * @param {string} type - 切り替える問題タイプ
     */
    switchChallengeType(type) {
        this.currentChallengeType = type;
        const challenge = this.gameEngine.getCurrentChallenge();
        
        // スライドタイプの場合は切り替えできない
        if (challenge.type === 'slide') {
            return;
        }
        
        // 問題タイプに応じて表示を切り替え
        if (type === 'word-reorder') {
            this.showWordReorderChallenge(challenge);
        } else {
            this.showSQLChallenge();
        }
    }
    
    /**
     * 問題タイプ選択UIの表示/非表示を制御
     * @param {Object} challenge - 現在のチャレンジ
     */
    updateChallengeTypeSelector(challenge) {
        const typeSelector = document.getElementById('challenge-type-selector');
        
        if (!typeSelector) return;
        
        // スライドタイプの場合は選択UIを非表示
        if (challenge.type === 'slide') {
            typeSelector.classList.add('hidden');
            return;
        }
        
        // SQL実行可能な問題の場合は選択UIを表示
        if (challenge.solution) {
            typeSelector.classList.remove('hidden');
            
            // デフォルトの問題タイプを設定
            if (!this.currentChallengeType) {
                this.currentChallengeType = this.isMobile ? 'word-reorder' : 'challenge';
            }
            
            // ボタンの状態を更新
            this.updateTypeButtons(this.currentChallengeType);
            
            // 説明文を更新
            const typeDescriptionText = document.getElementById('type-description-text');
            if (typeDescriptionText) {
                typeDescriptionText.textContent = this.currentChallengeType === 'word-reorder' 
                    ? '単語をタップして正しい順序に並び替えます'
                    : 'SQLを直接入力して実行します';
            }
        } else {
            typeSelector.classList.add('hidden');
        }
    }
    
    /**
     * updateChallengeメソッドを拡張して問題タイプ選択を含める
     */
    updateChallengeWithTypeSelection() {
        const challenge = this.gameEngine.getCurrentChallenge();
        const progress = this.gameEngine.getProgress();
        
        this.elements.challengeTitle.textContent = challenge.title || 'タイトル未設定';
        this.elements.challengeDescription.textContent = challenge.description || '';
        this.elements.currentStage.textContent = progress.current;
        this.elements.progressFill.style.width = `${progress.percentage}%`;
        
        // 難易度表示（デフォルト値を設定）
        const difficulty = Math.min(Math.max(challenge.difficulty || 1, 1), 10);
        const filledStars = Math.min(difficulty, 5);
        const emptyStars = Math.max(5 - filledStars, 0);
        this.elements.difficultyStars.innerHTML = '★'.repeat(filledStars) + 
                                                  '☆'.repeat(emptyStars) +
                                                  (difficulty > 5 ? ` (${difficulty}/10)` : '');
        
        // ボタン状態更新
        this.elements.prevButton.disabled = progress.current === 1;
        this.elements.nextButton.disabled = progress.current === progress.total;
        
        // 問題タイプ選択UIを更新
        this.updateChallengeTypeSelector(challenge);
        
        // チャレンジタイプによって表示を切り替え
        console.log('Current challenge:', challenge.title, 'Type:', challenge.type);
        if (challenge.type === 'slide') {
            console.log('Showing slide challenge');
            this.showSlideChallenge(challenge);
        } else if (challenge.type === 'word-reorder' || this.currentChallengeType === 'word-reorder') {
            console.log('Showing word-reorder challenge');
            this.showWordReorderChallenge(challenge);
        } else {
            console.log('Showing SQL challenge');
            this.showSQLChallenge();
        }
        
        // ヒントレベルリセット
        this.currentHintLevel = 0;
        this.hideHint();
        
        // エディタクリア
        this.elements.sqlEditor.value = '';
        this.clearResults();
    }

    updateChallenge() {
        // 新しい問題タイプ選択機能付きのメソッドを呼び出し
        this.updateChallengeWithTypeSelection();
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
        // オーバーレイを表示
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.classList.remove('hidden');
        }
        
        // 全てのエフェクトを非表示にしてリセット
        this.hideAllEffects();
        
        // ロボットアニメーションを表示
        const robotAnimation = document.getElementById('robot-animation');
        if (robotAnimation) {
            robotAnimation.style.display = 'flex';
        }
    }
    
    async showSuspense() {
        // ロボットが考えている間の待機時間（2秒）
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    async showResult(isCorrect, message) {
        // ロボットアニメーションを非表示
        const robotAnimation = document.getElementById('robot-animation');
        if (robotAnimation) {
            robotAnimation.style.display = 'none';
        }
        
        // 結果アニメーションを表示
        if (this.elements.resultAnimation) {
            this.elements.resultAnimation.classList.remove('hidden');
        }
        
        if (isCorrect) {
            // 正解の場合
            if (this.elements.resultText) {
                this.elements.resultText.textContent = '正解！素晴らしい！';
                this.elements.resultText.className = 'result-text correct';
            }
            if (this.elements.resultIcon) {
                this.elements.resultIcon.textContent = '🎉';
            }
            
            // 成功エフェクトを表示
            this.showSuccessEffects();
            this.playSuccessSound();
            
        } else {
            // 不正解の場合
            if (this.elements.resultText) {
                this.elements.resultText.textContent = '不正解...もう一度挑戦！';
                this.elements.resultText.className = 'result-text incorrect';
            }
            if (this.elements.resultIcon) {
                this.elements.resultIcon.textContent = '💭';
            }
            
            // 失敗エフェクトを表示
            this.showFailureEffects();
            this.playErrorSound();
        }
        
        // 結果表示時間（3秒）
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    showSuccessEffects() {
        const successEffects = document.getElementById('success-effects');
        if (successEffects) {
            successEffects.classList.remove('hidden');
        }
        
        // 追加の紙吹雪エフェクト
        this.createEnhancedConfetti();
        
        // 3秒後にエフェクトを非表示
        setTimeout(() => {
            if (successEffects) {
                successEffects.classList.add('hidden');
            }
        }, 3000);
    }
    
    showFailureEffects() {
        const failureEffects = document.getElementById('failure-effects');
        if (failureEffects) {
            failureEffects.classList.remove('hidden');
        }
        
        // 2秒後にエフェクトを非表示
        setTimeout(() => {
            if (failureEffects) {
                failureEffects.classList.add('hidden');
            }
        }, 2000);
    }
    
    hideAllEffects() {
        // 全てのエフェクトを非表示
        const effects = [
            'robot-animation',
            'result-animation', 
            'success-effects',
            'failure-effects'
        ];
        
        effects.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'robot-animation') {
                    element.style.display = 'none';
                } else {
                    element.classList.add('hidden');
                }
            }
        });
        
        // 既存の紙吹雪をクリア
        const confetti = document.querySelectorAll('.confetti');
        confetti.forEach(c => c.remove());
    }
    
    endGameAnimation() {
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.classList.add('hidden');
        }
        
        // 全てのエフェクトをクリア
        this.hideAllEffects();
    }
    
    playSuccessSound() {
        try {
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
        } catch (error) {
            console.warn('音声再生エラー:', error);
        }
    }
    
    playErrorSound() {
        try {
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
        } catch (error) {
            console.warn('音声再生エラー:', error);
        }
    }
    
    createConfetti() {
        // クラッカー風紙吹雪を作成
        if (!this.elements.gameOverlay) return;
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            this.elements.gameOverlay.appendChild(confetti);
        }
    }
    
    createEnhancedConfetti() {
        // より豪華な紙吹雪エフェクト
        if (!this.elements.gameOverlay) return;
        
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        const shapes = ['●', '■', '▲', '★', '♦', '♠', '♥'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti enhanced-confetti';
            confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.fontSize = (Math.random() * 20 + 10) + 'px';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 4 + 3) + 's';
            confetti.style.position = 'absolute';
            confetti.style.zIndex = '10000';
            
            // ランダムな回転を追加
            const rotation = Math.random() * 360;
            confetti.style.transform = `rotate(${rotation}deg)`;
            
            this.elements.gameOverlay.appendChild(confetti);
            
            // 一定時間後に削除
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 7000);
        }
    }
    
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
        const isCollapsed = this.elements.sidebar.classList.contains('collapsed');
        this.elements.toggleSidebar.textContent = isCollapsed ? '→' : '←';
    }
    
    async loadSchemaInfo() {
        try {
            if (!window.dbManager) {
                throw new Error('データベースが初期化されていません');
            }
            
            const schemaInfo = await window.dbManager.getSchemaInfo();
            this.displaySchemaInfo(schemaInfo);
        } catch (error) {
            console.error('スキーマ情報読み込みエラー:', error);
            this.elements.schemaInfo.innerHTML = '<p class="loading-schema">スキーマ情報の読み込みに失敗しました</p>';
        }
    }
    
    displaySchemaInfo(schemaInfo) {
        if (!schemaInfo || schemaInfo.length === 0) {
            this.elements.schemaInfo.innerHTML = '<p class="loading-schema">テーブルが見つかりません</p>';
            return;
        }
        
        const schemaHtml = schemaInfo.map(table => {
            const columnsHtml = table.columns.map((column, index, array) => {
                const isLast = index === array.length - 1;
                const treeIcon = isLast ? '└─' : '├─';
                const typeIcon = this.getColumnTypeIcon(column.type);
                
                return `
                    <div class="tree-column">
                        <span class="tree-connector">${treeIcon}</span>
                        <span class="column-icon">${typeIcon}</span>
                        <span class="column-name">${column.name}</span>
                        <span class="column-type">${this.formatColumnType(column.type)}</span>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="tree-table">
                    <div class="tree-table-header" onclick="this.parentElement.classList.toggle('collapsed')">
                        <span class="tree-toggle">▼</span>
                        <span class="table-icon">🗂️</span>
                        <span class="table-name">${table.tableName}</span>
                        <span class="table-count">(${table.columns.length})</span>
                    </div>
                    <div class="tree-columns">
                        ${columnsHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.schemaInfo.innerHTML = schemaHtml;
    }
    
    getColumnTypeIcon(type) {
        const typeStr = type.toLowerCase();
        if (typeStr.includes('varchar') || typeStr.includes('text') || typeStr.includes('string')) {
            return '📝'; // テキスト
        } else if (typeStr.includes('int') || typeStr.includes('bigint') || typeStr.includes('number')) {
            return '🔢'; // 数値
        } else if (typeStr.includes('date') || typeStr.includes('time')) {
            return '📅'; // 日付
        } else if (typeStr.includes('bool')) {
            return '☑️'; // ブール
        } else if (typeStr.includes('decimal') || typeStr.includes('float') || typeStr.includes('double')) {
            return '💰'; // 小数
        } else {
            return '📄'; // その他
        }
    }
    
    formatColumnType(type) {
        // 型名を短縮して表示
        return type.replace(/VARCHAR\(\d+\)/, 'VARCHAR').replace(/BIGINT/, 'INT');
    }
    
    // Markdownをスライド用HTMLに変換
    parseMarkdownToSlide(markdown) {
        let html = markdown;
        
        // ヘッダー変換
        html = html.replace(/^# (.*$)/gm, '<h1 class="slide-h1">$1</h1>');
        html = html.replace(/^## (.*$)/gm, '<h2 class="slide-h2">$1</h2>');
        html = html.replace(/^### (.*$)/gm, '<h3 class="slide-h3">$1</h3>');
        
        // コードブロック変換
        html = html.replace(/```sql\n([\s\S]*?)\n```/g, '<div class="code-block sql-code"><pre><code>$1</code></pre></div>');
        html = html.replace(/```(.*?)\n([\s\S]*?)\n```/g, '<div class="code-block"><pre><code>$2</code></pre></div>');
        
        // インラインコード変換
        html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
        // 太字・斜体変換
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // リスト変換
        html = html.replace(/^- (.*$)/gm, '<li class="slide-li">$1</li>');
        html = html.replace(/(<li class="slide-li">.*<\/li>)/gs, '<ul class="slide-ul">$1</ul>');
        
        // 番号付きリスト変換
        html = html.replace(/^\d+\. (.*$)/gm, '<li class="slide-oli">$1</li>');
        html = html.replace(/(<li class="slide-oli">.*<\/li>)/gs, '<ol class="slide-ol">$1</ol>');
        
        // 段落変換（改行を段落に）
        html = html.replace(/\n\n/g, '</p><p class="slide-p">');
        html = '<p class="slide-p">' + html + '</p>';
        
        // 空の段落を削除
        html = html.replace(/<p class="slide-p"><\/p>/g, '');
        html = html.replace(/<p class="slide-p">(<[^>]+>)/g, '$1');
        html = html.replace(/(<\/[^>]+>)<\/p>/g, '$1');
        
        return html;
    }
    
    showSlideChallenge(challenge) {
        // SQLエディターと単語並び替えを非表示
        this.elements.sqlEditorSection.classList.add('hidden');
        this.elements.resultsSection.classList.add('hidden');
        if (this.elements.wordReorderSection) {
            this.elements.wordReorderSection.classList.add('hidden');
        }
        
        // スライドを表示
        this.elements.slideSection.classList.remove('hidden');
        this.elements.slideTitle.textContent = challenge.title;
        
        // Markdownをパースしてスライド表示
        const slideContent = challenge.content || challenge.slideContent || 'スライド内容がありません';
        const parsedContent = this.parseMarkdownToSlide(slideContent);
        
        const slideHtml = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>スライド</title>
                <style>
                    body {
                        font-family: 'Segoe UI', 'Hiragino Sans', 'Yu Gothic UI', sans-serif;
                        line-height: 1.8;
                        color: #2d3748;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        margin: 0;
                        padding: 2rem;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .slide-container {
                        background: white;
                        border-radius: 16px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                        padding: 3rem;
                        max-width: 900px;
                        width: 100%;
                        animation: slideIn 0.6s ease-out;
                    }
                    
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(30px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .slide-h1 {
                        font-size: 2.5rem;
                        color: #1a202c;
                        margin-bottom: 2rem;
                        text-align: center;
                        border-bottom: 3px solid #667eea;
                        padding-bottom: 1rem;
                    }
                    
                    .slide-h2 {
                        font-size: 2rem;
                        color: #2d3748;
                        margin: 2rem 0 1rem 0;
                        position: relative;
                        padding-left: 1rem;
                    }
                    
                    .slide-h2::before {
                        content: '▶';
                        color: #667eea;
                        position: absolute;
                        left: 0;
                    }
                    
                    .slide-h3 {
                        font-size: 1.5rem;
                        color: #4a5568;
                        margin: 1.5rem 0 1rem 0;
                    }
                    
                    .slide-p {
                        font-size: 1.1rem;
                        margin-bottom: 1.5rem;
                        text-align: justify;
                    }
                    
                    .slide-ul, .slide-ol {
                        margin: 1.5rem 0;
                        padding-left: 2rem;
                    }
                    
                    .slide-li, .slide-oli {
                        margin-bottom: 0.8rem;
                        font-size: 1.1rem;
                    }
                    
                    .slide-li::marker {
                        color: #667eea;
                    }
                    
                    .code-block {
                        background: #1a202c;
                        border-radius: 12px;
                        padding: 1.5rem;
                        margin: 2rem 0;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        position: relative;
                    }
                    
                    .code-block::before {
                        content: '';
                        position: absolute;
                        top: 1rem;
                        left: 1rem;
                        width: 12px;
                        height: 12px;
                        background: #ff5f56;
                        border-radius: 50%;
                        box-shadow: 20px 0 #ffbd2e, 40px 0 #27ca3f;
                    }
                    
                    .code-block pre {
                        margin: 0;
                        padding-top: 1rem;
                        overflow-x: auto;
                    }
                    
                    .code-block code {
                        color: #e2e8f0;
                        font-family: 'Fira Code', 'Consolas', monospace;
                        font-size: 1rem;
                        line-height: 1.6;
                    }
                    
                    .sql-code code {
                        color: #81e6d9;
                    }
                    
                    .inline-code {
                        background: #edf2f7;
                        color: #d53f8c;
                        padding: 0.2rem 0.4rem;
                        border-radius: 4px;
                        font-family: 'Fira Code', 'Consolas', monospace;
                        font-size: 0.9em;
                    }
                    
                    strong {
                        color: #1a202c;
                        font-weight: 700;
                    }
                    
                    em {
                        color: #667eea;
                        font-style: italic;
                    }
                </style>
            </head>
            <body>
                <div class="slide-container">
                    ${parsedContent}
                </div>
            </body>
            </html>
        `;
        
        this.elements.slideIframe.srcdoc = slideHtml;
    }
    
    showSQLChallenge() {
        // スライドと単語並び替えを非表示
        this.elements.slideSection.classList.add('hidden');
        if (this.elements.wordReorderSection) {
            this.elements.wordReorderSection.classList.add('hidden');
        }
        
        // SQLエディターを表示
        this.elements.sqlEditorSection.classList.remove('hidden');
        this.elements.resultsSection.classList.remove('hidden');
    }

    /**
     * 単語並び替えチャレンジを表示
     * @param {Object} challenge - チャレンジオブジェクト
     */
    async showWordReorderChallenge(challenge) {
        // 他のセクションを非表示
        this.elements.sqlEditorSection.classList.add('hidden');
        this.elements.resultsSection.classList.add('hidden');
        this.elements.slideSection.classList.add('hidden');
        
        // 単語並び替えセクションを表示
        if (this.elements.wordReorderSection) {
            this.elements.wordReorderSection.classList.remove('hidden');
            
            // SQLTokenizerとWordReorderUIを初期化
            if (!this.sqlTokenizer) {
                const { SQLTokenizer } = await import('./sql-tokenizer.js');
                this.sqlTokenizer = new SQLTokenizer();
            }
            
            if (!this.wordReorderUI) {
                const { WordReorderUI } = await import('./word-reorder-ui.js');
                this.wordReorderUI = new WordReorderUI(this.elements.wordReorderSection);
                
                // 回答確認のコールバックを設定
                this.wordReorderUI.setCheckAnswerCallback((sql) => {
                    this.executeWordReorderQuery(sql);
                });
            }
            
            // 正解SQLをトークン化してシャッフル
            const tokens = this.sqlTokenizer.tokenize(challenge.solution);
            const shuffledTokens = this.sqlTokenizer.shuffle(tokens);
            
            // 単語を表示
            this.wordReorderUI.displayWords(shuffledTokens);
            
            console.log('Word reorder challenge initialized:', {
                solution: challenge.solution,
                tokens: tokens.length,
                shuffled: shuffledTokens.length
            });
        } else {
            console.error('Word reorder section not found in HTML');
            this.showError('単語並び替え機能の初期化に失敗しました');
        }
    }

    /**
     * 単語並び替えで構築されたSQLを実行・検証
     * @param {string} userSQL - ユーザーが構築したSQL
     */
    async executeWordReorderQuery(userSQL) {
        if (!userSQL || userSQL.trim() === '') {
            this.showError('単語を並び替えてSQLを構築してください');
            return;
        }

        // UIを無効化
        if (this.wordReorderUI) {
            this.wordReorderUI.setDisabled(true);
        }

        this.elements.executionStatus.textContent = '実行中...';
        this.elements.executionStatus.className = 'status-indicator';

        try {
            // ゲームアニメーション開始（ロボット表示）
            await this.startGameAnimation();
            
            // GameEngineの word-reorder 専用メソッドを使用（バックグラウンドで実行）
            const result = await this.gameEngine.checkWordReorderAnswer(userSQL);
            
            // ロボットの思考時間を表示
            await this.showSuspense();

            // 結果アニメーション表示
            await this.showResult(result.correct, result.message);
            
            // アニメーション終了後に実際の処理結果を反映
            if (result.correct) {
                this.updateScore();
                
                // 結果を表示
                if (result.userResult && result.userResult.success) {
                    this.displayResults(result.userResult);
                }
                
                // ステータス更新
                this.elements.executionStatus.textContent = result.message;
                this.elements.executionStatus.className = 'status-indicator status-success';
                
                // 次の問題へのボタンを有効化
                if (this.gameEngine.currentChallengeIndex < this.gameEngine.challenges.length - 1) {
                    this.elements.nextButton.disabled = false;
                }
            } else {
                // エラーでない場合は結果を表示
                if (result.userResult && result.userResult.success) {
                    this.displayResults(result.userResult);
                }
                
                // ステータス更新
                this.elements.executionStatus.textContent = result.message;
                this.elements.executionStatus.className = 'status-indicator status-error';
            }

        } catch (error) {
            console.error('Word reorder query execution error:', error);
            
            // エラーの場合もロボットの思考時間を表示
            await this.showSuspense();
            await this.showResult(false, `実行エラー: ${error.message}`);
            
            // ステータス更新
            this.elements.executionStatus.textContent = `実行エラー: ${error.message}`;
            this.elements.executionStatus.className = 'status-indicator status-error';
        } finally {
            // UIを再有効化
            if (this.wordReorderUI) {
                this.wordReorderUI.setDisabled(false);
            }
            
            // ゲームアニメーション終了
            this.endGameAnimation();
        }
    }
    
    /**
     * モバイルデバイスを検出
     * @returns {boolean} モバイルデバイスかどうか
     */
    detectMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
        
        // ユーザーエージェントでの検出
        const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
        
        // 画面サイズでの検出
        const isMobileScreen = window.innerWidth <= 768;
        
        // タッチデバイスの検出
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    /**
     * 問題タイプ選択のイベントリスナーを設定
     */
    bindChallengeTypeEvents() {
        const sqlEditorButton = document.getElementById('type-sql-editor');
        const wordReorderButton = document.getElementById('type-word-reorder');
        const typeDescriptionText = document.getElementById('type-description-text');
        
        if (sqlEditorButton && wordReorderButton) {
            sqlEditorButton.addEventListener('click', () => {
                this.switchChallengeType('challenge');
                this.updateTypeButtons('challenge');
                if (typeDescriptionText) {
                    typeDescriptionText.textContent = 'SQLを直接入力して実行します';
                }
            });
            
            wordReorderButton.addEventListener('click', () => {
                this.switchChallengeType('word-reorder');
                this.updateTypeButtons('word-reorder');
                if (typeDescriptionText) {
                    typeDescriptionText.textContent = '単語をタップして正しい順序に並び替えます';
                }
            });
        }
    }
    
    /**
     * 問題タイプボタンの表示を更新
     * @param {string} activeType - アクティブなタイプ
     */
    updateTypeButtons(activeType) {
        const sqlEditorButton = document.getElementById('type-sql-editor');
        const wordReorderButton = document.getElementById('type-word-reorder');
        
        if (sqlEditorButton && wordReorderButton) {
            sqlEditorButton.classList.toggle('active', activeType === 'challenge');
            wordReorderButton.classList.toggle('active', activeType === 'word-reorder');
        }
    }
    
    /**
     * 問題タイプを切り替え
     * @param {string} type - 切り替える問題タイプ
     */
    switchChallengeType(type) {
        this.currentChallengeType = type;
        const challenge = this.gameEngine.getCurrentChallenge();
        
        // スライドタイプの場合は切り替えできない
        if (challenge.type === 'slide') {
            return;
        }
        
        // 問題タイプに応じて表示を切り替え
        if (type === 'word-reorder') {
            this.showWordReorderChallenge(challenge);
        } else {
            this.showSQLChallenge();
        }
    }
    
    /**
     * 問題タイプ選択UIの表示/非表示を制御
     * @param {Object} challenge - 現在のチャレンジ
     */
    updateChallengeTypeSelector(challenge) {
        const typeSelector = document.getElementById('challenge-type-selector');
        
        if (!typeSelector) return;
        
        // スライドタイプの場合は選択UIを非表示
        if (challenge.type === 'slide') {
            typeSelector.classList.add('hidden');
            return;
        }
        
        // SQL実行可能な問題の場合は選択UIを表示
        if (challenge.solution) {
            typeSelector.classList.remove('hidden');
            
            // デフォルトの問題タイプを設定
            if (!this.currentChallengeType) {
                this.currentChallengeType = this.isMobile ? 'word-reorder' : 'challenge';
            }
            
            // ボタンの状態を更新
            this.updateTypeButtons(this.currentChallengeType);
            
            // 説明文を更新
            const typeDescriptionText = document.getElementById('type-description-text');
            if (typeDescriptionText) {
                typeDescriptionText.textContent = this.currentChallengeType === 'word-reorder' 
                    ? '単語をタップして正しい順序に並び替えます'
                    : 'SQLを直接入力して実行します';
            }
        } else {
            typeSelector.classList.add('hidden');
        }
    }
    
    /**
     * updateChallengeメソッドを拡張して問題タイプ選択を含める
     */
    updateChallengeWithTypeSelection() {
        const challenge = this.gameEngine.getCurrentChallenge();
        const progress = this.gameEngine.getProgress();
        
        this.elements.challengeTitle.textContent = challenge.title || 'タイトル未設定';
        this.elements.challengeDescription.textContent = challenge.description || '';
        this.elements.currentStage.textContent = progress.current;
        this.elements.progressFill.style.width = `${progress.percentage}%`;
        
        // 難易度表示（デフォルト値を設定）
        const difficulty = Math.min(Math.max(challenge.difficulty || 1, 1), 10);
        const filledStars = Math.min(difficulty, 5);
        const emptyStars = Math.max(5 - filledStars, 0);
        this.elements.difficultyStars.innerHTML = '★'.repeat(filledStars) + 
                                                  '☆'.repeat(emptyStars) +
                                                  (difficulty > 5 ? ` (${difficulty}/10)` : '');
        
        // ボタン状態更新
        this.elements.prevButton.disabled = progress.current === 1;
        this.elements.nextButton.disabled = progress.current === progress.total;
        
        // 問題タイプ選択UIを更新
        this.updateChallengeTypeSelector(challenge);
        
        // チャレンジタイプによって表示を切り替え
        console.log('Current challenge:', challenge.title, 'Type:', challenge.type);
        if (challenge.type === 'slide') {
            console.log('Showing slide challenge');
            this.showSlideChallenge(challenge);
        } else if (challenge.type === 'word-reorder' || this.currentChallengeType === 'word-reorder') {
            console.log('Showing word-reorder challenge');
            this.showWordReorderChallenge(challenge);
        } else {
            console.log('Showing SQL challenge');
            this.showSQLChallenge();
        }
        
        // ヒントレベルリセット
        this.currentHintLevel = 0;
        this.hideHint();
        
        // エディタクリア
        this.elements.sqlEditor.value = '';
        this.clearResults();
    }
}