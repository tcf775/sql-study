/**
 * ProgressManager - 進捗管理システム
 * localStorageを使用した進捗データの保存・読み込み、整合性チェック、エラー処理を提供
 */
class ProgressManager {
    constructor() {
        this.storageKey = 'courseProgress';
        this.selectedCourseKey = 'selectedCourse';
        this.progressData = {};
        this.initialized = false;
    }

    /**
     * 進捗管理システムを初期化
     */
    async initialize() {
        try {
            this.loadProgressData();
            this.validateProgressData();
            this.initialized = true;
            console.log('進捗管理システムが初期化されました');
            return true;
        } catch (error) {
            console.error('進捗管理システム初期化エラー:', error);
            
            // ErrorHandlerを使用して進捗データ破損を処理
            if (window.errorHandler) {
                const result = await window.errorHandler.handleError('PROGRESS_DATA_CORRUPTION', error, {
                    operation: 'initialize',
                    storageKey: this.storageKey
                });
                
                if (result.success) {
                    // 復旧されたデータを使用
                    if (result.recoveredData) {
                        this.progressData = result.recoveredData;
                        this.initialized = true;
                        return true;
                    }
                }
            }
            
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * 進捗データをlocalStorageから読み込み
     */
    loadProgressData() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.progressData = this.migrateProgressData(parsedData);
            } else {
                this.progressData = {};
            }
        } catch (error) {
            console.error('進捗データ読み込みエラー:', error);
            throw new Error('進捗データの読み込みに失敗しました');
        }
    }

    /**
     * 進捗データの形式を最新版にマイグレーション
     */
    migrateProgressData(data) {
        // 古い形式のデータを新しい形式に変換
        if (data.courseProgress) {
            // 新しい形式の場合はそのまま返す
            return data.courseProgress;
        } else if (typeof data === 'object' && data !== null) {
            // 直接コース進捗データが格納されている場合
            return data;
        }
        return {};
    }

    /**
     * 進捗データの整合性をチェック
     */
    validateProgressData() {
        const validatedData = {};
        
        for (const [courseId, progress] of Object.entries(this.progressData)) {
            try {
                const validatedProgress = this.validateCourseProgress(courseId, progress);
                if (validatedProgress) {
                    validatedData[courseId] = validatedProgress;
                }
            } catch (error) {
                console.warn(`コース ${courseId} の進捗データが無効です:`, error);
                // 無効なデータは除外
            }
        }
        
        this.progressData = validatedData;
    }

    /**
     * 個別コースの進捗データを検証
     */
    validateCourseProgress(courseId, progress) {
        if (!progress || typeof progress !== 'object') {
            throw new Error('進捗データが無効な形式です');
        }

        // 必須フィールドの存在チェック
        const requiredFields = ['completedLessons', 'completedModules', 'startDate', 'lastAccessed'];
        for (const field of requiredFields) {
            if (!(field in progress)) {
                console.warn(`必須フィールド ${field} が見つかりません。初期化します。`);
                progress[field] = this.getDefaultFieldValue(field);
            }
        }

        // データ型の検証
        if (!Array.isArray(progress.completedLessons)) {
            progress.completedLessons = [];
        }
        if (!Array.isArray(progress.completedModules)) {
            progress.completedModules = [];
        }

        // 日付の検証
        if (!this.isValidDate(progress.startDate)) {
            progress.startDate = new Date().toISOString();
        }
        if (!this.isValidDate(progress.lastAccessed)) {
            progress.lastAccessed = new Date().toISOString();
        }

        // 数値の検証
        if (typeof progress.totalScore !== 'number' || progress.totalScore < 0) {
            progress.totalScore = 0;
        }

        // ブール値の検証
        if (typeof progress.isCompleted !== 'boolean') {
            progress.isCompleted = false;
        }

        return progress;
    }

    /**
     * デフォルトフィールド値を取得
     */
    getDefaultFieldValue(field) {
        const defaults = {
            completedLessons: [],
            completedModules: [],
            startDate: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            currentModule: null,
            currentLesson: null,
            totalScore: 0,
            isCompleted: false
        };
        return defaults[field];
    }

    /**
     * 日付文字列の有効性をチェック
     */
    isValidDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return false;
        }
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    /**
     * コースの進捗データを取得
     */
    getCourseProgress(courseId) {
        if (!courseId) {
            throw new Error('コースIDが指定されていません');
        }
        return this.progressData[courseId] || null;
    }

    /**
     * 全ての進捗データを取得
     */
    getAllProgress() {
        return { ...this.progressData };
    }

    /**
     * コースの進捗を初期化
     */
    initializeCourseProgress(courseId) {
        if (!courseId) {
            throw new Error('コースIDが指定されていません');
        }

        const now = new Date().toISOString();
        this.progressData[courseId] = {
            currentModule: null,
            currentLesson: null,
            completedLessons: [],
            completedModules: [],
            startDate: now,
            lastAccessed: now,
            totalScore: 0,
            isCompleted: false
        };

        this.saveProgressData();
        console.log(`コース進捗を初期化しました: ${courseId}`);
        return this.progressData[courseId];
    }

    /**
     * レッスン完了を記録
     */
    markLessonCompleted(courseId, lessonId, score = 0) {
        if (!courseId || !lessonId) {
            throw new Error('コースIDまたはレッスンIDが指定されていません');
        }

        // 進捗データが存在しない場合は初期化
        if (!this.progressData[courseId]) {
            this.initializeCourseProgress(courseId);
        }

        const progress = this.progressData[courseId];

        // レッスン完了をマーク（重複チェック）
        if (!progress.completedLessons.includes(lessonId)) {
            progress.completedLessons.push(lessonId);
        }

        // 現在のレッスンを更新
        progress.currentLesson = lessonId;
        progress.lastAccessed = new Date().toISOString();

        // スコアを加算
        if (typeof score === 'number' && score > 0) {
            progress.totalScore += score;
        }

        this.saveProgressData();
        console.log(`レッスン完了を記録しました: ${courseId} - ${lessonId}`);
        
        return progress;
    }

    /**
     * モジュール完了を記録
     */
    markModuleCompleted(courseId, moduleId) {
        if (!courseId || !moduleId) {
            throw new Error('コースIDまたはモジュールIDが指定されていません');
        }

        if (!this.progressData[courseId]) {
            throw new Error(`コース ${courseId} の進捗データが見つかりません`);
        }

        const progress = this.progressData[courseId];

        // モジュール完了をマーク（重複チェック）
        if (!progress.completedModules.includes(moduleId)) {
            progress.completedModules.push(moduleId);
        }

        progress.currentModule = moduleId;
        progress.lastAccessed = new Date().toISOString();

        this.saveProgressData();
        console.log(`モジュール完了を記録しました: ${courseId} - ${moduleId}`);
        
        return progress;
    }

    /**
     * コース完了を記録
     */
    markCourseCompleted(courseId) {
        if (!courseId) {
            throw new Error('コースIDが指定されていません');
        }

        if (!this.progressData[courseId]) {
            throw new Error(`コース ${courseId} の進捗データが見つかりません`);
        }

        const progress = this.progressData[courseId];
        progress.isCompleted = true;
        progress.lastAccessed = new Date().toISOString();

        this.saveProgressData();
        console.log(`コース完了を記録しました: ${courseId}`);
        
        return progress;
    }

    /**
     * 進捗データをlocalStorageに保存
     */
    saveProgressData() {
        try {
            const dataToSave = {
                courseProgress: this.progressData,
                lastSaved: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('進捗データ保存エラー:', error);
            this.handleSaveError(error);
        }
    }

    /**
     * 選択されたコースを保存
     */
    saveSelectedCourse(courseId) {
        try {
            localStorage.setItem(this.selectedCourseKey, courseId);
        } catch (error) {
            console.error('選択コース保存エラー:', error);
        }
    }

    /**
     * 選択されたコースを取得
     */
    getSelectedCourse() {
        try {
            return localStorage.getItem(this.selectedCourseKey);
        } catch (error) {
            console.error('選択コース取得エラー:', error);
            return null;
        }
    }

    /**
     * 特定コースの進捗をリセット
     */
    resetCourseProgress(courseId) {
        if (!courseId) {
            throw new Error('コースIDが指定されていません');
        }

        delete this.progressData[courseId];
        this.saveProgressData();
        console.log(`コース進捗をリセットしました: ${courseId}`);
    }

    /**
     * 全ての進捗をリセット
     */
    resetAllProgress() {
        this.progressData = {};
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.selectedCourseKey);
        } catch (error) {
            console.error('進捗リセットエラー:', error);
        }
        console.log('全ての進捗をリセットしました');
    }

    /**
     * 進捗統計を取得
     */
    getProgressStats(courseId) {
        const progress = this.getCourseProgress(courseId);
        if (!progress) {
            return null;
        }

        return {
            completedLessonsCount: progress.completedLessons.length,
            completedModulesCount: progress.completedModules.length,
            totalScore: progress.totalScore,
            isCompleted: progress.isCompleted,
            startDate: progress.startDate,
            lastAccessed: progress.lastAccessed,
            daysActive: this.calculateDaysActive(progress.startDate, progress.lastAccessed)
        };
    }

    /**
     * アクティブ日数を計算
     */
    calculateDaysActive(startDate, lastAccessed) {
        try {
            const start = new Date(startDate);
            const last = new Date(lastAccessed);
            const diffTime = Math.abs(last - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 初期化エラーの処理
     */
    handleInitializationError(error) {
        console.error('進捗管理システムの初期化に失敗しました:', error);
        
        // 破損したデータをバックアップ
        try {
            const corruptedData = localStorage.getItem(this.storageKey);
            if (corruptedData) {
                localStorage.setItem(`${this.storageKey}_backup_${Date.now()}`, corruptedData);
            }
        } catch (backupError) {
            console.error('バックアップ作成エラー:', backupError);
        }

        // 進捗データをリセット
        this.progressData = {};
        this.initialized = true;
    }

    /**
     * 保存エラーの処理
     */
    handleSaveError(error) {
        if (error.name === 'QuotaExceededError') {
            console.error('localStorageの容量が不足しています');
            // 古いバックアップデータを削除
            this.cleanupOldBackups();
        } else {
            console.error('進捗データの保存に失敗しました:', error);
        }
    }

    /**
     * 古いバックアップデータを削除
     */
    cleanupOldBackups() {
        try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(key => key.startsWith(`${this.storageKey}_backup_`));
            
            // 古いバックアップから削除（最新5個を保持）
            backupKeys.sort().slice(0, -5).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            console.error('バックアップクリーンアップエラー:', error);
        }
    }

    /**
     * 進捗データの整合性をチェック（外部から呼び出し可能）
     */
    validateDataIntegrity() {
        const issues = [];
        
        for (const [courseId, progress] of Object.entries(this.progressData)) {
            // 必須フィールドのチェック
            const requiredFields = ['completedLessons', 'completedModules', 'startDate', 'lastAccessed'];
            for (const field of requiredFields) {
                if (!(field in progress)) {
                    issues.push(`${courseId}: 必須フィールド ${field} が見つかりません`);
                }
            }

            // データ型のチェック
            if (!Array.isArray(progress.completedLessons)) {
                issues.push(`${courseId}: completedLessons が配列ではありません`);
            }
            if (!Array.isArray(progress.completedModules)) {
                issues.push(`${courseId}: completedModules が配列ではありません`);
            }

            // 日付の妥当性チェック
            if (!this.isValidDate(progress.startDate)) {
                issues.push(`${courseId}: startDate が無効な日付です`);
            }
            if (!this.isValidDate(progress.lastAccessed)) {
                issues.push(`${courseId}: lastAccessed が無効な日付です`);
            }
        }

        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * 初期化状態を確認
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * デバッグ情報を取得
     */
    getDebugInfo() {
        return {
            initialized: this.initialized,
            progressDataKeys: Object.keys(this.progressData),
            selectedCourse: this.getSelectedCourse(),
            storageUsage: this.getStorageUsage()
        };
    }

    /**
     * localStorage使用量を取得
     */
    getStorageUsage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? data.length : 0;
        } catch (error) {
            return -1;
        }
    }

    /**
     * 最終アクセス日時を更新
     */
    updateLastAccessed(courseId) {
        if (!courseId) {
            throw new Error('コースIDが指定されていません');
        }

        if (!this.progressData[courseId]) {
            this.initializeCourseProgress(courseId);
        }

        this.progressData[courseId].lastAccessed = new Date().toISOString();
        this.saveProgressData();
    }

    /**
     * 完了済みレッスンを設定（修復用）
     */
    setCompletedLessons(courseId, lessons) {
        if (!courseId) {
            throw new Error('コースIDが指定されていません');
        }

        if (!this.progressData[courseId]) {
            this.initializeCourseProgress(courseId);
        }

        if (!Array.isArray(lessons)) {
            throw new Error('レッスンリストは配列である必要があります');
        }

        this.progressData[courseId].completedLessons = [...lessons];
        this.progressData[courseId].lastAccessed = new Date().toISOString();
        this.saveProgressData();
    }

    /**
     * 完了済みモジュールを設定（修復用）
     */
    setCompletedModules(courseId, modules) {
        if (!courseId) {
            throw new Error('コースIDが指定されていません');
        }

        if (!this.progressData[courseId]) {
            this.initializeCourseProgress(courseId);
        }

        if (!Array.isArray(modules)) {
            throw new Error('モジュールリストは配列である必要があります');
        }

        this.progressData[courseId].completedModules = [...modules];
        this.progressData[courseId].lastAccessed = new Date().toISOString();
        this.saveProgressData();
    }

    /**
     * 完了済みモジュールを削除（修復用）
     */
    removeCompletedModule(courseId, moduleId) {
        if (!courseId || !moduleId) {
            throw new Error('コースIDまたはモジュールIDが指定されていません');
        }

        if (!this.progressData[courseId]) {
            return;
        }

        const progress = this.progressData[courseId];
        const index = progress.completedModules.indexOf(moduleId);
        if (index > -1) {
            progress.completedModules.splice(index, 1);
            progress.lastAccessed = new Date().toISOString();
            this.saveProgressData();
        }
    }
}

export { ProgressManager };