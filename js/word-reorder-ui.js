export class WordReorderUI {
    constructor(container) {
        this.container = container;
        this.availableWords = []; // 選択可能な単語
        this.selectedWords = [];  // 選択された単語（回答エリア）
        this.originalTokens = []; // 元のトークン（リセット用）
        
        // ドラッグ&ドロップ状態管理
        this.dragState = {
            isDragging: false,
            draggedElement: null,
            draggedToken: null,
            draggedFromType: null, // 'available' or 'selected'
            draggedFromIndex: null,
            dropTarget: null,
            insertPosition: null,
            
            // タッチ操作用
            touchStartTime: null,
            touchStartPos: null,
            longPressTimer: null,
            touchDragThreshold: 10, // px
            longPressDelay: 500, // ms
            
            // ドラッグプレビュー要素
            dragPreview: null
        };
        
        this.initializeUI();
        this.bindEvents();
        this.initializeDragAndDrop();
    }
    
    /**
     * UIの初期化
     */
    initializeUI() {
        this.container.innerHTML = `
            <div class="word-reorder-container">
                <div class="instruction">
                    <p>単語をタップまたはドラッグして正しい順序に並び替えてください</p>
                </div>
                
                <div class="answer-area">
                    <h4>回答エリア</h4>
                    <div class="selected-words" id="selected-words">
                        <div class="empty-message">ここに単語を並べてください</div>
                    </div>
                </div>
                
                <div class="available-area">
                    <h4>選択可能な単語</h4>
                    <div class="available-words" id="available-words">
                    </div>
                </div>
                
                <div class="controls">
                    <button id="reset-words" class="control-button reset-button">
                        🔄 リセット
                    </button>
                    <button id="check-answer" class="control-button check-button">
                        ✓ 回答確認
                    </button>
                </div>
                
                <!-- アクセシビリティ用のライブリージョン -->
                <div id="drag-announcements" aria-live="polite" aria-atomic="true" class="sr-only"></div>
            </div>
        `;
        
        // 要素の参照を取得
        this.selectedWordsContainer = this.container.querySelector('#selected-words');
        this.availableWordsContainer = this.container.querySelector('#available-words');
        this.resetButton = this.container.querySelector('#reset-words');
        this.checkButton = this.container.querySelector('#check-answer');
    }
    
    /**
     * イベントの設定
     */
    bindEvents() {
        this.resetButton.addEventListener('click', () => this.reset());
        this.checkButton.addEventListener('click', () => this.onCheckAnswer());
        
        // コールバック関数のプレースホルダー
        this.onCheckAnswerCallback = null;
    }
    
    /**
     * ドラッグ&ドロップ機能を初期化
     */
    initializeDragAndDrop() {
        // ブラウザ互換性チェック
        this.dragDropSupported = this.checkDragDropSupport();
        
        if (this.dragDropSupported) {
            // ドロップゾーンの設定
            this.setupDropZones();
            
            // ドラッグプレビュー要素を作成
            this.createDragPreview();
            
            // グローバルドラッグイベントの設定
            document.addEventListener('dragover', (e) => e.preventDefault());
            document.addEventListener('drop', (e) => e.preventDefault());
        } else {
            console.info('ドラッグ&ドロップがサポートされていません。タップ操作のみ利用可能です。');
        }
    }
    
    /**
     * ドラッグ&ドロップサポートをチェック
     * @returns {boolean} サポートされているかどうか
     */
    checkDragDropSupport() {
        try {
            // HTML5 Drag and Drop API のサポートチェック
            const div = document.createElement('div');
            return ('draggable' in div) && ('ondragstart' in div) && ('ondrop' in div);
        } catch (error) {
            console.warn('ドラッグ&ドロップサポートチェックでエラー:', error);
            return false;
        }
    }
    
    /**
     * ドロップゾーンを設定
     */
    setupDropZones() {
        // 選択可能エリアをドロップゾーンに設定
        this.setupDropZone(this.availableWordsContainer, 'available');
        
        // 回答エリアをドロップゾーンに設定
        this.setupDropZone(this.selectedWordsContainer, 'selected');
    }
    
    /**
     * 個別のドロップゾーンを設定
     * @param {HTMLElement} element - ドロップゾーン要素
     * @param {string} type - ドロップゾーンのタイプ
     */
    setupDropZone(element, type) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.onDragOver(e, type);
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            this.onDrop(e, type);
        });
        
        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });
        
        element.addEventListener('dragleave', (e) => {
            // 子要素への移動でdragleaveが発火するのを防ぐ
            if (!element.contains(e.relatedTarget)) {
                element.classList.remove('drag-over');
            }
        });
    }
    
    /**
     * ドラッグプレビュー要素を作成
     */
    createDragPreview() {
        this.dragState.dragPreview = document.createElement('div');
        this.dragState.dragPreview.className = 'drag-preview';
        this.dragState.dragPreview.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 1000;
            opacity: 0.8;
            transform: rotate(5deg);
            display: none;
        `;
        document.body.appendChild(this.dragState.dragPreview);
    }
    
    /**
     * 単語を表示
     * @param {Array<Object>} tokens - 表示するトークンの配列
     */
    displayWords(tokens) {
        this.originalTokens = [...tokens];
        this.availableWords = [...tokens];
        this.selectedWords = [];
        
        this.renderAvailableWords();
        this.renderSelectedWords();
    }
    
    /**
     * 選択可能な単語を描画
     */
    renderAvailableWords() {
        this.availableWordsContainer.innerHTML = '';
        
        if (this.availableWords.length === 0) {
            this.availableWordsContainer.innerHTML = '<div class="empty-message">すべての単語が選択されました</div>';
            return;
        }
        
        this.availableWords.forEach((token, index) => {
            const wordElement = this.createWordElement(token, 'available', index);
            this.availableWordsContainer.appendChild(wordElement);
        });
    }
    
    /**
     * 選択された単語を描画
     */
    renderSelectedWords() {
        this.selectedWordsContainer.innerHTML = '';
        
        if (this.selectedWords.length === 0) {
            this.selectedWordsContainer.innerHTML = '<div class="empty-message">ここに単語を並べてください</div>';
            return;
        }
        
        this.selectedWords.forEach((token, index) => {
            const wordElement = this.createWordElement(token, 'selected', index);
            this.selectedWordsContainer.appendChild(wordElement);
        });
    }
    
    /**
     * 単語要素を作成
     * @param {Object} token - トークンオブジェクト
     * @param {string} type - 'available' または 'selected'
     * @param {number} index - 配列内のインデックス
     * @returns {HTMLElement} 単語要素
     */
    createWordElement(token, type, index) {
        const wordElement = document.createElement('div');
        wordElement.className = `word-token ${token.type} ${type}`;
        wordElement.textContent = token.text;
        wordElement.dataset.type = type;
        wordElement.dataset.index = index;
        wordElement.dataset.tokenType = token.type;
        
        // アクセシビリティ属性を設定
        wordElement.setAttribute('role', 'button');
        wordElement.setAttribute('tabindex', '0');
        wordElement.setAttribute('aria-label', 
            `${token.text} - ${type === 'available' ? '選択可能な単語' : '選択済みの単語'}`);
        wordElement.setAttribute('aria-grabbed', 'false');
        
        // ドラッグ&ドロップ機能を追加
        this.makeDraggable(wordElement, token, type, index);
        
        // タップイベントの設定
        wordElement.addEventListener('click', (e) => {
            e.preventDefault();
            this.onWordTap(type, index);
        });
        
        // キーボードナビゲーション対応
        wordElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.onWordTap(type, index);
            }
        });
        
        // タッチイベントの設定（モバイル対応）
        // touchendイベントはmakeDraggableメソッド内で処理されるため、ここでは設定しない
        
        return wordElement;
    }
    
    /**
     * 単語要素にドラッグ機能を追加
     * @param {HTMLElement} element - 単語要素
     * @param {Object} token - トークンオブジェクト
     * @param {string} type - 'available' または 'selected'
     * @param {number} index - 配列内のインデックス
     */
    makeDraggable(element, token, type, index) {
        if (!this.dragDropSupported) {
            // ドラッグ&ドロップがサポートされていない場合はスキップ
            return;
        }
        
        try {
            // HTML5 Drag and Drop
            element.draggable = true;
            element.addEventListener('dragstart', (e) => this.onDragStart(e, token, type, index));
            element.addEventListener('dragend', (e) => this.onDragEnd(e));
            
            // Touch Events for mobile
            element.addEventListener('touchstart', (e) => this.onTouchStart(e, token, type, index));
            element.addEventListener('touchmove', (e) => this.onTouchMove(e));
            element.addEventListener('touchend', (e) => this.onTouchEnd(e));
        } catch (error) {
            console.warn('ドラッグ機能の設定でエラーが発生しました:', error);
            // エラーが発生してもタップ機能は維持される
        }
    }
    
    /**
     * 単語タップ時の処理
     * @param {string} type - 'available' または 'selected'
     * @param {number} index - タップされた単語のインデックス
     */
    onWordTap(type, index) {
        if (type === 'available') {
            // 選択可能な単語がタップされた場合、回答エリアに移動
            this.moveWordToSelected(index);
        } else if (type === 'selected') {
            // 選択された単語がタップされた場合、選択可能エリアに戻す
            this.moveWordToAvailable(index);
        }
        
        // 視覚的フィードバック（eventオブジェクトの代わりに要素を直接取得）
        const wordElements = this.container.querySelectorAll('.word-token');
        const targetElement = Array.from(wordElements).find(el => 
            el.dataset.type === type && parseInt(el.dataset.index) === index
        );
        if (targetElement) {
            this.addTapFeedback(targetElement);
        }
    }
    
    /**
     * 単語を回答エリアに移動
     * @param {number} index - 移動する単語のインデックス
     */
    moveWordToSelected(index) {
        if (index < 0 || index >= this.availableWords.length) return;
        
        const token = this.availableWords.splice(index, 1)[0];
        this.selectedWords.push(token);
        
        this.renderAvailableWords();
        this.renderSelectedWords();
        
        // 新しく追加された単語にアニメーション効果
        setTimeout(() => {
            const newWordElement = this.selectedWordsContainer.lastElementChild;
            if (newWordElement && !newWordElement.classList.contains('empty-message')) {
                newWordElement.classList.add('word-added');
                setTimeout(() => {
                    newWordElement.classList.remove('word-added');
                }, 300);
            }
        }, 10);
    }
    
    /**
     * 単語を選択可能エリアに戻す
     * @param {number} index - 戻す単語のインデックス
     */
    moveWordToAvailable(index) {
        if (index < 0 || index >= this.selectedWords.length) return;
        
        const token = this.selectedWords.splice(index, 1)[0];
        this.availableWords.push(token);
        
        this.renderAvailableWords();
        this.renderSelectedWords();
    }
    
    /**
     * タップ時の視覚的フィードバック
     * @param {HTMLElement} element - タップされた要素
     */
    addTapFeedback(element) {
        element.classList.add('tapped');
        setTimeout(() => {
            element.classList.remove('tapped');
        }, 150);
    }
    
    /**
     * ドラッグ開始時の処理
     * @param {DragEvent} event - ドラッグイベント
     * @param {Object} token - ドラッグされるトークン
     * @param {string} type - 'available' または 'selected'
     * @param {number} index - インデックス
     */
    onDragStart(event, token, type, index) {
        this.dragState.isDragging = true;
        this.dragState.draggedToken = token;
        this.dragState.draggedFromType = type;
        this.dragState.draggedFromIndex = index;
        this.dragState.draggedElement = event.target;
        
        // ドラッグデータを設定（複数の形式で設定）
        const dragData = {
            token, 
            type, 
            index,
            timestamp: Date.now(),
            sourceId: `word-reorder-${type}-${index}`
        };
        
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        event.dataTransfer.setData('application/json', JSON.stringify(dragData));
        
        // ドラッグ効果を設定
        event.dataTransfer.effectAllowed = 'move';
        
        // カスタムドラッグイメージを設定（オプション）
        try {
            const dragImage = event.target.cloneNode(true);
            dragImage.style.opacity = '0.8';
            event.dataTransfer.setDragImage(dragImage, 
                event.target.offsetWidth / 2, 
                event.target.offsetHeight / 2
            );
        } catch (e) {
            // ドラッグイメージ設定に失敗した場合は無視
            console.debug('カスタムドラッグイメージの設定に失敗:', e);
        }
        
        // 視覚的フィードバック
        event.target.classList.add('dragging');
        
        // ドロップゾーンをハイライト
        this.highlightDropZones();
    }
    
    /**
     * ドラッグ終了時の処理
     * @param {DragEvent} event - ドラッグイベント
     */
    onDragEnd(event) {
        this.dragState.isDragging = false;
        
        // 視覚的フィードバックを削除
        event.target.classList.remove('dragging');
        this.removeDropZoneHighlights();
        
        // 状態をリセット
        this.resetDragState();
    }
    
    /**
     * ドラッグオーバー時の処理
     * @param {DragEvent} event - ドラッグイベント
     * @param {string} type - ドロップゾーンのタイプ
     */
    onDragOver(event, type) {
        event.preventDefault();
        
        // 挿入位置を計算して表示
        const insertPosition = this.calculateInsertPosition(event, type);
        this.showInsertionIndicator(insertPosition, type);
    }
    
    /**
     * ドロップ時の処理
     * @param {DragEvent} event - ドラッグイベント
     * @param {string} targetType - ドロップ先のタイプ
     */
    onDrop(event, targetType) {
        event.preventDefault();
        
        try {
            const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
            const insertPosition = this.calculateInsertPosition(event, targetType);
            
            this.performDrop(dragData, targetType, insertPosition);
        } catch (error) {
            console.error('ドロップ処理でエラーが発生しました:', error);
        }
        
        // クリーンアップ
        this.removeDropZoneHighlights();
        this.hideInsertionIndicator();
    }
    
    /**
     * タッチ開始時の処理
     * @param {TouchEvent} event - タッチイベント
     * @param {Object} token - トークン
     * @param {string} type - タイプ
     * @param {number} index - インデックス
     */
    onTouchStart(event, token, type, index) {
        const touch = event.touches[0];
        
        this.dragState.touchStartTime = Date.now();
        this.dragState.touchStartPos = { x: touch.clientX, y: touch.clientY };
        this.dragState.draggedToken = token;
        this.dragState.draggedFromType = type;
        this.dragState.draggedFromIndex = index;
        
        // 長押し検出タイマー
        this.dragState.longPressTimer = setTimeout(() => {
            this.startTouchDrag(event.target, token, type, index);
        }, this.dragState.longPressDelay);
    }
    
    /**
     * タッチ移動時の処理
     * @param {TouchEvent} event - タッチイベント
     */
    onTouchMove(event) {
        if (!this.dragState.isDragging) {
            // 長押し前の移動チェック
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.dragState.touchStartPos.x;
            const deltaY = touch.clientY - this.dragState.touchStartPos.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > this.dragState.touchDragThreshold) {
                clearTimeout(this.dragState.longPressTimer);
            }
            return;
        }
        
        event.preventDefault();
        
        // ドラッグ中の要素を指の位置に追従
        const touch = event.touches[0];
        this.updateDragPreviewPosition(touch.clientX, touch.clientY);
        
        // ドロップターゲットを更新
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        this.updateDropTarget(elementBelow);
    }
    
    /**
     * タッチ終了時の処理
     * @param {TouchEvent} event - タッチイベント
     */
    onTouchEnd(event) {
        clearTimeout(this.dragState.longPressTimer);
        
        if (!this.dragState.isDragging) {
            // 通常のタップ操作として処理（既存の処理を維持）
            return;
        }
        
        event.preventDefault();
        
        // ドロップ処理
        const touch = event.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        this.performTouchDrop(dropTarget);
        
        // クリーンアップ
        this.endTouchDrag();
    }
    
    /**
     * 選択された単語からSQLを構築
     * @returns {string} 構築されたSQL文
     */
    buildSQL() {
        if (this.selectedWords.length === 0) {
            return '';
        }
        
        // SQLTokenizerのbuildSQLメソッドを使用
        // ここでは簡単な実装
        let sql = '';
        
        for (let i = 0; i < this.selectedWords.length; i++) {
            const token = this.selectedWords[i];
            const prevToken = i > 0 ? this.selectedWords[i - 1] : null;
            
            // スペースを追加するかどうかの判定
            if (i > 0 && this.needsSpace(prevToken, token)) {
                sql += ' ';
            }
            
            sql += token.text;
        }
        
        return sql.trim();
    }
    
    /**
     * 2つのトークン間にスペースが必要かどうかを判定
     */
    needsSpace(prevToken, currentToken) {
        // 区切り文字の前後はスペース不要の場合が多い
        if (prevToken.type === 'punctuation' && prevToken.text === '(') {
            return false;
        }
        
        if (currentToken.type === 'punctuation' && /[(),;]/.test(currentToken.text)) {
            return false;
        }
        
        // 演算子の前後は基本的にスペースが必要
        if (prevToken.type === 'operator' || currentToken.type === 'operator') {
            return true;
        }
        
        // その他の場合は基本的にスペースが必要
        return true;
    }
    
    /**
     * リセット（すべての単語を選択可能エリアに戻す）
     */
    reset() {
        this.availableWords = [...this.originalTokens];
        this.selectedWords = [];
        
        this.renderAvailableWords();
        this.renderSelectedWords();
        
        // リセットアニメーション
        this.container.classList.add('reset-animation');
        setTimeout(() => {
            this.container.classList.remove('reset-animation');
        }, 300);
    }
    
    /**
     * 回答確認ボタンがクリックされた時の処理
     */
    onCheckAnswer() {
        if (this.selectedWords.length === 0) {
            alert('単語を並び替えてからチェックしてください');
            return;
        }
        
        const sql = this.buildSQL();
        
        if (this.onCheckAnswerCallback) {
            this.onCheckAnswerCallback(sql);
        }
    }
    
    /**
     * 回答確認のコールバック関数を設定
     * @param {Function} callback - コールバック関数
     */
    setCheckAnswerCallback(callback) {
        this.onCheckAnswerCallback = callback;
    }
    
    /**
     * 進捗状況を取得
     * @returns {Object} 進捗情報
     */
    getProgress() {
        return {
            totalWords: this.originalTokens.length,
            selectedWords: this.selectedWords.length,
            remainingWords: this.availableWords.length,
            isComplete: this.availableWords.length === 0
        };
    }
    
    /**
     * UIを無効化/有効化
     * @param {boolean} disabled - 無効化するかどうか
     */
    setDisabled(disabled) {
        const wordElements = this.container.querySelectorAll('.word-token');
        wordElements.forEach(element => {
            element.style.pointerEvents = disabled ? 'none' : 'auto';
            element.style.opacity = disabled ? '0.6' : '1';
        });
        
        this.resetButton.disabled = disabled;
        this.checkButton.disabled = disabled;
    }
    
    // ===== ドラッグ&ドロップ補助メソッド =====
    
    /**
     * ドロップゾーンをハイライト表示
     */
    highlightDropZones() {
        this.availableWordsContainer.classList.add('drop-zone-highlight');
        this.selectedWordsContainer.classList.add('drop-zone-highlight');
    }
    
    /**
     * ドロップゾーンのハイライトを削除
     */
    removeDropZoneHighlights() {
        this.availableWordsContainer.classList.remove('drag-over', 'drop-zone-highlight');
        this.selectedWordsContainer.classList.remove('drag-over', 'drop-zone-highlight');
    }
    
    /**
     * ドラッグ状態をリセット
     */
    resetDragState() {
        this.dragState.isDragging = false;
        this.dragState.draggedElement = null;
        this.dragState.draggedToken = null;
        this.dragState.draggedFromType = null;
        this.dragState.draggedFromIndex = null;
        this.dragState.dropTarget = null;
        this.dragState.insertPosition = null;
    }
    
    /**
     * 挿入位置を計算
     * @param {Event} event - ドラッグイベント
     * @param {string} targetType - ターゲットタイプ
     * @returns {number} 挿入位置
     */
    calculateInsertPosition(event, targetType) {
        const container = targetType === 'selected' ? 
            this.selectedWordsContainer : this.availableWordsContainer;
        const words = targetType === 'selected' ? 
            this.selectedWords : this.availableWords;
        
        // コンテナ内の単語要素を取得
        const wordElements = Array.from(container.querySelectorAll('.word-token'));
        
        if (wordElements.length === 0) {
            return 0; // 空の場合は最初の位置
        }
        
        // マウス/タッチ位置を取得
        const clientX = event.clientX || (event.touches && event.touches[0]?.clientX) || 0;
        const clientY = event.clientY || (event.touches && event.touches[0]?.clientY) || 0;
        
        // 各単語要素との距離を計算
        let closestIndex = words.length; // デフォルトは末尾
        let minDistance = Infinity;
        
        wordElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const elementCenterX = rect.left + rect.width / 2;
            const elementCenterY = rect.top + rect.height / 2;
            
            // 距離を計算（主にX軸を重視）
            const deltaX = clientX - elementCenterX;
            const deltaY = clientY - elementCenterY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY * 0.5); // Y軸の重みを軽減
            
            if (distance < minDistance) {
                minDistance = distance;
                // 要素の左半分なら前に、右半分なら後に挿入
                closestIndex = deltaX < 0 ? index : index + 1;
            }
        });
        
        return Math.max(0, Math.min(closestIndex, words.length));
    }
    
    /**
     * 挿入位置インジケーターを表示
     * @param {number} position - 挿入位置
     * @param {string} type - エリアタイプ
     */
    showInsertionIndicator(position, type) {
        // 既存のインジケーターを削除
        this.hideInsertionIndicator();
        
        const container = type === 'selected' ? 
            this.selectedWordsContainer : this.availableWordsContainer;
        const words = type === 'selected' ? 
            this.selectedWords : this.availableWords;
        
        if (words.length === 0) {
            // 空のコンテナの場合は全体をハイライト
            container.classList.add('insertion-highlight');
            return;
        }
        
        // 挿入位置インジケーターを作成
        const indicator = document.createElement('div');
        indicator.className = 'insertion-indicator';
        indicator.dataset.insertionIndicator = 'true';
        
        const wordElements = Array.from(container.querySelectorAll('.word-token'));
        
        if (position >= wordElements.length) {
            // 末尾に挿入
            container.appendChild(indicator);
        } else {
            // 指定位置に挿入
            container.insertBefore(indicator, wordElements[position]);
        }
    }
    
    /**
     * 挿入位置インジケーターを非表示
     */
    hideInsertionIndicator() {
        // インジケーター要素を削除
        const indicators = document.querySelectorAll('[data-insertion-indicator="true"]');
        indicators.forEach(indicator => indicator.remove());
        
        // ハイライトクラスを削除
        this.selectedWordsContainer.classList.remove('insertion-highlight');
        this.availableWordsContainer.classList.remove('insertion-highlight');
    }
    
    /**
     * ドロップ処理を実行
     * @param {Object} dragData - ドラッグデータ
     * @param {string} targetType - ドロップ先タイプ
     * @param {number} insertPosition - 挿入位置
     */
    performDrop(dragData, targetType, insertPosition) {
        const { token, type: sourceType, index: sourceIndex } = dragData;
        
        // 同じエリア内での並び替えの場合
        if (sourceType === targetType) {
            if (targetType === 'selected') {
                // 回答エリア内での並び替え
                const movedToken = this.selectedWords.splice(sourceIndex, 1)[0];
                
                // 挿入位置を調整（削除により位置がずれる場合）
                let adjustedPosition = insertPosition;
                if (sourceIndex < insertPosition) {
                    adjustedPosition--;
                }
                
                this.selectedWords.splice(adjustedPosition, 0, movedToken);
                this.renderSelectedWords();
            }
            // 選択可能エリア内での並び替えは通常不要だが、将来の拡張のために残す
            return;
        }
        
        // ソースから削除
        if (sourceType === 'available') {
            this.availableWords.splice(sourceIndex, 1);
        } else {
            this.selectedWords.splice(sourceIndex, 1);
        }
        
        // ターゲットに挿入位置を考慮して追加
        if (targetType === 'available') {
            // 選択可能エリアは通常末尾に追加
            this.availableWords.push(token);
        } else {
            // 回答エリアは指定位置に挿入
            const safePosition = Math.max(0, Math.min(insertPosition, this.selectedWords.length));
            this.selectedWords.splice(safePosition, 0, token);
        }
        
        // UIを更新
        this.renderAvailableWords();
        this.renderSelectedWords();
        
        // ドロップ成功のアニメーション効果
        setTimeout(() => {
            const targetContainer = targetType === 'selected' ? 
                this.selectedWordsContainer : this.availableWordsContainer;
            const wordElements = targetContainer.querySelectorAll('.word-token');
            const targetElement = Array.from(wordElements).find(el => 
                el.textContent === token.text
            );
            
            if (targetElement) {
                targetElement.classList.add('drop-success');
                setTimeout(() => {
                    targetElement.classList.remove('drop-success');
                }, 300);
            }
        }, 10);
    }
    
    /**
     * タッチドラッグを開始
     * @param {HTMLElement} element - ドラッグ要素
     * @param {Object} token - トークン
     * @param {string} type - タイプ
     * @param {number} index - インデックス
     */
    startTouchDrag(element, token, type, index) {
        this.dragState.isDragging = true;
        this.dragState.draggedElement = element;
        
        // 触覚フィードバック（サポートされている場合）
        try {
            if (navigator.vibrate) {
                navigator.vibrate(50); // 50ms の短い振動
            }
        } catch (error) {
            // 振動APIがサポートされていない場合は無視
        }
        
        // 視覚的フィードバック
        element.classList.add('dragging');
        this.highlightDropZones();
        
        // ドラッグプレビューを表示
        this.showDragPreview(token.text);
    }
    
    /**
     * ドラッグプレビューを表示
     * @param {string} text - 表示テキスト
     */
    showDragPreview(text) {
        this.dragState.dragPreview.textContent = text;
        this.dragState.dragPreview.className = 'drag-preview word-token';
        this.dragState.dragPreview.style.display = 'block';
    }
    
    /**
     * ドラッグプレビューの位置を更新
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    updateDragPreviewPosition(x, y) {
        if (this.dragState.dragPreview) {
            this.dragState.dragPreview.style.left = (x + 10) + 'px';
            this.dragState.dragPreview.style.top = (y - 10) + 'px';
        }
    }
    
    /**
     * ドロップターゲットを更新
     * @param {HTMLElement} element - 要素
     */
    updateDropTarget(element) {
        // ドロップ可能な要素かチェック
        const dropZone = element?.closest('.available-words, .selected-words');
        this.dragState.dropTarget = dropZone;
    }
    
    /**
     * タッチドロップを実行
     * @param {HTMLElement} dropTarget - ドロップターゲット
     */
    performTouchDrop(dropTarget) {
        if (!dropTarget) return;
        
        const targetType = dropTarget.closest('.available-words') ? 'available' : 
                          dropTarget.closest('.selected-words') ? 'selected' : null;
        
        if (targetType && targetType !== this.dragState.draggedFromType) {
            const dragData = {
                token: this.dragState.draggedToken,
                type: this.dragState.draggedFromType,
                index: this.dragState.draggedFromIndex
            };
            
            this.performDrop(dragData, targetType, 0);
        }
    }
    
    /**
     * タッチドラッグを終了
     */
    endTouchDrag() {
        if (this.dragState.draggedElement) {
            this.dragState.draggedElement.classList.remove('dragging');
        }
        
        this.removeDropZoneHighlights();
        this.dragState.dragPreview.style.display = 'none';
        this.resetDragState();
    }
}