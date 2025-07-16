/**
 * AdaptiveLearningUI - 適応的学習機能のUI表示コンポーネント
 * 学習推奨事項、困難な概念、追加練習問題の表示を管理
 */
export class AdaptiveLearningUI {
    constructor(adaptiveLearning, gameEngine, courseManager) {
        this.adaptiveLearning = adaptiveLearning;
        this.gameEngine = gameEngine;
        this.courseManager = courseManager;
        this.isVisible = false;
        this.currentRecommendations = null;
        this.init();
    }

    /**
     * UI要素を初期化
     */
    init() {
        this.createAdaptiveLearningPanel();
        this.attachEventListeners();
    }

    /**
     * 適応的学習パネルを作成
     */
    createAdaptiveLearningPanel() {
        // 既存のパネルがあれば削除
        const existingPanel = document.getElementById('adaptive-learning-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'adaptive-learning-panel';
        panel.className = 'adaptive-learning-panel';
        panel.innerHTML = `
            <div class="adaptive-learning-header">
                <h3>学習アシスタント</h3>
                <button id="adaptive-toggle" class="adaptive-toggle">
                    <span class="toggle-icon">💡</span>
                </button>
            </div>
            <div class="adaptive-learning-content" id="adaptive-content">
                <div class="loading">学習データを分析中...</div>
            </div>
        `;

        // スタイルを追加
        this.addStyles();

        // パネルをページに追加
        document.body.appendChild(panel);
    }

    /**
     * スタイルを追加
     */
    addStyles() {
        if (document.getElementById('adaptive-learning-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'adaptive-learning-styles';
        style.textContent = `
            .adaptive-learning-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: transform 0.3s ease;
            }

            .adaptive-learning-panel.collapsed {
                transform: translateX(280px);
            }

            .adaptive-learning-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 8px 8px 0 0;
            }

            .adaptive-learning-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
            }

            .adaptive-toggle {
                background: rgba(255,255,255,0.2);
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                padding: 4px 8px;
                font-size: 16px;
                transition: background 0.2s;
            }

            .adaptive-toggle:hover {
                background: rgba(255,255,255,0.3);
            }

            .adaptive-learning-content {
                padding: 16px;
                max-height: 400px;
                overflow-y: auto;
            }

            .recommendation-card {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .recommendation-card.high-priority {
                border-left: 4px solid #dc3545;
            }

            .recommendation-card.medium-priority {
                border-left: 4px solid #ffc107;
            }

            .recommendation-card.low-priority {
                border-left: 4px solid #28a745;
            }

            .recommendation-title {
                font-weight: 600;
                font-size: 13px;
                color: #495057;
                margin-bottom: 4px;
            }

            .recommendation-description {
                font-size: 12px;
                color: #6c757d;
                line-height: 1.4;
            }

            .concept-list {
                list-style: none;
                padding: 0;
                margin: 8px 0 0 0;
            }

            .concept-item {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 6px;
                font-size: 12px;
            }

            .concept-success-rate {
                font-weight: 600;
                color: #856404;
            }

            .practice-button {
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 11px;
                cursor: pointer;
                margin-top: 8px;
                transition: background 0.2s;
            }

            .practice-button:hover {
                background: #0056b3;
            }

            .loading {
                text-align: center;
                color: #6c757d;
                font-size: 12px;
                padding: 20px;
            }

            .no-data {
                text-align: center;
                color: #6c757d;
                font-size: 12px;
                padding: 20px;
            }

            .proficiency-indicator {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .proficiency-expert {
                background: #d4edda;
                color: #155724;
            }

            .proficiency-proficient {
                background: #d1ecf1;
                color: #0c5460;
            }

            .proficiency-intermediate {
                background: #fff3cd;
                color: #856404;
            }

            .proficiency-beginner {
                background: #f8d7da;
                color: #721c24;
            }

            .proficiency-struggling {
                background: #f5c6cb;
                color: #721c24;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'adaptive-toggle') {
                this.togglePanel();
            }
            
            if (e.target.classList.contains('practice-button')) {
                const conceptId = e.target.dataset.conceptId;
                this.showAdditionalPractice(conceptId);
            }
        });

        // ゲームエンジンのチャレンジ完了イベントをリッスン
        if (this.gameEngine) {
            const originalOnChallengeCompleted = this.gameEngine.onChallengeCompleted.bind(this.gameEngine);
            this.gameEngine.onChallengeCompleted = () => {
                originalOnChallengeCompleted();
                // 少し遅延してから更新（データが保存されるのを待つ）
                setTimeout(() => this.updateRecommendations(), 1000);
            };
        }
    }

    /**
     * パネルの表示/非表示を切り替え
     */
    togglePanel() {
        const panel = document.getElementById('adaptive-learning-panel');
        if (panel) {
            panel.classList.toggle('collapsed');
            this.isVisible = !panel.classList.contains('collapsed');
            
            if (this.isVisible) {
                this.updateRecommendations();
            }
        }
    }

    /**
     * 推奨事項を更新
     */
    async updateRecommendations() {
        if (!this.adaptiveLearning || !this.adaptiveLearning.isInitialized()) {
            this.showNoData('適応的学習システムが初期化されていません');
            return;
        }

        const currentCourse = this.courseManager?.getCurrentCourse();
        if (!currentCourse) {
            this.showNoData('コースが選択されていません');
            return;
        }

        try {
            this.showLoading();

            // 各種推奨事項を取得
            const [
                recommendations,
                difficultConcepts,
                proficiency
            ] = await Promise.all([
                this.getRecommendations(),
                this.getDifficultConcepts(),
                this.getUserProficiency()
            ]);

            this.displayRecommendations(recommendations, difficultConcepts, proficiency);
        } catch (error) {
            console.error('推奨事項更新エラー:', error);
            this.showError('推奨事項の取得中にエラーが発生しました');
        }
    }

    /**
     * 推奨事項を取得
     */
    async getRecommendations() {
        const currentChallenge = this.gameEngine?.getCurrentChallenge();
        if (!currentChallenge || !currentChallenge.lessonId) {
            return null;
        }

        const currentCourse = this.courseManager.getCurrentCourse();
        return this.adaptiveLearning.recommendNextLesson(currentCourse.id, currentChallenge.lessonId);
    }

    /**
     * 困難な概念を取得
     */
    async getDifficultConcepts() {
        const currentCourse = this.courseManager.getCurrentCourse();
        return this.adaptiveLearning.detectDifficultConcepts(currentCourse.id);
    }

    /**
     * ユーザーの習熟度を取得
     */
    async getUserProficiency() {
        const currentCourse = this.courseManager.getCurrentCourse();
        return this.adaptiveLearning.analyzeUserProficiency(currentCourse.id);
    }

    /**
     * 推奨事項を表示
     */
    displayRecommendations(recommendations, difficultConcepts, proficiency) {
        const content = document.getElementById('adaptive-content');
        if (!content) return;

        let html = '';

        // 次レッスンの推奨
        if (recommendations) {
            html += this.renderNextLessonRecommendation(recommendations);
        }

        // 困難な概念
        if (difficultConcepts && difficultConcepts.length > 0) {
            html += this.renderDifficultConcepts(difficultConcepts);
        }

        // 習熟度情報
        if (proficiency) {
            html += this.renderProficiencyInfo(proficiency);
        }

        if (!html) {
            html = '<div class="no-data">学習データが不足しています。<br>いくつかの問題を解いてから再度確認してください。</div>';
        }

        content.innerHTML = html;
    }

    /**
     * 次レッスン推奨を描画
     */
    renderNextLessonRecommendation(recommendations) {
        const priorityClass = recommendations.confidence >= 0.8 ? 'high-priority' : 
                             recommendations.confidence >= 0.6 ? 'medium-priority' : 'low-priority';

        let html = `
            <div class="recommendation-card ${priorityClass}">
                <div class="recommendation-title">📚 次のステップ</div>
                <div class="recommendation-description">${recommendations.reason}</div>
        `;

        if (recommendations.alternatives && recommendations.alternatives.length > 0) {
            html += '<div style="margin-top: 8px; font-size: 11px; color: #6c757d;">その他の選択肢:</div>';
            recommendations.alternatives.forEach(alt => {
                html += `<div style="font-size: 11px; color: #6c757d;">• ${alt.description}</div>`;
            });
        }

        html += '</div>';
        return html;
    }

    /**
     * 困難な概念を描画
     */
    renderDifficultConcepts(difficultConcepts) {
        let html = `
            <div class="recommendation-card high-priority">
                <div class="recommendation-title">⚠️ 重点学習が必要な概念</div>
                <ul class="concept-list">
        `;

        difficultConcepts.slice(0, 3).forEach(concept => {
            const successRate = Math.round(concept.successRate * 100);
            html += `
                <li class="concept-item">
                    <div style="font-weight: 600;">${concept.name}</div>
                    <div class="concept-success-rate">正答率: ${successRate}%</div>
                    <button class="practice-button" data-concept-id="${concept.id}">
                        追加練習
                    </button>
                </li>
            `;
        });

        html += '</ul></div>';
        return html;
    }

    /**
     * 習熟度情報を描画
     */
    renderProficiencyInfo(proficiency) {
        const overallPercent = Math.round(proficiency.overallProficiency * 100);
        const velocityPercent = Math.round(proficiency.learningVelocity * 100);
        const consistencyPercent = Math.round(proficiency.consistencyScore * 100);

        return `
            <div class="recommendation-card">
                <div class="recommendation-title">📊 学習状況</div>
                <div style="font-size: 12px; line-height: 1.4;">
                    <div>全体習熟度: <strong>${overallPercent}%</strong></div>
                    <div>学習速度: <strong>${velocityPercent}%</strong></div>
                    <div>一貫性: <strong>${consistencyPercent}%</strong></div>
                </div>
            </div>
        `;
    }

    /**
     * 追加練習問題を表示
     */
    showAdditionalPractice(conceptId) {
        const currentCourse = this.courseManager.getCurrentCourse();
        const practiceData = this.adaptiveLearning.suggestAdditionalPractice(currentCourse.id, conceptId);
        
        if (!practiceData) {
            alert('追加練習問題が見つかりませんでした。');
            return;
        }

        // 簡単なモーダルで練習問題を表示
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h3>${practiceData.conceptName} - 追加練習</h3>
                <p>現在の成功率: ${Math.round(practiceData.currentPerformance.successRate * 100)}%</p>
                <p>推定時間: ${practiceData.estimatedTime}分</p>
                
                <div style="margin: 20px 0;">
                    ${practiceData.practiceProblems.map((problem, index) => `
                        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px;">
                            <h4>練習問題 ${index + 1}</h4>
                            <p>${problem.question}</p>
                            <details>
                                <summary>ヒント</summary>
                                <ul>
                                    ${problem.hints.map(hint => `<li>${hint}</li>`).join('')}
                                </ul>
                            </details>
                        </div>
                    `).join('')}
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    閉じる
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * ローディング表示
     */
    showLoading() {
        const content = document.getElementById('adaptive-content');
        if (content) {
            content.innerHTML = '<div class="loading">学習データを分析中...</div>';
        }
    }

    /**
     * データなし表示
     */
    showNoData(message) {
        const content = document.getElementById('adaptive-content');
        if (content) {
            content.innerHTML = `<div class="no-data">${message}</div>`;
        }
    }

    /**
     * エラー表示
     */
    showError(message) {
        const content = document.getElementById('adaptive-content');
        if (content) {
            content.innerHTML = `<div class="no-data" style="color: #dc3545;">${message}</div>`;
        }
    }

    /**
     * パネルを表示
     */
    show() {
        const panel = document.getElementById('adaptive-learning-panel');
        if (panel) {
            panel.classList.remove('collapsed');
            this.isVisible = true;
            this.updateRecommendations();
        }
    }

    /**
     * パネルを非表示
     */
    hide() {
        const panel = document.getElementById('adaptive-learning-panel');
        if (panel) {
            panel.classList.add('collapsed');
            this.isVisible = false;
        }
    }

    /**
     * 学習レポートを表示
     */
    showLearningReport() {
        const currentCourse = this.courseManager.getCurrentCourse();
        const report = this.adaptiveLearning.generateLearningReport(currentCourse.id);
        
        if (!report) {
            alert('学習レポートを生成できませんでした。');
            return;
        }

        // 新しいウィンドウで学習レポートを表示
        const reportWindow = window.open('', '_blank', 'width=800,height=600');
        reportWindow.document.write(`
            <html>
                <head>
                    <title>学習レポート - ${currentCourse.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                        .section { margin-bottom: 20px; }
                        .strength { color: #28a745; }
                        .weakness { color: #dc3545; }
                    </style>
                </head>
                <body>
                    <h1>学習レポート</h1>
                    <div class="summary">
                        <h2>概要</h2>
                        <p>完了レッスン: ${report.summary.completedLessons}</p>
                        <p>学習時間: ${report.summary.totalTimeSpent}分</p>
                        <p>全体習熟度: ${report.summary.overallProficiency}%</p>
                        <p>学習速度: ${report.summary.learningVelocity}%</p>
                        <p>一貫性: ${report.summary.consistencyScore}%</p>
                    </div>
                    
                    <div class="section">
                        <h2>強み</h2>
                        ${report.strengths.map(strength => 
                            `<div class="strength">• ${strength.conceptId} (${strength.successRate}%)</div>`
                        ).join('')}
                    </div>
                    
                    <div class="section">
                        <h2>改善点</h2>
                        ${report.weaknesses.map(weakness => 
                            `<div class="weakness">• ${weakness.name} (${Math.round(weakness.successRate * 100)}%)</div>`
                        ).join('')}
                    </div>
                    
                    <div class="section">
                        <h2>推奨事項</h2>
                        ${report.recommendations.map(rec => 
                            `<div>• <strong>${rec.title}</strong>: ${rec.description}</div>`
                        ).join('')}
                    </div>
                </body>
            </html>
        `);
    }
}