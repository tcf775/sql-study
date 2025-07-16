/**
 * UIOptimizer - UI更新の最適化クラス
 * 必要な部分のみの再描画、バッチ更新、仮想DOM的な差分更新を提供
 */
export class UIOptimizer {
    constructor() {
        this.updateQueue = new Map();
        this.isUpdating = false;
        this.observers = new Map();
        this.lastUpdateTime = 0;
        this.updateThrottle = 16; // 60fps相当
        this.elementCache = new Map();
    }

    /**
     * 要素をキャッシュに追加
     */
    cacheElement(key, selector) {
        if (!this.elementCache.has(key)) {
            const element = document.querySelector(selector);
            if (element) {
                this.elementCache.set(key, element);
            }
        }
        return this.elementCache.get(key);
    }

    /**
     * キャッシュされた要素を取得
     */
    getCachedElement(key) {
        return this.elementCache.get(key);
    }

    /**
     * UI更新をキューに追加
     */
    queueUpdate(elementKey, updateFunction, priority = 'normal') {
        const updateId = `${elementKey}_${Date.now()}`;
        
        this.updateQueue.set(updateId, {
            elementKey,
            updateFunction,
            priority,
            timestamp: Date.now()
        });

        this.scheduleUpdate();
        return updateId;
    }

    /**
     * 更新処理をスケジュール
     */
    scheduleUpdate() {
        if (this.isUpdating) return;

        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;

        if (timeSinceLastUpdate >= this.updateThrottle) {
            this.processUpdates();
        } else {
            setTimeout(() => {
                this.processUpdates();
            }, this.updateThrottle - timeSinceLastUpdate);
        }
    }

    /**
     * キューに溜まった更新を処理
     */
    processUpdates() {
        if (this.isUpdating || this.updateQueue.size === 0) return;

        this.isUpdating = true;
        this.lastUpdateTime = Date.now();

        try {
            // 優先度順にソート
            const updates = Array.from(this.updateQueue.values()).sort((a, b) => {
                const priorityOrder = { high: 3, normal: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

            // バッチ処理で更新実行
            this.executeBatchUpdates(updates);

            // キューをクリア
            this.updateQueue.clear();

        } catch (error) {
            console.error('UI更新処理エラー:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * バッチ更新を実行
     */
    executeBatchUpdates(updates) {
        // DOM読み取りフェーズ
        const readOperations = [];
        const writeOperations = [];

        updates.forEach(update => {
            try {
                const result = update.updateFunction();
                if (result && typeof result === 'object') {
                    if (result.read) readOperations.push(result.read);
                    if (result.write) writeOperations.push(result.write);
                } else if (typeof result === 'function') {
                    writeOperations.push(result);
                }
            } catch (error) {
                console.error(`UI更新エラー (${update.elementKey}):`, error);
            }
        });

        // 読み取り操作を先に実行
        readOperations.forEach(readOp => {
            try {
                readOp();
            } catch (error) {
                console.error('DOM読み取りエラー:', error);
            }
        });

        // 書き込み操作を実行
        writeOperations.forEach(writeOp => {
            try {
                writeOp();
            } catch (error) {
                console.error('DOM書き込みエラー:', error);
            }
        });
    }

    /**
     * 要素の差分更新
     */
    updateElementContent(elementKey, newContent, options = {}) {
        const element = this.getCachedElement(elementKey);
        if (!element) {
            console.warn(`要素が見つかりません: ${elementKey}`);
            return;
        }

        return this.queueUpdate(elementKey, () => {
            return {
                read: () => {
                    // 現在の内容を読み取り
                    const currentContent = options.attribute ? 
                        element.getAttribute(options.attribute) : 
                        element.innerHTML;
                    
                    // 差分チェック
                    if (currentContent === newContent) {
                        return; // 変更なしの場合はスキップ
                    }
                },
                write: () => {
                    // 内容を更新
                    if (options.attribute) {
                        element.setAttribute(options.attribute, newContent);
                    } else if (options.textContent) {
                        element.textContent = newContent;
                    } else {
                        element.innerHTML = newContent;
                    }
                }
            };
        }, options.priority || 'normal');
    }

    /**
     * 要素のスタイル更新
     */
    updateElementStyle(elementKey, styles, priority = 'normal') {
        const element = this.getCachedElement(elementKey);
        if (!element) {
            console.warn(`要素が見つかりません: ${elementKey}`);
            return;
        }

        return this.queueUpdate(elementKey, () => {
            return {
                write: () => {
                    Object.assign(element.style, styles);
                }
            };
        }, priority);
    }

    /**
     * 要素のクラス更新
     */
    updateElementClasses(elementKey, classUpdates, priority = 'normal') {
        const element = this.getCachedElement(elementKey);
        if (!element) {
            console.warn(`要素が見つかりません: ${elementKey}`);
            return;
        }

        return this.queueUpdate(elementKey, () => {
            return {
                write: () => {
                    if (classUpdates.add) {
                        classUpdates.add.forEach(cls => element.classList.add(cls));
                    }
                    if (classUpdates.remove) {
                        classUpdates.remove.forEach(cls => element.classList.remove(cls));
                    }
                    if (classUpdates.toggle) {
                        classUpdates.toggle.forEach(cls => element.classList.toggle(cls));
                    }
                }
            };
        }, priority);
    }

    /**
     * 進捗表示の最適化更新
     */
    updateProgressDisplay(courseId, progress, priority = 'high') {
        const progressBarKey = 'progress-bar';
        const progressTextKey = 'progress-text';
        const moduleListKey = 'module-list';

        // 進捗バーの更新
        this.updateElementStyle(progressBarKey, {
            width: `${progress.percentage}%`
        }, priority);

        // 進捗テキストの更新
        this.updateElementContent(progressTextKey, 
            `${progress.completedLessons}/${progress.totalLessons} レッスン完了`, 
            { textContent: true, priority }
        );

        // モジュールリストの更新（必要な場合のみ）
        if (progress.moduleUpdated) {
            this.updateModuleList(moduleListKey, progress.modules, priority);
        }
    }

    /**
     * モジュールリストの効率的更新
     */
    updateModuleList(elementKey, modules, priority = 'normal') {
        return this.queueUpdate(elementKey, () => {
            const element = this.getCachedElement(elementKey);
            if (!element) return;

            return {
                read: () => {
                    // 現在のモジュール状態を読み取り
                    const currentModules = Array.from(element.children);
                    return currentModules;
                },
                write: () => {
                    // 差分更新でモジュール状態を更新
                    modules.forEach((module, index) => {
                        const moduleElement = element.children[index];
                        if (moduleElement) {
                            const isCompleted = module.isCompleted;
                            const wasCompleted = moduleElement.classList.contains('completed');
                            
                            if (isCompleted !== wasCompleted) {
                                moduleElement.classList.toggle('completed', isCompleted);
                            }
                        }
                    });
                }
            };
        }, priority);
    }

    /**
     * コース選択画面の最適化更新
     */
    updateCourseSelection(courses, priority = 'normal') {
        const courseListKey = 'course-list';
        
        return this.queueUpdate(courseListKey, () => {
            const element = this.getCachedElement(courseListKey);
            if (!element) return;

            return {
                write: () => {
                    // 仮想DOM的な差分更新
                    const fragment = document.createDocumentFragment();
                    
                    courses.forEach(course => {
                        const courseCard = this.createCourseCardElement(course);
                        fragment.appendChild(courseCard);
                    });
                    
                    // 一括更新
                    element.innerHTML = '';
                    element.appendChild(fragment);
                }
            };
        }, priority);
    }

    /**
     * コースカード要素を作成（最適化版）
     */
    createCourseCardElement(course) {
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="course-card" data-course-id="${course.id}">
                <div class="course-header">
                    <div class="course-icon">${this.getCourseIcon(course.id)}</div>
                    <div class="course-title-section">
                        <h3>${course.title}</h3>
                        <span class="course-difficulty">${course.difficulty}</span>
                    </div>
                </div>
                <div class="course-description">${course.description}</div>
                <div class="course-actions">
                    <button class="course-select-btn" data-course-id="${course.id}">
                        コースを開始
                    </button>
                </div>
            </div>
        `;
        return template.content.firstElementChild;
    }

    /**
     * コースアイコンを取得
     */
    getCourseIcon(courseId) {
        const icons = {
            'sql-basics': '📊',
            'db-fundamentals': '🗄️',
            'big-data-basics': '🚀'
        };
        return icons[courseId] || '📚';
    }

    /**
     * 要素の可視性チェック（Intersection Observer使用）
     */
    observeElementVisibility(elementKey, callback) {
        const element = this.getCachedElement(elementKey);
        if (!element) return;

        if (!this.observers.has(elementKey)) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    callback(entry.isIntersecting, entry);
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });

            observer.observe(element);
            this.observers.set(elementKey, observer);
        }
    }

    /**
     * 遅延読み込み要素の管理
     */
    setupLazyLoading(elementKey, loadCallback) {
        this.observeElementVisibility(elementKey, (isVisible) => {
            if (isVisible) {
                loadCallback();
                // 一度読み込んだら監視を停止
                const observer = this.observers.get(elementKey);
                if (observer) {
                    observer.disconnect();
                    this.observers.delete(elementKey);
                }
            }
        });
    }

    /**
     * パフォーマンス統計を取得
     */
    getPerformanceStats() {
        return {
            queueSize: this.updateQueue.size,
            cachedElements: this.elementCache.size,
            activeObservers: this.observers.size,
            lastUpdateTime: this.lastUpdateTime,
            isUpdating: this.isUpdating
        };
    }

    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.elementCache.clear();
        this.updateQueue.clear();
        
        // Observerを停止
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        console.log('UIOptimizerのキャッシュをクリアしました');
    }

    /**
     * 初期化処理
     */
    initialize() {
        // 主要な要素をキャッシュ
        this.cacheElement('course-list', '#course-list');
        this.cacheElement('progress-bar', '.course-progress-fill');
        this.cacheElement('progress-text', '.progress-text');
        this.cacheElement('module-list', '.module-list');
        this.cacheElement('course-selection-screen', '#course-selection-screen');
        this.cacheElement('app-layout', '.app-layout');
        
        console.log('UIOptimizerが初期化されました');
    }
}