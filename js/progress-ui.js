/**
 * ProgressUI - 進捗表示UIの管理クラス
 * 進捗インジケーター、モジュール構造表示、レッスン完了状態の可視化を担当
 */
export class ProgressUI {
    constructor(courseManager, gameEngine) {
        this.courseManager = courseManager;
        this.gameEngine = gameEngine;
        this.isVisible = false;
        this.currentCourse = null;
        this.currentProgress = null;
        
        this.elements = {
            progressPanel: document.getElementById('progress-panel'),
            toggleButton: document.getElementById('toggle-progress-panel'),
            showProgressBtn: document.getElementById('show-progress-btn'),
            
            // コース進捗要素
            currentCourseName: document.getElementById('current-course-name'),
            courseProgressPercentage: document.getElementById('course-progress-percentage'),
            courseProgressFill: document.getElementById('course-progress-fill'),
            completedLessonsCount: document.getElementById('completed-lessons-count'),
            totalLessonsCount: document.getElementById('total-lessons-count'),
            
            // モジュール進捗要素
            modulesList: document.getElementById('modules-list'),
            
            // 現在のレッスン要素
            currentModuleName: document.getElementById('current-module-name'),
            currentLessonName: document.getElementById('current-lesson-name'),
            prevLessonBtn: document.getElementById('prev-lesson-btn'),
            nextLessonBtn: document.getElementById('next-lesson-btn'),
            
            // 統計要素
            totalScore: document.getElementById('total-score'),
            learningDays: document.getElementById('learning-days'),
            completedModulesCount: document.getElementById('completed-modules-count')
        };
        
        this.bindEvents();
    }

    /**
     * イベントリスナーを設定
     */
    bindEvents() {
        // パネル表示切り替え（ヘッダーボタン）
        if (this.elements.showProgressBtn) {
            this.elements.showProgressBtn.addEventListener('click', () => {
                this.togglePanel();
            });
        }
        
        // パネル表示切り替え（パネル内ボタン）
        if (this.elements.toggleButton) {
            this.elements.toggleButton.addEventListener('click', () => {
                this.togglePanel();
            });
        }
        
        // レッスンナビゲーション
        if (this.elements.prevLessonBtn) {
            this.elements.prevLessonBtn.addEventListener('click', () => {
                this.navigateToPreviousLesson();
            });
        }
        
        if (this.elements.nextLessonBtn) {
            this.elements.nextLessonBtn.addEventListener('click', () => {
                this.navigateToNextLesson();
            });
        }
    }

    /**
     * 進捗パネルの表示/非表示を切り替え
     */
    togglePanel() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    }

    /**
     * 進捗パネルを表示
     */
    showPanel() {
        if (this.elements.progressPanel) {
            this.elements.progressPanel.classList.remove('hidden');
            this.isVisible = true;
            
            // 現在のコースがある場合は進捗を更新
            if (this.currentCourse) {
                this.updateProgressDisplay();
            }
        }
    }

    /**
     * 進捗パネルを非表示
     */
    hidePanel() {
        if (this.elements.progressPanel) {
            this.elements.progressPanel.classList.add('hidden');
            this.isVisible = false;
        }
    }

    /**
     * コースが選択された時の処理
     */
    onCourseSelected(course) {
        this.currentCourse = course;
        this.currentProgress = this.courseManager.getCourseProgress(course.id);
        
        if (this.isVisible) {
            this.updateProgressDisplay();
        }
        
        // パネルを自動表示
        this.showPanel();
    }

    /**
     * 進捗表示を更新
     */
    updateProgressDisplay() {
        if (!this.currentCourse || !this.currentProgress) {
            return;
        }
        
        this.updateCourseProgress();
        this.updateModulesProgress();
        this.updateCurrentLessonInfo();
        this.updateLearningStats();
    }

    /**
     * コース全体の進捗を更新
     */
    updateCourseProgress() {
        const course = this.currentCourse;
        const progress = this.currentProgress;
        
        // コース名を設定
        if (this.elements.currentCourseName) {
            this.elements.currentCourseName.textContent = course.title;
        }
        
        // 総レッスン数を計算
        const totalLessons = course.modules.reduce((total, module) => 
            total + module.lessons.length, 0
        );
        
        const completedLessons = progress.completedLessons.length;
        const progressPercentage = totalLessons > 0 ? 
            Math.round((completedLessons / totalLessons) * 100) : 0;
        
        // 進捗パーセンテージを更新
        if (this.elements.courseProgressPercentage) {
            this.elements.courseProgressPercentage.textContent = `${progressPercentage}%`;
        }
        
        // 進捗バーを更新
        if (this.elements.courseProgressFill) {
            this.elements.courseProgressFill.style.width = `${progressPercentage}%`;
        }
        
        // レッスン数を更新
        if (this.elements.completedLessonsCount) {
            this.elements.completedLessonsCount.textContent = completedLessons;
        }
        if (this.elements.totalLessonsCount) {
            this.elements.totalLessonsCount.textContent = totalLessons;
        }
    }

    /**
     * モジュール進捗を更新
     */
    updateModulesProgress() {
        const course = this.currentCourse;
        const progress = this.currentProgress;
        
        if (!this.elements.modulesList) return;
        
        const modulesHtml = course.modules.map(module => {
            const completedLessons = module.lessons.filter(lessonId => 
                progress.completedLessons.includes(lessonId)
            ).length;
            
            const totalLessons = module.lessons.length;
            const moduleProgress = totalLessons > 0 ? 
                Math.round((completedLessons / totalLessons) * 100) : 0;
            
            const isCompleted = progress.completedModules.includes(module.id);
            const isCurrent = this.isCurrentModule(module.id);
            
            const moduleClasses = [
                'module-item',
                isCompleted ? 'completed' : '',
                isCurrent ? 'current' : ''
            ].filter(Boolean).join(' ');
            
            const statusIcon = isCompleted ? '✅' : 
                             isCurrent ? '📍' : '⏳';
            
            // レッスンドットを生成
            const lessonDots = module.lessons.map(lessonId => {
                const isLessonCompleted = progress.completedLessons.includes(lessonId);
                const isCurrentLesson = this.isCurrentLesson(lessonId);
                
                const dotClasses = [
                    'lesson-dot',
                    isLessonCompleted ? 'completed' : '',
                    isCurrentLesson ? 'current' : ''
                ].filter(Boolean).join(' ');
                
                return `<div class="${dotClasses}" data-lesson-id="${lessonId}" data-lesson-name="${lessonId}"></div>`;
            }).join('');
            
            return `
                <div class="${moduleClasses}" data-module-id="${module.id}">
                    <div class="module-header">
                        <div class="module-title">
                            <span class="module-status">${statusIcon}</span>
                            ${module.title}
                        </div>
                    </div>
                    <div class="module-progress">
                        <span class="module-progress-text">${completedLessons}/${totalLessons}</span>
                        <div class="module-progress-bar">
                            <div class="progress-fill" style="width: ${moduleProgress}%"></div>
                        </div>
                        <span class="module-progress-text">${moduleProgress}%</span>
                    </div>
                    <div class="module-lessons">
                        ${lessonDots}
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.modulesList.innerHTML = modulesHtml;
        
        // レッスンドットのクリックイベントを設定
        this.bindLessonDotEvents();
    }

    /**
     * 現在のレッスン情報を更新
     */
    updateCurrentLessonInfo() {
        const nextLesson = this.courseManager.getNextLesson(this.currentCourse.id);
        
        if (nextLesson) {
            // 現在のモジュール名を設定
            if (this.elements.currentModuleName) {
                this.elements.currentModuleName.textContent = nextLesson.moduleTitle;
            }
            
            // 現在のレッスン名を設定
            if (this.elements.currentLessonName) {
                this.elements.currentLessonName.textContent = nextLesson.lessonId;
            }
        } else {
            // 全レッスン完了の場合
            if (this.elements.currentModuleName) {
                this.elements.currentModuleName.textContent = 'コース完了';
            }
            if (this.elements.currentLessonName) {
                this.elements.currentLessonName.textContent = 'おめでとうございます！';
            }
        }
        
        // ナビゲーションボタンの状態を更新
        this.updateNavigationButtons();
    }

    /**
     * 学習統計を更新
     */
    updateLearningStats() {
        const stats = this.courseManager.getProgressStats(this.currentCourse.id);
        
        if (stats) {
            // 総スコア
            if (this.elements.totalScore) {
                this.elements.totalScore.textContent = stats.totalScore.toLocaleString();
            }
            
            // 学習日数
            if (this.elements.learningDays) {
                this.elements.learningDays.textContent = stats.daysActive;
            }
            
            // 完了モジュール数
            if (this.elements.completedModulesCount) {
                this.elements.completedModulesCount.textContent = stats.completedModulesCount;
            }
        }
    }

    /**
     * ナビゲーションボタンの状態を更新
     */
    updateNavigationButtons() {
        // 前のレッスンボタン
        const hasPreviousLesson = this.currentProgress.completedLessons.length > 0;
        if (this.elements.prevLessonBtn) {
            this.elements.prevLessonBtn.disabled = !hasPreviousLesson;
        }
        
        // 次のレッスンボタン
        const nextLesson = this.courseManager.getNextLesson(this.currentCourse.id);
        if (this.elements.nextLessonBtn) {
            this.elements.nextLessonBtn.disabled = !nextLesson;
        }
    }

    /**
     * レッスンドットのクリックイベントを設定
     */
    bindLessonDotEvents() {
        const lessonDots = this.elements.modulesList.querySelectorAll('.lesson-dot');
        lessonDots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                const lessonId = dot.dataset.lessonId;
                this.navigateToLesson(lessonId);
            });
        });
    }

    /**
     * 指定されたレッスンに移動
     */
    navigateToLesson(lessonId) {
        // レッスンがアンロックされているかチェック
        if (!this.courseManager.isLessonUnlocked(this.currentCourse.id, lessonId)) {
            alert('このレッスンはまだアンロックされていません。');
            return;
        }
        
        // GameEngineに現在のレッスンを設定
        if (this.gameEngine && typeof this.gameEngine.setCurrentLesson === 'function') {
            this.gameEngine.setCurrentLesson(lessonId);
        }
        
        // UIControllerにレッスン変更を通知
        if (window.uiController && typeof window.uiController.updateChallenge === 'function') {
            window.uiController.updateChallenge();
        }
    }

    /**
     * 前のレッスンに移動
     */
    navigateToPreviousLesson() {
        const completedLessons = this.currentProgress.completedLessons;
        if (completedLessons.length > 0) {
            const previousLessonId = completedLessons[completedLessons.length - 1];
            this.navigateToLesson(previousLessonId);
        }
    }

    /**
     * 次のレッスンに移動
     */
    navigateToNextLesson() {
        const nextLesson = this.courseManager.getNextLesson(this.currentCourse.id);
        if (nextLesson) {
            this.navigateToLesson(nextLesson.lessonId);
        }
    }

    /**
     * 指定されたモジュールが現在のモジュールかチェック
     */
    isCurrentModule(moduleId) {
        const nextLesson = this.courseManager.getNextLesson(this.currentCourse.id);
        return nextLesson && nextLesson.moduleId === moduleId;
    }

    /**
     * 指定されたレッスンが現在のレッスンかチェック
     */
    isCurrentLesson(lessonId) {
        const nextLesson = this.courseManager.getNextLesson(this.currentCourse.id);
        return nextLesson && nextLesson.lessonId === lessonId;
    }

    /**
     * 進捗が更新された時の処理
     */
    onProgressUpdated() {
        if (this.currentCourse) {
            this.currentProgress = this.courseManager.getCourseProgress(this.currentCourse.id);
            if (this.isVisible) {
                this.updateProgressDisplay();
            }
        }
    }

    /**
     * パネルの表示状態を取得
     */
    getVisibilityState() {
        return this.isVisible;
    }

    /**
     * 強制的に進捗表示を更新
     */
    forceUpdate() {
        if (this.currentCourse && this.isVisible) {
            this.currentProgress = this.courseManager.getCourseProgress(this.currentCourse.id);
            this.updateProgressDisplay();
        }
    }
}