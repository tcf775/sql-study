/**
 * ErrorHandler - 統一されたエラーハンドリングシステム
 * コースシステム全体のエラー処理とフォールバック機能を提供
 */
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.fallbackStrategies = new Map();
        this.userNotificationCallbacks = [];
        
        // フォールバック戦略を初期化
        this.initializeFallbackStrategies();
        
        // グローバルエラーハンドラーを設定
        this.setupGlobalErrorHandlers();
    }

    /**
     * フォールバック戦略を初期化
     */
    initializeFallbackStrategies() {
        // コースデータ読み込みエラーのフォールバック
        this.fallbackStrategies.set('COURSE_LOAD_ERROR', {
            handler: this.handleCourseLoadError.bind(this),
            description: 'コースデータ読み込みエラー時のフォールバック'
        });

        // 進捗データ破損のフォールバック
        this.fallbackStrategies.set('PROGRESS_DATA_CORRUPTION', {
            handler: this.handleProgressDataCorruption.bind(this),
            description: '進捗データ破損時の復旧処理'
        });

        // 不正なコース・レッスンアクセスのエラー処理
        this.fallbackStrategies.set('INVALID_ACCESS', {
            handler: this.handleInvalidAccess.bind(this),
            description: '不正なアクセス試行時の処理'
        });

        // チャレンジデータ読み込みエラー
        this.fallbackStrategies.set('CHALLENGE_LOAD_ERROR', {
            handler: this.handleChallengeLoadError.bind(this),
            description: 'チャレンジデータ読み込みエラー時の処理'
        });

        // データベース接続エラー
        this.fallbackStrategies.set('DATABASE_ERROR', {
            handler: this.handleDatabaseError.bind(this),
            description: 'データベース接続・実行エラー時の処理'
        });
    }

    /**
     * グローバルエラーハンドラーを設定
     */
    setupGlobalErrorHandlers() {
        // 未処理のPromise拒否をキャッチ
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('UNHANDLED_PROMISE_REJECTION', event.reason, {
                promise: event.promise,
                timestamp: new Date().toISOString()
            });
            
            // 重要なエラーの場合はユーザーに通知
            if (this.isCriticalError(event.reason)) {
                this.notifyUser('システムエラーが発生しました。ページを再読み込みしてください。', 'error');
            }
        });

        // 一般的なJavaScriptエラーをキャッチ
        window.addEventListener('error', (event) => {
            this.logError('JAVASCRIPT_ERROR', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * エラーをログに記録
     * @param {string} type - エラータイプ
     * @param {Error|string} error - エラーオブジェクトまたはメッセージ
     * @param {Object} context - 追加のコンテキスト情報
     */
    logError(type, error, context = {}) {
        const errorEntry = {
            id: this.generateErrorId(),
            type: type,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errorLog.push(errorEntry);

        // ログサイズを制限
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // コンソールにも出力
        console.error(`[${type}] ${errorEntry.message}`, {
            error: error,
            context: context,
            errorId: errorEntry.id
        });

        return errorEntry.id;
    }

    /**
     * エラーIDを生成
     */
    generateErrorId() {
        return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 重要なエラーかどうかを判定
     */
    isCriticalError(error) {
        const criticalPatterns = [
            /database.*not.*initialized/i,
            /course.*manager.*not.*found/i,
            /progress.*data.*corrupted/i,
            /failed.*to.*fetch/i
        ];

        const errorMessage = error instanceof Error ? error.message : String(error);
        return criticalPatterns.some(pattern => pattern.test(errorMessage));
    }

    /**
     * コースデータ読み込みエラーの処理
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーコンテキスト
     * @returns {Object} フォールバック結果
     */
    async handleCourseLoadError(error, context = {}) {
        const errorId = this.logError('COURSE_LOAD_ERROR', error, context);
        
        console.log('コースデータ読み込みエラーを処理中...', { errorId });

        try {
            // 1. キャッシュされたデータを確認
            const cachedCourses = this.getCachedCourseData();
            if (cachedCourses && cachedCourses.length > 0) {
                console.log('キャッシュされたコースデータを使用します');
                this.notifyUser('ネットワークエラーのため、キャッシュされたコースデータを使用しています。', 'warning');
                return {
                    success: true,
                    data: cachedCourses,
                    source: 'cache',
                    errorId: errorId
                };
            }

            // 2. デフォルトコースデータを生成
            const defaultCourses = this.generateDefaultCourseData();
            
            // 3. デフォルトデータをキャッシュに保存
            this.setCachedCourseData(defaultCourses);
            
            console.log('デフォルトコースデータを生成しました');
            this.notifyUser('コースデータの読み込みに失敗したため、基本コースを使用しています。', 'info');
            
            return {
                success: true,
                data: defaultCourses,
                source: 'default',
                errorId: errorId
            };

        } catch (fallbackError) {
            const fallbackErrorId = this.logError('COURSE_LOAD_FALLBACK_ERROR', fallbackError, { originalErrorId: errorId });
            
            this.notifyUser('コースデータの読み込みに失敗しました。ページを再読み込みしてください。', 'error');
            
            return {
                success: false,
                error: fallbackError,
                errorId: fallbackErrorId,
                originalErrorId: errorId
            };
        }
    }

    /**
     * 進捗データ破損時の復旧処理
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーコンテキスト
     * @returns {Object} 復旧結果
     */
    async handleProgressDataCorruption(error, context = {}) {
        const errorId = this.logError('PROGRESS_DATA_CORRUPTION', error, context);
        
        console.log('進捗データ破損を検出、復旧処理を開始...', { errorId });

        try {
            // 1. 破損したデータをバックアップ
            const corruptedData = this.backupCorruptedProgressData();
            
            // 2. 復旧可能なデータを抽出
            const recoveredData = this.attemptProgressDataRecovery(corruptedData);
            
            // 3. 新しい進捗データ構造を初期化
            const freshProgressData = this.initializeFreshProgressData();
            
            // 4. 復旧されたデータをマージ
            const mergedData = this.mergeRecoveredProgressData(freshProgressData, recoveredData);
            
            // 5. 復旧されたデータを保存
            this.saveRecoveredProgressData(mergedData);
            
            console.log('進捗データの復旧が完了しました', { 
                errorId,
                recoveredCourses: Object.keys(recoveredData).length 
            });
            
            this.notifyUser(
                `進捗データの問題を修復しました。${Object.keys(recoveredData).length}個のコースの進捗を復旧できました。`, 
                'success'
            );
            
            return {
                success: true,
                recoveredData: mergedData,
                recoveredCourses: Object.keys(recoveredData).length,
                errorId: errorId
            };

        } catch (recoveryError) {
            const recoveryErrorId = this.logError('PROGRESS_RECOVERY_ERROR', recoveryError, { originalErrorId: errorId });
            
            // 完全リセットを実行
            const resetResult = this.performCompleteProgressReset();
            
            this.notifyUser(
                '進捗データの復旧に失敗したため、進捗をリセットしました。学習を最初から開始してください。', 
                'warning'
            );
            
            return {
                success: true,
                action: 'complete_reset',
                errorId: recoveryErrorId,
                originalErrorId: errorId,
                resetResult: resetResult
            };
        }
    }

    /**
     * 不正なコース・レッスンアクセスの処理
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーコンテキスト
     * @returns {Object} 処理結果
     */
    handleInvalidAccess(error, context = {}) {
        const errorId = this.logError('INVALID_ACCESS', error, context);
        
        const { courseId, lessonId, userId, attemptedAction } = context;
        
        console.log('不正なアクセス試行を検出', { 
            errorId, 
            courseId, 
            lessonId, 
            attemptedAction 
        });

        // アクセス試行の詳細を分析
        const accessAnalysis = this.analyzeAccessAttempt(context);
        
        // 適切なリダイレクト先を決定
        const redirectTarget = this.determineRedirectTarget(accessAnalysis);
        
        // ユーザーへの説明メッセージを生成
        const userMessage = this.generateAccessErrorMessage(accessAnalysis);
        
        // 推奨アクションを生成
        const suggestedActions = this.generateSuggestedActions(accessAnalysis);
        
        this.notifyUser(userMessage, 'warning');
        
        return {
            success: false,
            error: error.message,
            errorId: errorId,
            analysis: accessAnalysis,
            redirectTarget: redirectTarget,
            suggestedActions: suggestedActions,
            userMessage: userMessage
        };
    }

    /**
     * チャレンジデータ読み込みエラーの処理
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーコンテキスト
     * @returns {Object} 処理結果
     */
    async handleChallengeLoadError(error, context = {}) {
        const errorId = this.logError('CHALLENGE_LOAD_ERROR', error, context);
        
        const { courseId, challengeFile } = context;
        
        console.log('チャレンジデータ読み込みエラーを処理中...', { 
            errorId, 
            courseId, 
            challengeFile 
        });

        try {
            // 1. 代替チャレンジファイルを試行
            const alternativeChallenge = await this.tryAlternativeChallengeFile(courseId, challengeFile);
            if (alternativeChallenge) {
                this.notifyUser('一部のチャレンジデータを代替ファイルから読み込みました。', 'info');
                return {
                    success: true,
                    data: alternativeChallenge,
                    source: 'alternative',
                    errorId: errorId
                };
            }

            // 2. 基本チャレンジデータを生成
            const basicChallenges = this.generateBasicChallenges(courseId);
            
            this.notifyUser(
                `${courseId}コースの一部チャレンジが利用できないため、基本的な問題を提供しています。`, 
                'warning'
            );
            
            return {
                success: true,
                data: basicChallenges,
                source: 'generated',
                errorId: errorId
            };

        } catch (fallbackError) {
            const fallbackErrorId = this.logError('CHALLENGE_LOAD_FALLBACK_ERROR', fallbackError, { originalErrorId: errorId });
            
            this.notifyUser('チャレンジデータの読み込みに失敗しました。', 'error');
            
            return {
                success: false,
                error: fallbackError,
                errorId: fallbackErrorId,
                originalErrorId: errorId
            };
        }
    }

    /**
     * データベースエラーの処理
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーコンテキスト
     * @returns {Object} 処理結果
     */
    async handleDatabaseError(error, context = {}) {
        const errorId = this.logError('DATABASE_ERROR', error, context);
        
        console.log('データベースエラーを処理中...', { errorId });

        try {
            // 1. データベース接続の再試行
            const reconnectResult = await this.attemptDatabaseReconnection();
            if (reconnectResult.success) {
                this.notifyUser('データベース接続を復旧しました。', 'success');
                return {
                    success: true,
                    action: 'reconnected',
                    errorId: errorId
                };
            }

            // 2. オフラインモードへの切り替え
            const offlineMode = this.enableOfflineMode();
            
            this.notifyUser(
                'データベースに接続できないため、オフラインモードで動作しています。一部機能が制限されます。', 
                'warning'
            );
            
            return {
                success: true,
                action: 'offline_mode',
                offlineMode: offlineMode,
                errorId: errorId
            };

        } catch (fallbackError) {
            const fallbackErrorId = this.logError('DATABASE_FALLBACK_ERROR', fallbackError, { originalErrorId: errorId });
            
            this.notifyUser('データベースエラーが解決できません。ページを再読み込みしてください。', 'error');
            
            return {
                success: false,
                error: fallbackError,
                errorId: fallbackErrorId,
                originalErrorId: errorId
            };
        }
    }

    // ===== ユーティリティメソッド =====

    /**
     * キャッシュされたコースデータを取得
     */
    getCachedCourseData() {
        try {
            const cached = localStorage.getItem('cached_course_data');
            if (cached) {
                const data = JSON.parse(cached);
                // キャッシュの有効期限をチェック（24時間）
                const cacheAge = Date.now() - data.timestamp;
                if (cacheAge < 24 * 60 * 60 * 1000) {
                    return data.courses;
                }
            }
        } catch (error) {
            console.warn('キャッシュデータの読み込みに失敗:', error);
        }
        return null;
    }

    /**
     * コースデータをキャッシュに保存
     */
    setCachedCourseData(courses) {
        try {
            const cacheData = {
                courses: courses,
                timestamp: Date.now()
            };
            localStorage.setItem('cached_course_data', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('キャッシュデータの保存に失敗:', error);
        }
    }

    /**
     * デフォルトコースデータを生成
     */
    generateDefaultCourseData() {
        return [{
            id: 'sql-basics',
            title: 'SQL基礎コース（基本版）',
            description: 'ネットワークエラーのため基本版を使用しています',
            targetAudience: '初心者',
            difficulty: '初級',
            estimatedHours: 4,
            modules: [{
                id: 'module-1',
                title: '基本操作',
                description: 'SQL基本操作を学習します',
                lessons: ['challenge-001', 'challenge-002'],
                prerequisites: []
            }]
        }];
    }

    /**
     * 破損した進捗データをバックアップ
     */
    backupCorruptedProgressData() {
        try {
            const corruptedData = localStorage.getItem('course_progress');
            if (corruptedData) {
                const backupKey = `corrupted_progress_backup_${Date.now()}`;
                localStorage.setItem(backupKey, corruptedData);
                console.log(`破損データをバックアップしました: ${backupKey}`);
                return corruptedData;
            }
        } catch (error) {
            console.warn('破損データのバックアップに失敗:', error);
        }
        return null;
    }

    /**
     * 進捗データの復旧を試行
     */
    attemptProgressDataRecovery(corruptedData) {
        const recoveredData = {};
        
        if (!corruptedData) return recoveredData;

        try {
            // JSONパースを試行
            const parsed = JSON.parse(corruptedData);
            
            // 各コースの進捗データを検証・復旧
            for (const [courseId, progressData] of Object.entries(parsed)) {
                if (this.isValidProgressData(progressData)) {
                    recoveredData[courseId] = progressData;
                } else {
                    // 部分的に復旧可能なデータを抽出
                    const partialData = this.extractValidProgressFields(progressData);
                    if (partialData) {
                        recoveredData[courseId] = partialData;
                    }
                }
            }
        } catch (error) {
            console.warn('進捗データの復旧に失敗:', error);
        }

        return recoveredData;
    }

    /**
     * 進捗データの有効性を検証
     */
    isValidProgressData(data) {
        return data && 
               typeof data === 'object' &&
               Array.isArray(data.completedLessons) &&
               Array.isArray(data.completedModules) &&
               typeof data.totalScore === 'number';
    }

    /**
     * 有効な進捗フィールドを抽出
     */
    extractValidProgressFields(data) {
        if (!data || typeof data !== 'object') return null;

        const extracted = {
            completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons : [],
            completedModules: Array.isArray(data.completedModules) ? data.completedModules : [],
            totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0,
            isCompleted: Boolean(data.isCompleted),
            startDate: data.startDate || new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };

        return extracted;
    }

    /**
     * 新しい進捗データ構造を初期化
     */
    initializeFreshProgressData() {
        return {
            courseProgress: {},
            selectedCourse: null,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * 復旧されたデータをマージ
     */
    mergeRecoveredProgressData(freshData, recoveredData) {
        freshData.courseProgress = { ...recoveredData };
        return freshData;
    }

    /**
     * 復旧されたデータを保存
     */
    saveRecoveredProgressData(data) {
        try {
            localStorage.setItem('course_progress', JSON.stringify(data.courseProgress));
            console.log('復旧された進捗データを保存しました');
        } catch (error) {
            console.error('復旧データの保存に失敗:', error);
            throw error;
        }
    }

    /**
     * 完全な進捗リセットを実行
     */
    performCompleteProgressReset() {
        try {
            localStorage.removeItem('course_progress');
            localStorage.removeItem('selected_course');
            console.log('進捗データを完全にリセットしました');
            return { success: true, action: 'complete_reset' };
        } catch (error) {
            console.error('進捗リセットに失敗:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * アクセス試行を分析
     */
    analyzeAccessAttempt(context) {
        const { courseId, lessonId, currentProgress } = context;
        
        return {
            courseId: courseId,
            lessonId: lessonId,
            hasValidCourse: Boolean(courseId),
            hasValidLesson: Boolean(lessonId),
            hasProgress: Boolean(currentProgress),
            accessType: this.determineAccessType(context),
            severity: this.determineAccessSeverity(context)
        };
    }

    /**
     * アクセスタイプを決定
     */
    determineAccessType(context) {
        if (!context.courseId) return 'INVALID_COURSE';
        if (!context.lessonId) return 'INVALID_LESSON';
        if (context.lessonLocked) return 'LOCKED_LESSON';
        return 'UNKNOWN_ACCESS_ERROR';
    }

    /**
     * アクセスエラーの重要度を決定
     */
    determineAccessSeverity(context) {
        if (context.attemptedAction === 'direct_url_access') return 'HIGH';
        if (context.lessonLocked) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * リダイレクト先を決定
     */
    determineRedirectTarget(analysis) {
        switch (analysis.accessType) {
            case 'INVALID_COURSE':
                return { type: 'course_selection', message: 'コース選択画面に戻ります' };
            case 'INVALID_LESSON':
                return { type: 'course_overview', courseId: analysis.courseId, message: 'コース概要に戻ります' };
            case 'LOCKED_LESSON':
                return { type: 'last_available_lesson', message: '利用可能な最後のレッスンに移動します' };
            default:
                return { type: 'home', message: 'ホーム画面に戻ります' };
        }
    }

    /**
     * アクセスエラーメッセージを生成
     */
    generateAccessErrorMessage(analysis) {
        switch (analysis.accessType) {
            case 'INVALID_COURSE':
                return '指定されたコースが見つかりません。利用可能なコースから選択してください。';
            case 'INVALID_LESSON':
                return '指定されたレッスンが見つかりません。コース内の利用可能なレッスンを確認してください。';
            case 'LOCKED_LESSON':
                return 'このレッスンはまだロックされています。前のレッスンを完了してからアクセスしてください。';
            default:
                return 'アクセスエラーが発生しました。正しい手順でレッスンにアクセスしてください。';
        }
    }

    /**
     * 推奨アクションを生成
     */
    generateSuggestedActions(analysis) {
        const actions = [];
        
        switch (analysis.accessType) {
            case 'INVALID_COURSE':
                actions.push({ action: 'select_course', label: 'コースを選択する' });
                break;
            case 'INVALID_LESSON':
                actions.push({ action: 'view_course_overview', label: 'コース概要を見る' });
                actions.push({ action: 'continue_from_last', label: '前回の続きから始める' });
                break;
            case 'LOCKED_LESSON':
                actions.push({ action: 'complete_prerequisites', label: '前提レッスンを完了する' });
                actions.push({ action: 'view_progress', label: '進捗を確認する' });
                break;
        }
        
        actions.push({ action: 'contact_support', label: 'サポートに問い合わせる' });
        
        return actions;
    }

    /**
     * 代替チャレンジファイルを試行
     */
    async tryAlternativeChallengeFile(courseId, originalFile) {
        const alternatives = [
            'slides/challenges.json', // デフォルトファイル
            `slides/${courseId}-backup-challenges.json`,
            'slides/basic-challenges.json'
        ];

        for (const altFile of alternatives) {
            if (altFile === originalFile) continue;
            
            try {
                const response = await fetch(altFile);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`代替チャレンジファイルを読み込みました: ${altFile}`);
                    return data;
                }
            } catch (error) {
                console.warn(`代替ファイル読み込み失敗: ${altFile}`, error);
            }
        }
        
        return null;
    }

    /**
     * 基本チャレンジデータを生成
     */
    generateBasicChallenges(courseId) {
        const basicChallenges = [
            {
                id: 'basic-001',
                title: '基本的なSELECT文',
                description: 'テーブルからデータを取得する基本的なクエリです。',
                solution: 'SELECT * FROM customers LIMIT 5;',
                expectedColumns: ['customer_id', 'company_name', 'contact_name'],
                difficulty: 1,
                hints: ['SELECT文の基本構文を使用してください', 'LIMIT句で結果数を制限できます']
            }
        ];

        console.log(`${courseId}用の基本チャレンジを生成しました`);
        return basicChallenges;
    }

    /**
     * データベース再接続を試行
     */
    async attemptDatabaseReconnection() {
        try {
            if (window.dbManager && typeof window.dbManager.initialize === 'function') {
                const result = await window.dbManager.initialize();
                return { success: result };
            }
            return { success: false, reason: 'dbManager not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * オフラインモードを有効化
     */
    enableOfflineMode() {
        const offlineMode = {
            enabled: true,
            features: {
                courseSelection: true,
                progressTracking: true,
                basicChallenges: true,
                sqlExecution: false,
                dataVisualization: false
            },
            limitations: [
                'SQLクエリの実行ができません',
                'データベースの結果表示ができません',
                '一部の高度な機能が制限されます'
            ]
        };

        // オフラインモード状態を保存
        try {
            localStorage.setItem('offline_mode', JSON.stringify(offlineMode));
        } catch (error) {
            console.warn('オフラインモード状態の保存に失敗:', error);
        }

        return offlineMode;
    }

    /**
     * ユーザー通知コールバックを追加
     */
    addNotificationCallback(callback) {
        if (typeof callback === 'function') {
            this.userNotificationCallbacks.push(callback);
        }
    }

    /**
     * ユーザーに通知
     */
    notifyUser(message, type = 'info') {
        // 登録されたコールバックを実行
        this.userNotificationCallbacks.forEach(callback => {
            try {
                callback(message, type);
            } catch (error) {
                console.error('通知コールバックエラー:', error);
            }
        });

        // デフォルトの通知方法（コンソール出力）
        const logMethod = type === 'error' ? console.error : 
                         type === 'warning' ? console.warn : 
                         console.log;
        
        logMethod(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * エラーログを取得
     */
    getErrorLog(limit = 10) {
        return this.errorLog.slice(-limit);
    }

    /**
     * エラー統計を取得
     */
    getErrorStats() {
        const stats = {};
        
        this.errorLog.forEach(error => {
            stats[error.type] = (stats[error.type] || 0) + 1;
        });

        return {
            totalErrors: this.errorLog.length,
            errorTypes: stats,
            recentErrors: this.getErrorLog(5)
        };
    }

    /**
     * エラーハンドラーを実行
     */
    async handleError(errorType, error, context = {}) {
        const strategy = this.fallbackStrategies.get(errorType);
        
        if (strategy) {
            console.log(`エラーハンドラーを実行: ${errorType}`, { error, context });
            return await strategy.handler(error, context);
        } else {
            // 未知のエラータイプの場合は汎用処理
            const errorId = this.logError('UNKNOWN_ERROR', error, { ...context, errorType });
            this.notifyUser(`予期しないエラーが発生しました: ${error.message}`, 'error');
            
            return {
                success: false,
                error: error.message,
                errorId: errorId,
                handled: false
            };
        }
    }

    /**
     * システムの健全性をチェック
     */
    performHealthCheck() {
        const healthStatus = {
            timestamp: new Date().toISOString(),
            components: {},
            overall: 'healthy'
        };

        // CourseManager の状態チェック
        if (window.courseManager) {
            healthStatus.components.courseManager = {
                status: window.courseManager.initialized ? 'healthy' : 'unhealthy',
                coursesLoaded: window.courseManager.courses?.length || 0
            };
        } else {
            healthStatus.components.courseManager = { status: 'missing' };
            healthStatus.overall = 'degraded';
        }

        // データベースの状態チェック
        if (window.dbManager) {
            healthStatus.components.database = {
                status: window.dbManager.isInitialized ? 'healthy' : 'unhealthy'
            };
        } else {
            healthStatus.components.database = { status: 'missing' };
            healthStatus.overall = 'degraded';
        }

        // LocalStorageの状態チェック
        try {
            localStorage.setItem('health_check', 'test');
            localStorage.removeItem('health_check');
            healthStatus.components.localStorage = { status: 'healthy' };
        } catch (error) {
            healthStatus.components.localStorage = { 
                status: 'unhealthy', 
                error: error.message 
            };
            healthStatus.overall = 'degraded';
        }

        // エラー率のチェック
        const recentErrors = this.errorLog.filter(error => 
            Date.now() - new Date(error.timestamp).getTime() < 5 * 60 * 1000 // 5分以内
        );
        
        if (recentErrors.length > 5) {
            healthStatus.overall = 'unhealthy';
            healthStatus.components.errorRate = { 
                status: 'high', 
                recentErrors: recentErrors.length 
            };
        } else {
            healthStatus.components.errorRate = { 
                status: 'normal', 
                recentErrors: recentErrors.length 
            };
        }

        return healthStatus;
    }
}

// グローバルインスタンスを作成
window.errorHandler = new ErrorHandler();

export { ErrorHandler };