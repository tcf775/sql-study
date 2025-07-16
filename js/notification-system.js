/**
 * NotificationSystem - ユーザー通知システム
 * エラーハンドラーと連携してユーザーに適切な通知を表示
 */
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000; // 5秒
        this.container = null;
        
        this.initializeContainer();
        this.setupStyles();
    }

    /**
     * 通知コンテナを初期化
     */
    initializeContainer() {
        // 既存のコンテナをチェック
        this.container = document.getElementById('notification-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * 通知システムのスタイルを設定
     */
    setupStyles() {
        const styleId = 'notification-system-styles';
        
        // 既存のスタイルをチェック
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }

            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 16px;
                border-left: 4px solid #007bff;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
                position: relative;
                max-width: 100%;
                word-wrap: break-word;
            }

            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .notification.hide {
                opacity: 0;
                transform: translateX(100%);
            }

            .notification.info {
                border-left-color: #007bff;
            }

            .notification.success {
                border-left-color: #28a745;
            }

            .notification.warning {
                border-left-color: #ffc107;
            }

            .notification.error {
                border-left-color: #dc3545;
            }

            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }

            .notification-title {
                font-weight: 600;
                font-size: 14px;
                margin: 0;
                color: #333;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                margin-left: 10px;
                line-height: 1;
            }

            .notification-close:hover {
                color: #333;
            }

            .notification-message {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
                margin: 0;
            }

            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .notification-action {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .notification-action:hover {
                background: #e9ecef;
            }

            .notification-action.primary {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }

            .notification-action.primary:hover {
                background: #0056b3;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(0, 123, 255, 0.3);
                transition: width linear;
            }

            .notification.info .notification-progress {
                background: rgba(0, 123, 255, 0.3);
            }

            .notification.success .notification-progress {
                background: rgba(40, 167, 69, 0.3);
            }

            .notification.warning .notification-progress {
                background: rgba(255, 193, 7, 0.3);
            }

            .notification.error .notification-progress {
                background: rgba(220, 53, 69, 0.3);
            }

            @media (max-width: 480px) {
                .notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }

                .notification {
                    margin-bottom: 8px;
                    padding: 12px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 通知を表示
     * @param {string} message - 通知メッセージ
     * @param {string} type - 通知タイプ (info, success, warning, error)
     * @param {Object} options - 追加オプション
     */
    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        
        // 最大通知数を超える場合は古い通知を削除
        if (this.notifications.length >= this.maxNotifications) {
            const oldestNotification = this.notifications.shift();
            this.removeNotification(oldestNotification);
        }

        this.notifications.push(notification);
        this.container.appendChild(notification.element);

        // アニメーション用の遅延
        setTimeout(() => {
            notification.element.classList.add('show');
        }, 10);

        // 自動削除の設定
        if (options.duration !== 0) {
            const duration = options.duration || this.defaultDuration;
            notification.autoRemoveTimer = setTimeout(() => {
                this.removeNotification(notification);
            }, duration);

            // プログレスバーのアニメーション
            if (notification.progressBar) {
                notification.progressBar.style.width = '100%';
                setTimeout(() => {
                    notification.progressBar.style.width = '0%';
                    notification.progressBar.style.transition = `width ${duration}ms linear`;
                }, 50);
            }
        }

        return notification;
    }

    /**
     * 通知要素を作成
     * @param {string} message - メッセージ
     * @param {string} type - タイプ
     * @param {Object} options - オプション
     * @returns {Object} 通知オブジェクト
     */
    createNotification(message, type, options) {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const element = document.createElement('div');
        element.className = `notification ${type}`;
        element.id = id;

        const title = this.getTypeTitle(type);
        const actions = options.actions || [];
        const showProgress = options.duration !== 0;

        element.innerHTML = `
            <div class="notification-header">
                <h4 class="notification-title">${title}</h4>
                <button class="notification-close" aria-label="閉じる">&times;</button>
            </div>
            <p class="notification-message">${message}</p>
            ${actions.length > 0 ? `
                <div class="notification-actions">
                    ${actions.map((action, index) => `
                        <button class="notification-action ${action.primary ? 'primary' : ''}" 
                                data-action-index="${index}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
            ${showProgress ? '<div class="notification-progress"></div>' : ''}
        `;

        const notification = {
            id: id,
            element: element,
            type: type,
            message: message,
            options: options,
            progressBar: showProgress ? element.querySelector('.notification-progress') : null,
            autoRemoveTimer: null
        };

        // イベントリスナーを設定
        this.setupNotificationEvents(notification);

        return notification;
    }

    /**
     * 通知のイベントリスナーを設定
     * @param {Object} notification - 通知オブジェクト
     */
    setupNotificationEvents(notification) {
        const closeButton = notification.element.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // アクションボタンのイベント
        const actionButtons = notification.element.querySelectorAll('.notification-action');
        actionButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                const action = notification.options.actions[index];
                if (action.callback && typeof action.callback === 'function') {
                    action.callback();
                }
                
                if (action.closeOnClick !== false) {
                    this.removeNotification(notification);
                }
            });
        });

        // ホバー時の自動削除停止
        notification.element.addEventListener('mouseenter', () => {
            if (notification.autoRemoveTimer) {
                clearTimeout(notification.autoRemoveTimer);
                notification.autoRemoveTimer = null;
            }
            
            if (notification.progressBar) {
                notification.progressBar.style.animationPlayState = 'paused';
            }
        });

        notification.element.addEventListener('mouseleave', () => {
            if (notification.options.duration !== 0) {
                const remainingTime = notification.options.duration || this.defaultDuration;
                notification.autoRemoveTimer = setTimeout(() => {
                    this.removeNotification(notification);
                }, remainingTime / 2); // 残り時間を短縮
            }
        });
    }

    /**
     * 通知を削除
     * @param {Object} notification - 削除する通知
     */
    removeNotification(notification) {
        if (notification.autoRemoveTimer) {
            clearTimeout(notification.autoRemoveTimer);
        }

        notification.element.classList.add('hide');
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * タイプに応じたタイトルを取得
     * @param {string} type - 通知タイプ
     * @returns {string} タイトル
     */
    getTypeTitle(type) {
        const titles = {
            info: '情報',
            success: '成功',
            warning: '警告',
            error: 'エラー'
        };
        
        return titles[type] || '通知';
    }

    /**
     * 特定タイプの通知を全て削除
     * @param {string} type - 削除する通知タイプ
     */
    clearByType(type) {
        const notificationsToRemove = this.notifications.filter(n => n.type === type);
        notificationsToRemove.forEach(notification => {
            this.removeNotification(notification);
        });
    }

    /**
     * 全ての通知を削除
     */
    clearAll() {
        [...this.notifications].forEach(notification => {
            this.removeNotification(notification);
        });
    }

    /**
     * エラーハンドラー用の通知表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ
     * @param {Object} errorContext - エラーコンテキスト
     */
    showErrorNotification(message, type, errorContext = {}) {
        const actions = [];

        // エラータイプに応じたアクションを追加
        if (errorContext.suggestedActions) {
            errorContext.suggestedActions.forEach(action => {
                actions.push({
                    label: action.label,
                    callback: () => this.handleSuggestedAction(action),
                    primary: action.action === 'select_course' || action.action === 'complete_prerequisites'
                });
            });
        }

        // 共通アクション
        if (type === 'error') {
            actions.push({
                label: '再読み込み',
                callback: () => window.location.reload(),
                primary: false
            });
        }

        const options = {
            duration: type === 'error' ? 0 : this.defaultDuration, // エラーは手動で閉じる
            actions: actions
        };

        return this.show(message, type, options);
    }

    /**
     * 推奨アクションを処理
     * @param {Object} action - アクション情報
     */
    handleSuggestedAction(action) {
        switch (action.action) {
            case 'select_course':
                if (window.courseUI && typeof window.courseUI.showCourseSelection === 'function') {
                    window.courseUI.showCourseSelection();
                }
                break;
                
            case 'view_course_overview':
                if (window.courseUI && typeof window.courseUI.showCourseOverview === 'function') {
                    window.courseUI.showCourseOverview();
                }
                break;
                
            case 'continue_from_last':
                if (window.gameEngine && typeof window.gameEngine.setCurrentChallengeFromProgress === 'function') {
                    window.gameEngine.setCurrentChallengeFromProgress();
                }
                break;
                
            case 'complete_prerequisites':
                if (window.progressUI && typeof window.progressUI.showProgressPanel === 'function') {
                    window.progressUI.showProgressPanel();
                }
                break;
                
            case 'view_progress':
                if (window.uiController && typeof window.uiController.toggleProgressPanel === 'function') {
                    window.uiController.toggleProgressPanel();
                }
                break;
                
            case 'contact_support':
                this.showSupportInfo();
                break;
                
            default:
                console.log('未知のアクション:', action.action);
        }
    }

    /**
     * サポート情報を表示
     */
    showSupportInfo() {
        const supportMessage = `
            問題が解決しない場合は、以下の情報をお知らせください：<br>
            • 発生した操作<br>
            • エラーメッセージ<br>
            • 使用しているブラウザ<br>
            • 現在の学習進捗
        `;

        this.show(supportMessage, 'info', {
            duration: 0,
            actions: [
                {
                    label: 'エラーログをコピー',
                    callback: () => this.copyErrorLog(),
                    primary: true
                },
                {
                    label: '閉じる',
                    callback: () => {},
                    primary: false
                }
            ]
        });
    }

    /**
     * エラーログをクリップボードにコピー
     */
    async copyErrorLog() {
        try {
            if (window.errorHandler) {
                const errorStats = window.errorHandler.getErrorStats();
                const logText = JSON.stringify(errorStats, null, 2);
                
                await navigator.clipboard.writeText(logText);
                this.show('エラーログをクリップボードにコピーしました', 'success');
            } else {
                this.show('エラーログが利用できません', 'warning');
            }
        } catch (error) {
            console.error('クリップボードへのコピーに失敗:', error);
            this.show('クリップボードへのコピーに失敗しました', 'error');
        }
    }

    /**
     * システム状態の通知を表示
     * @param {Object} healthStatus - システム健全性情報
     */
    showSystemStatus(healthStatus) {
        let message = '';
        let type = 'info';

        switch (healthStatus.overall) {
            case 'healthy':
                message = 'システムは正常に動作しています';
                type = 'success';
                break;
            case 'degraded':
                message = 'システムの一部機能に制限があります';
                type = 'warning';
                break;
            case 'unhealthy':
                message = 'システムに問題が発生しています';
                type = 'error';
                break;
        }

        const actions = [];
        if (healthStatus.overall !== 'healthy') {
            actions.push({
                label: '詳細を確認',
                callback: () => console.log('システム状態:', healthStatus),
                primary: true
            });
        }

        this.show(message, type, {
            duration: type === 'success' ? 3000 : 0,
            actions: actions
        });
    }
}

// グローバルインスタンスを作成
window.notificationSystem = new NotificationSystem();

export { NotificationSystem };