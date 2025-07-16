/**
 * CourseUI - コース選択UIの管理クラス
 * コース選択画面の表示、コース情報の表示、コース選択処理を担当
 */
export class CourseUI {
    constructor(courseManager, gameEngine) {
        this.courseManager = courseManager;
        this.gameEngine = gameEngine;
        this.elements = {
            courseSelectionScreen: document.getElementById('course-selection-screen'),
            courseList: document.getElementById('course-list'),
            appLayout: document.querySelector('.app-layout')
        };
        
        // UIOptimizerを初期化
        this.uiOptimizer = null;
        this.initializeUIOptimizer();
        
        this.bindEvents();
    }

    /**
     * UIOptimizerを初期化
     */
    async initializeUIOptimizer() {
        try {
            const { UIOptimizer } = await import('./ui-optimizer.js');
            this.uiOptimizer = new UIOptimizer();
            this.uiOptimizer.initialize();
            console.log('CourseUI: UIOptimizerが初期化されました');
        } catch (error) {
            console.warn('UIOptimizerの読み込みに失敗しました:', error);
        }
    }

    /**
     * イベントリスナーを設定
     */
    bindEvents() {
        // 必要に応じてイベントリスナーを追加
    }

    /**
     * コース選択画面を表示
     */
    showCourseSelection() {
        if (!this.courseManager.isInitialized()) {
            console.error('CourseManagerが初期化されていません');
            return;
        }

        const courses = this.courseManager.getCourses();
        this.renderCourseList(courses);
        
        // コース選択画面を表示し、メインアプリを非表示
        this.elements.courseSelectionScreen.classList.remove('hidden');
        this.elements.appLayout.style.display = 'none';
    }

    /**
     * コース選択画面を非表示
     */
    hideCourseSelection() {
        this.elements.courseSelectionScreen.classList.add('hidden');
        this.elements.appLayout.style.display = 'flex';
    }

    /**
     * コース一覧を描画（最適化版）
     */
    renderCourseList(courses) {
        if (!courses || courses.length === 0) {
            this.elements.courseList.innerHTML = '<p>利用可能なコースがありません</p>';
            return;
        }

        // UIOptimizerが利用可能な場合は最適化された更新を使用
        if (this.uiOptimizer) {
            this.uiOptimizer.updateCourseSelection(courses, 'high');
            
            // イベントリスナーを遅延設定
            setTimeout(() => {
                this.bindCourseSelectionEvents();
            }, 50);
        } else {
            // フォールバック: 従来の方法
            const courseCards = courses.map(course => this.createCourseCard(course)).join('');
            this.elements.courseList.innerHTML = courseCards;
            this.bindCourseSelectionEvents();
        }
    }

    /**
     * コースカードのHTMLを生成
     */
    createCourseCard(course) {
        const isComingSoon = course.status === 'coming_soon';
        const progress = !isComingSoon ? this.courseManager.getCourseProgress(course.id) : null;
        const progressPercentage = progress ? this.calculateProgressPercentage(course, progress) : 0;
        const isStarted = progress && progress.completedLessons.length > 0;
        
        const courseIcon = this.getCourseIcon(course.id);
        const difficultyClass = this.getDifficultyClass(course.difficulty);
        
        // モジュール情報を生成
        const modulesList = course.modules.map(module => {
            const isCompleted = progress && progress.completedModules.includes(module.id);
            return `<span class="course-module-tag ${isCompleted ? 'completed' : ''}">${module.title}</span>`;
        }).join('');

        return `
            <div class="course-card ${isComingSoon ? 'coming-soon' : ''}" data-course-id="${course.id}">
                <div class="course-header">
                    <div class="course-icon">${courseIcon}</div>
                    <div class="course-title-section">
                        <h3>${course.title}</h3>
                        <span class="course-difficulty ${difficultyClass}">${course.difficulty}</span>
                        ${isComingSoon ? '<span class="coming-soon-badge">準備中</span>' : ''}
                    </div>
                </div>
                
                <div class="course-description">
                    ${course.description}
                    ${isComingSoon ? '<br><br><strong>🚧 このコースは現在準備中です。近日公開予定です。</strong>' : ''}
                </div>
                
                <div class="course-meta">
                    <div class="course-meta-item">
                        <span class="course-meta-icon">👥</span>
                        <span>${course.targetAudience}</span>
                    </div>
                    <div class="course-meta-item">
                        <span class="course-meta-icon">⏱️</span>
                        <span>${course.estimatedHours}時間</span>
                    </div>
                </div>
                
                ${!isComingSoon && progressPercentage > 0 ? `
                <div class="course-progress">
                    <div class="course-progress-header">
                        <span class="course-progress-label">進捗</span>
                        <span class="course-progress-percentage">${progressPercentage}%</span>
                    </div>
                    <div class="course-progress-bar">
                        <div class="course-progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
                ` : ''}
                
                <div class="course-modules">
                    <div class="course-modules-header">
                        <span>📚</span>
                        <span>モジュール (${course.modules.length})</span>
                    </div>
                    <div class="course-modules-list">
                        ${modulesList}
                    </div>
                </div>
                
                <div class="course-actions">
                    ${isComingSoon ? `
                        <button class="course-select-btn disabled" disabled>
                            🚧 準備中
                        </button>
                        <button class="course-info-btn" data-course-id="${course.id}" title="詳細情報">
                            ℹ️
                        </button>
                    ` : `
                        <button class="course-select-btn ${isStarted ? 'continue' : ''}" data-course-id="${course.id}">
                            ${isStarted ? '続きから学習' : 'コースを開始'}
                        </button>
                        <button class="course-info-btn" data-course-id="${course.id}" title="詳細情報">
                            ℹ️
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * コース選択ボタンのイベントリスナーを設定
     */
    bindCourseSelectionEvents() {
        // コース選択ボタン
        const selectButtons = document.querySelectorAll('.course-select-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const courseId = button.dataset.courseId;
                this.selectCourse(courseId);
            });
        });

        // コース情報ボタン
        const infoButtons = document.querySelectorAll('.course-info-btn');
        infoButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const courseId = button.dataset.courseId;
                this.showCourseInfo(courseId);
            });
        });

        // コースカード全体のクリック
        const courseCards = document.querySelectorAll('.course-card');
        courseCards.forEach(card => {
            card.addEventListener('click', () => {
                const courseId = card.dataset.courseId;
                this.selectCourse(courseId);
            });
        });
    }

    /**
     * コースを選択して学習を開始（最適化版）
     */
    async selectCourse(courseId) {
        try {
            // ローディング状態を表示
            this.showCourseLoadingState(courseId);
            
            // コースを取得
            const course = this.courseManager.getCourse(courseId);
            
            // 準備中のコースかチェック
            if (course.status === 'coming_soon') {
                alert('このコースは現在準備中です。近日公開予定です。');
                this.hideCourseLoadingState();
                return;
            }
            
            // コースを選択（遅延読み込み対応）
            const selectedCourse = await this.courseManager.selectCourse(courseId);
            console.log(`コースを選択しました: ${selectedCourse.title}`);

            // GameEngineにコースを設定
            if (this.gameEngine && typeof this.gameEngine.setCourse === 'function') {
                await this.gameEngine.setCourse(course);
            }

            // コース選択画面を非表示にしてメイン画面を表示
            this.hideCourseSelection();

            // UIControllerに現在のコースを通知
            if (window.uiController && typeof window.uiController.onCourseSelected === 'function') {
                window.uiController.onCourseSelected(course);
            }

            // ProgressUIに現在のコースを通知
            if (window.progressUI && typeof window.progressUI.onCourseSelected === 'function') {
                window.progressUI.onCourseSelected(course);
            }

            // チャレンジを更新（非同期で実行）
            if (window.uiController && typeof window.uiController.updateChallenge === 'function') {
                // UI更新を次のフレームで実行
                requestAnimationFrame(() => {
                    window.uiController.updateChallenge();
                });
            }

            this.hideCourseLoadingState();

        } catch (error) {
            console.error('コース選択エラー:', error);
            this.hideCourseLoadingState();
            alert(`コース選択に失敗しました: ${error.message}`);
        }
    }

    /**
     * コース読み込み状態を表示
     */
    showCourseLoadingState(courseId) {
        const courseCard = document.querySelector(`[data-course-id="${courseId}"]`);
        if (courseCard) {
            const selectBtn = courseCard.querySelector('.course-select-btn');
            if (selectBtn) {
                selectBtn.disabled = true;
                selectBtn.textContent = '読み込み中...';
            }
        }
    }

    /**
     * コース読み込み状態を非表示
     */
    hideCourseLoadingState() {
        const selectBtns = document.querySelectorAll('.course-select-btn');
        selectBtns.forEach(btn => {
            btn.disabled = false;
            const courseId = btn.dataset.courseId;
            const course = this.courseManager.getCourse(courseId);
            const progress = this.courseManager.getCourseProgress(courseId);
            const isStarted = progress && progress.completedLessons.length > 0;
            btn.textContent = isStarted ? '続きから学習' : 'コースを開始';
        });
    }

    /**
     * コース詳細情報を表示
     */
    showCourseInfo(courseId) {
        const course = this.courseManager.getCourse(courseId);
        if (!course) {
            console.error(`コースが見つかりません: ${courseId}`);
            return;
        }

        const progress = this.courseManager.getCourseProgress(courseId);
        const progressPercentage = progress ? this.calculateProgressPercentage(course, progress) : 0;

        // モジュール詳細情報を生成
        const moduleDetails = course.modules.map(module => {
            const isCompleted = progress && progress.completedModules.includes(module.id);
            const completedLessons = progress ? module.lessons.filter(lessonId => 
                progress.completedLessons.includes(lessonId)
            ).length : 0;
            
            return `
                <div class="module-detail ${isCompleted ? 'completed' : ''}">
                    <h4>${module.title} ${isCompleted ? '✅' : ''}</h4>
                    <p>${module.description}</p>
                    <div class="module-progress">
                        レッスン進捗: ${completedLessons}/${module.lessons.length}
                    </div>
                    ${module.prerequisites.length > 0 ? 
                        `<div class="module-prerequisites">前提条件: ${module.prerequisites.join(', ')}</div>` : 
                        ''
                    }
                </div>
            `;
        }).join('');

        const infoHtml = `
            <div class="course-info-modal">
                <div class="course-info-content">
                    <div class="course-info-header">
                        <h2>${course.title}</h2>
                        <button class="course-info-close">×</button>
                    </div>
                    
                    <div class="course-info-body">
                        <div class="course-overview">
                            <p><strong>対象者:</strong> ${course.targetAudience}</p>
                            <p><strong>難易度:</strong> ${course.difficulty}</p>
                            <p><strong>推定時間:</strong> ${course.estimatedHours}時間</p>
                            <p><strong>進捗:</strong> ${progressPercentage}%</p>
                        </div>
                        
                        <div class="course-description-full">
                            <h3>コース概要</h3>
                            <p>${course.description}</p>
                        </div>
                        
                        <div class="course-modules-detail">
                            <h3>モジュール詳細</h3>
                            ${moduleDetails}
                        </div>
                    </div>
                    
                    <div class="course-info-actions">
                        <button class="course-select-btn" data-course-id="${courseId}">
                            ${progress && progress.completedLessons.length > 0 ? '続きから学習' : 'コースを開始'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // モーダルを表示
        const modal = document.createElement('div');
        modal.className = 'course-info-overlay';
        modal.innerHTML = infoHtml;
        document.body.appendChild(modal);

        // モーダルのイベントリスナー
        const closeBtn = modal.querySelector('.course-info-close');
        const selectBtn = modal.querySelector('.course-select-btn');
        
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        selectBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.selectCourse(courseId);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * 進捗パーセンテージを計算
     */
    calculateProgressPercentage(course, progress) {
        if (!progress || !course.modules) return 0;
        
        const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
        const completedLessons = progress.completedLessons.length;
        
        return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
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
     * 難易度クラスを取得
     */
    getDifficultyClass(difficulty) {
        const difficultyMap = {
            '初級': 'beginner',
            '中級': 'intermediate', 
            '上級': 'advanced'
        };
        return difficultyMap[difficulty] || 'beginner';
    }

    /**
     * 初回アクセス時の処理
     */
    handleFirstTimeAccess() {
        // 選択されたコースがない場合はコース選択画面を表示
        const currentCourse = this.courseManager.getCurrentCourse();
        if (!currentCourse) {
            this.showCourseSelection();
            return true;
        }
        return false;
    }

    /**
     * コース切り替え処理
     */
    switchCourse() {
        this.showCourseSelection();
    }

    /**
     * コース完了時の処理
     */
    onCourseCompleted(completionResult) {
        console.log('コース完了イベントを受信:', completionResult);
        this.showCourseCompletionModal(completionResult);
    }

    /**
     * コース完了モーダルを表示
     */
    showCourseCompletionModal(completionResult) {
        const modal = this.createCourseCompletionModal(completionResult);
        document.body.appendChild(modal);
        
        // モーダル表示アニメーション
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // 自動的に祝福エフェクトを表示
        this.showCelebrationEffect();
    }

    /**
     * コース完了モーダルのHTMLを生成
     */
    createCourseCompletionModal(completionResult) {
        const { courseTitle, stats, certificate, recommendedCourses, achievements } = completionResult;
        
        // 達成バッジのHTML生成
        const achievementBadges = achievements.map(achievement => `
            <div class="achievement-badge">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
        `).join('');

        // 推奨コースのHTML生成
        const recommendedCoursesHtml = recommendedCourses.length > 0 ? `
            <div class="completion-section">
                <h3>🎯 次のステップ</h3>
                <div class="recommended-courses">
                    ${recommendedCourses.map(course => `
                        <div class="recommended-course" data-course-id="${course.courseId}">
                            <div class="recommended-course-header">
                                <h4>${course.title}</h4>
                                <span class="course-difficulty ${this.getDifficultyClass(course.difficulty)}">${course.difficulty}</span>
                            </div>
                            <p class="recommended-course-description">${course.description}</p>
                            <p class="recommended-course-reason">${course.reason}</p>
                            <div class="recommended-course-meta">
                                <span>⏱️ ${course.estimatedHours}時間</span>
                                <span class="course-priority priority-${course.priority}">${course.priority === 'high' ? '推奨' : '関連'}</span>
                            </div>
                            <button class="recommended-course-btn" data-course-id="${course.courseId}">
                                このコースを開始
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        // 効率性の表示テキスト
        const efficiencyText = {
            'excellent': '優秀',
            'good': '良好', 
            'average': '平均',
            'needs_improvement': '要改善'
        };

        const modalHtml = `
            <div class="course-completion-overlay">
                <div class="course-completion-modal">
                    <div class="completion-header">
                        <div class="completion-celebration">🎉</div>
                        <h2>おめでとうございます！</h2>
                        <h3>${courseTitle} を完了しました</h3>
                        <div class="completion-date">
                            完了日: ${new Date(completionResult.completedAt).toLocaleDateString('ja-JP')}
                        </div>
                    </div>

                    <div class="completion-body">
                        <!-- 学習統計 -->
                        <div class="completion-section">
                            <h3>📊 学習統計</h3>
                            <div class="completion-stats">
                                <div class="stat-item">
                                    <div class="stat-value">${stats.totalLessons}</div>
                                    <div class="stat-label">完了レッスン</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${stats.totalModules}</div>
                                    <div class="stat-label">完了モジュール</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${stats.averageScore}</div>
                                    <div class="stat-label">平均スコア</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${stats.studyDuration}</div>
                                    <div class="stat-label">学習日数</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${efficiencyText[stats.efficiency]}</div>
                                    <div class="stat-label">学習効率</div>
                                </div>
                            </div>
                        </div>

                        <!-- 達成バッジ -->
                        ${achievements.length > 0 ? `
                        <div class="completion-section">
                            <h3>🏆 獲得バッジ</h3>
                            <div class="achievement-badges">
                                ${achievementBadges}
                            </div>
                        </div>
                        ` : ''}

                        <!-- 習得スキル -->
                        ${certificate.skills.length > 0 ? `
                        <div class="completion-section">
                            <h3>💡 習得スキル</h3>
                            <div class="acquired-skills">
                                ${certificate.skills.map(skill => `
                                    <span class="skill-tag">✓ ${skill}</span>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- 推奨コース -->
                        ${recommendedCoursesHtml}
                    </div>

                    <div class="completion-actions">
                        <button class="completion-btn primary" id="view-certificate-btn">
                            📜 修了証明書を表示
                        </button>
                        <button class="completion-btn secondary" id="continue-learning-btn">
                            📚 他のコースを見る
                        </button>
                        <button class="completion-btn tertiary" id="close-completion-btn">
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'course-completion-container';
        modal.innerHTML = modalHtml;

        // イベントリスナーを設定
        this.bindCompletionModalEvents(modal, completionResult);

        return modal;
    }

    /**
     * コース完了モーダルのイベントリスナーを設定
     */
    bindCompletionModalEvents(modal, completionResult) {
        // 修了証明書表示ボタン
        const certificateBtn = modal.querySelector('#view-certificate-btn');
        if (certificateBtn) {
            certificateBtn.addEventListener('click', () => {
                this.showCourseCertificate(completionResult.certificate);
            });
        }

        // 他のコースを見るボタン
        const continueBtn = modal.querySelector('#continue-learning-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.closeCompletionModal(modal);
                this.showCourseSelection();
            });
        }

        // 閉じるボタン
        const closeBtn = modal.querySelector('#close-completion-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeCompletionModal(modal);
            });
        }

        // 推奨コース選択ボタン
        const recommendedBtns = modal.querySelectorAll('.recommended-course-btn');
        recommendedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const courseId = btn.dataset.courseId;
                this.closeCompletionModal(modal);
                this.selectCourse(courseId);
            });
        });

        // オーバーレイクリックで閉じる
        const overlay = modal.querySelector('.course-completion-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeCompletionModal(modal);
                }
            });
        }
    }

    /**
     * コース完了モーダルを閉じる
     */
    closeCompletionModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
        }, 300);
    }

    /**
     * 修了証明書を表示
     */
    showCourseCertificate(certificate) {
        const certificateModal = this.createCertificateModal(certificate);
        document.body.appendChild(certificateModal);
        
        setTimeout(() => {
            certificateModal.classList.add('show');
        }, 10);
    }

    /**
     * 修了証明書モーダルのHTMLを生成
     */
    createCertificateModal(certificate) {
        const completedDate = new Date(certificate.completedAt).toLocaleDateString('ja-JP');
        
        const certificateHtml = `
            <div class="certificate-overlay">
                <div class="certificate-modal">
                    <div class="certificate-header">
                        <button class="certificate-close">×</button>
                    </div>
                    
                    <div class="certificate-content">
                        <div class="certificate-border">
                            <div class="certificate-inner">
                                <div class="certificate-title">
                                    <h1>修了証明書</h1>
                                    <div class="certificate-subtitle">Certificate of Completion</div>
                                </div>
                                
                                <div class="certificate-body">
                                    <div class="certificate-text">
                                        これは以下のコースを修了したことを証明します
                                    </div>
                                    
                                    <div class="certificate-course-title">
                                        ${certificate.courseTitle}
                                    </div>
                                    
                                    <div class="certificate-course-description">
                                        ${certificate.courseDescription}
                                    </div>
                                    
                                    <div class="certificate-details">
                                        <div class="certificate-detail-row">
                                            <span class="detail-label">難易度:</span>
                                            <span class="detail-value">${certificate.difficulty}</span>
                                        </div>
                                        <div class="certificate-detail-row">
                                            <span class="detail-label">推定学習時間:</span>
                                            <span class="detail-value">${certificate.estimatedHours}時間</span>
                                        </div>
                                        <div class="certificate-detail-row">
                                            <span class="detail-label">実際の学習期間:</span>
                                            <span class="detail-value">${certificate.studyDuration}日</span>
                                        </div>
                                        <div class="certificate-detail-row">
                                            <span class="detail-label">平均スコア:</span>
                                            <span class="detail-value">${certificate.averageScore}点</span>
                                        </div>
                                        <div class="certificate-detail-row">
                                            <span class="detail-label">完了日:</span>
                                            <span class="detail-value">${completedDate}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="certificate-skills">
                                        <h3>習得スキル</h3>
                                        <div class="certificate-skills-list">
                                            ${certificate.skills.map(skill => `
                                                <div class="certificate-skill">• ${skill}</div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="certificate-footer">
                                    <div class="certificate-issuer">
                                        <div class="issuer-name">${certificate.issuer}</div>
                                        <div class="validation-code">検証コード: ${certificate.validationCode}</div>
                                    </div>
                                    <div class="certificate-seal">🏆</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="certificate-actions">
                        <button class="certificate-btn download" id="download-certificate-btn">
                            💾 証明書をダウンロード
                        </button>
                        <button class="certificate-btn share" id="share-certificate-btn">
                            📤 証明書を共有
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'certificate-container';
        modal.innerHTML = certificateHtml;

        // イベントリスナーを設定
        this.bindCertificateModalEvents(modal, certificate);

        return modal;
    }

    /**
     * 修了証明書モーダルのイベントリスナーを設定
     */
    bindCertificateModalEvents(modal, certificate) {
        // 閉じるボタン
        const closeBtn = modal.querySelector('.certificate-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeCertificateModal(modal);
            });
        }

        // ダウンロードボタン
        const downloadBtn = modal.querySelector('#download-certificate-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadCertificate(certificate);
            });
        }

        // 共有ボタン
        const shareBtn = modal.querySelector('#share-certificate-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareCertificate(certificate);
            });
        }

        // オーバーレイクリックで閉じる
        const overlay = modal.querySelector('.certificate-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeCertificateModal(modal);
                }
            });
        }
    }

    /**
     * 修了証明書モーダルを閉じる
     */
    closeCertificateModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
        }, 300);
    }

    /**
     * 修了証明書をダウンロード
     */
    downloadCertificate(certificate) {
        // 簡単なテキスト形式での証明書ダウンロード
        const certificateText = `
修了証明書
Certificate of Completion

コース名: ${certificate.courseTitle}
完了日: ${new Date(certificate.completedAt).toLocaleDateString('ja-JP')}
学習期間: ${certificate.studyDuration}日
平均スコア: ${certificate.averageScore}点
検証コード: ${certificate.validationCode}

習得スキル:
${certificate.skills.map(skill => `• ${skill}`).join('\n')}

発行者: ${certificate.issuer}
        `.trim();

        const blob = new Blob([certificateText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificate.certificateId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('修了証明書をダウンロードしました');
    }

    /**
     * 修了証明書を共有
     */
    shareCertificate(certificate) {
        const shareText = `${certificate.courseTitle}を完了しました！🎉\n平均スコア: ${certificate.averageScore}点\n検証コード: ${certificate.validationCode}`;
        
        if (navigator.share) {
            navigator.share({
                title: '修了証明書',
                text: shareText,
                url: window.location.href
            }).catch(err => console.log('共有エラー:', err));
        } else {
            // フォールバック: クリップボードにコピー
            navigator.clipboard.writeText(shareText).then(() => {
                alert('修了証明書の情報をクリップボードにコピーしました！');
            }).catch(err => {
                console.error('クリップボードコピーエラー:', err);
                alert('共有機能は利用できません');
            });
        }
    }

    /**
     * 祝福エフェクトを表示
     */
    showCelebrationEffect() {
        // 簡単な祝福エフェクト（紙吹雪風）
        const celebrationContainer = document.createElement('div');
        celebrationContainer.className = 'celebration-effect';
        celebrationContainer.innerHTML = `
            <div class="confetti">🎉</div>
            <div class="confetti">🎊</div>
            <div class="confetti">✨</div>
            <div class="confetti">🌟</div>
            <div class="confetti">🎈</div>
        `;
        
        document.body.appendChild(celebrationContainer);
        
        // 3秒後に削除
        setTimeout(() => {
            if (celebrationContainer.parentNode) {
                document.body.removeChild(celebrationContainer);
            }
        }, 3000);
    }
}