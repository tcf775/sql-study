export class GameEngine {
    constructor() {
        this.challenges = [];
        this.currentChallengeIndex = 0;
        this.score = 0;
        this.hintsUsed = 0;
        this.attempts = 0;
        this.startTime = Date.now();
        this.slideManager = null;
        this.currentCourse = null;
        this.courseManager = null;
        this.adaptiveLearning = null;
    }

    setSlideManager(slideManager) {
        this.slideManager = slideManager;
    }

    async loadChallenges() {
        const response = await fetch('slides/challenges.json');
        if (!response.ok) {
            throw new Error(`チャレンジファイルの読み込みに失敗しました: ${response.status} ${response.statusText}`);
        }

        const challengesData = await response.json();

        if (!Array.isArray(challengesData) || challengesData.length === 0) {
            throw new Error('チャレンジデータが空または無効な形式です');
        }

        // チャレンジにIDを付与
        this.challenges = challengesData.map((challenge, index) => ({
            ...challenge,
            id: challenge.id || index
        }));

        console.log(`${this.challenges.length}個のチャレンジを読み込みました`);
    }

    getCurrentChallenge() {
        return this.challenges[this.currentChallengeIndex];
    }

    nextChallenge() {
        // コースが設定されている場合はコース対応版を使用
        if (this.currentCourse && this.courseManager) {
            return this.courseAwareNextChallenge();
        }
        
        // 従来の動作
        if (this.currentChallengeIndex < this.challenges.length - 1) {
            this.currentChallengeIndex++;
            this.attempts = 0;
            this.hintsUsed = 0;
            return true;
        }
        return false;
    }

    previousChallenge() {
        // コースが設定されている場合はコース対応版を使用
        if (this.currentCourse && this.courseManager) {
            return this.courseAwarePreviousChallenge();
        }
        
        // 従来の動作
        if (this.currentChallengeIndex > 0) {
            this.currentChallengeIndex--;
            this.attempts = 0;
            this.hintsUsed = 0;
            return true;
        }
        return false;
    }

    /**
     * コース対応の次のチャレンジ
     */
    courseAwareNextChallenge() {
        // 次に利用可能なチャレンジを取得
        const nextAvailable = this.getNextAvailableChallenge();
        
        if (nextAvailable) {
            // アクセス制御をチェック
            const accessResult = this.courseManager.attemptLessonAccess(
                this.currentCourse.id, 
                nextAvailable.challenge.lessonId
            );
            
            if (accessResult.success) {
                this.currentChallengeIndex = nextAvailable.index;
                this.attempts = 0;
                this.hintsUsed = 0;
                this.startTime = Date.now();
                console.log(`次のレッスンに移動: ${nextAvailable.challenge.lessonId}`);
                return true;
            } else {
                console.warn(`次のレッスンへのアクセスが拒否されました: ${accessResult.error}`);
                return false;
            }
        }
        
        // 利用可能なチャレンジがない場合は従来の動作
        if (this.currentChallengeIndex < this.challenges.length - 1) {
            const nextIndex = this.currentChallengeIndex + 1;
            const nextChallenge = this.challenges[nextIndex];
            
            // レッスンIDがある場合はアクセス制御をチェック
            if (nextChallenge.lessonId) {
                const accessResult = this.courseManager.attemptLessonAccess(
                    this.currentCourse.id, 
                    nextChallenge.lessonId
                );
                
                if (!accessResult.success) {
                    console.warn(`レッスンアクセス拒否: ${accessResult.error}`);
                    console.log(`推奨アクション: ${accessResult.suggestedAction}`);
                    return false;
                }
            }
            
            this.currentChallengeIndex = nextIndex;
            this.attempts = 0;
            this.hintsUsed = 0;
            this.startTime = Date.now();
            return true;
        }
        
        return false;
    }

    /**
     * コース対応の前のチャレンジ
     */
    courseAwarePreviousChallenge() {
        if (this.currentChallengeIndex > 0) {
            // 前のチャレンジに移動
            this.currentChallengeIndex--;
            this.attempts = 0;
            this.hintsUsed = 0;
            this.startTime = Date.now();
            
            // 前のチャレンジがアンロックされているかチェック
            const challenge = this.getCurrentChallenge();
            if (challenge.lessonId && !this.courseManager.isLessonUnlocked(this.currentCourse.id, challenge.lessonId)) {
                // アンロックされていない場合は、アンロックされている最後のチャレンジを探す
                for (let i = this.currentChallengeIndex; i >= 0; i--) {
                    const prevChallenge = this.challenges[i];
                    if (!prevChallenge.lessonId || this.courseManager.isLessonUnlocked(this.currentCourse.id, prevChallenge.lessonId)) {
                        this.currentChallengeIndex = i;
                        return true;
                    }
                }
                
                // アンロックされたチャレンジが見つからない場合は最初に戻る
                this.currentChallengeIndex = 0;
                return false;
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 前のチャレンジに移動可能かチェック
     */
    canGoPrevious() {
        if (this.currentCourse && this.courseManager) {
            return this.canGoPreviousCourseAware();
        }
        
        // 従来の動作
        return this.currentChallengeIndex > 0;
    }

    /**
     * 次のチャレンジに移動可能かチェック
     */
    canGoNext() {
        if (this.currentCourse && this.courseManager) {
            return this.canGoNextCourseAware();
        }
        
        // 従来の動作
        return this.currentChallengeIndex < this.challenges.length - 1;
    }

    /**
     * コース対応の前のチャレンジ移動可能チェック
     */
    canGoPreviousCourseAware() {
        if (this.currentChallengeIndex <= 0) {
            return false;
        }
        
        // 前のチャレンジがアンロックされているかチェック
        for (let i = this.currentChallengeIndex - 1; i >= 0; i--) {
            const challenge = this.challenges[i];
            if (!challenge.lessonId || this.courseManager.isLessonUnlocked(this.currentCourse.id, challenge.lessonId)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * コース対応の次のチャレンジ移動可能チェック
     */
    canGoNextCourseAware() {
        // 次に利用可能なチャレンジがあるかチェック
        const nextAvailable = this.getNextAvailableChallenge();
        if (nextAvailable) {
            // アクセス制御をチェック
            const accessResult = this.courseManager.attemptLessonAccess(
                this.currentCourse.id, 
                nextAvailable.challenge.lessonId
            );
            return accessResult.success;
        }
        
        // 従来の方法でチェック
        if (this.currentChallengeIndex < this.challenges.length - 1) {
            const nextChallenge = this.challenges[this.currentChallengeIndex + 1];
            if (nextChallenge.lessonId) {
                return this.courseManager.isLessonUnlocked(this.currentCourse.id, nextChallenge.lessonId);
            }
            return true;
        }
        
        return false;
    }

    checkAnswer(result) {
        const challenge = this.getCurrentChallenge();
        this.attempts++;

        // スライドタイプの場合は常に正解
        if (challenge.type === 'slide') {
            const challengeData = {
                correct: true,
                score: 0,
                attempts: this.attempts,
                hintsUsed: this.hintsUsed,
                timeSpent: Date.now() - this.startTime,
                challenge: challenge
            };
            this.trackPerformanceData(challengeData);
            
            return {
                correct: true,
                message: "スライドを確認しました！"
            };
        }

        let isCorrect = false;
        let errorType = null;
        let message = "";

        if (!result.success) {
            errorType = 'syntax';
            message = `エラー: ${result.error}`;
        } else if (!challenge.expectedColumns) {
            isCorrect = true;
            message = "正解です！";
        } else {
            // 列名チェック
            const expectedCols = challenge.expectedColumns.sort();
            const actualCols = result.columns.sort();

            if (JSON.stringify(expectedCols) !== JSON.stringify(actualCols)) {
                errorType = 'column';
                message = `期待される列: ${expectedCols.join(', ')}\n実際の列: ${actualCols.join(', ')}`;
            } else {
                isCorrect = true;
                message = "正解です！";
            }
        }

        // パフォーマンスデータを記録
        const challengeData = {
            correct: isCorrect,
            score: isCorrect ? this.calculateScore() : 0,
            attempts: this.attempts,
            hintsUsed: this.hintsUsed,
            timeSpent: Date.now() - this.startTime,
            challenge: challenge,
            errorType: errorType
        };

        this.trackPerformanceData(challengeData);

        // 正解の場合のみ進捗を更新
        if (isCorrect) {
            this.onChallengeCompleted();
        }
        
        return {
            correct: isCorrect,
            message: message,
            score: isCorrect ? challengeData.score : 0
        };
    }

    /**
     * word-reorderチャレンジの回答をチェック
     * @param {string} userSQL - ユーザーが構築したSQL
     * @returns {Promise<Object>} 結果オブジェクト
     */
    async checkWordReorderAnswer(userSQL) {
        const challenge = this.getCurrentChallenge();
        this.attempts++;

        if (!userSQL || userSQL.trim() === '') {
            const challengeData = {
                correct: false,
                score: 0,
                attempts: this.attempts,
                hintsUsed: this.hintsUsed,
                timeSpent: Date.now() - this.startTime,
                challenge: challenge,
                errorType: 'incomplete'
            };
            this.trackPerformanceData(challengeData);
            
            return {
                correct: false,
                message: "SQLを構築してください"
            };
        }

        try {
            // データベースマネージャーが利用可能かチェック
            if (!window.dbManager) {
                throw new Error('データベースが初期化されていません');
            }

            // ユーザーのSQLと正解SQLの両方を実行
            const [userResult, correctResult] = await Promise.all([
                window.dbManager.executeQuery(userSQL),
                window.dbManager.executeQuery(challenge.solution)
            ]);

            let isCorrect = false;
            let errorType = null;
            let message = "";

            // ユーザーのSQLでエラーが発生した場合
            if (!userResult.success) {
                errorType = 'syntax';
                message = `SQLエラー: ${userResult.error}`;
            }
            // 正解SQLでエラーが発生した場合（チャレンジデータの問題）
            else if (!correctResult.success) {
                console.error('正解SQLでエラーが発生:', correctResult.error);
                errorType = 'system';
                message = "チャレンジデータに問題があります。管理者に報告してください。";
            }
            // 結果を比較
            else {
                isCorrect = this.compareQueryResults(userResult, correctResult);
                
                if (isCorrect) {
                    message = "正解です！素晴らしい！";
                } else {
                    errorType = 'logic';
                    message = "結果が正解と一致しません。もう一度確認してください。";
                }
            }

            // パフォーマンスデータを記録
            const challengeData = {
                correct: isCorrect,
                score: isCorrect ? this.calculateScore() : 0,
                attempts: this.attempts,
                hintsUsed: this.hintsUsed,
                timeSpent: Date.now() - this.startTime,
                challenge: challenge,
                errorType: errorType
            };

            this.trackPerformanceData(challengeData);

            // 正解の場合のみ進捗を更新
            if (isCorrect) {
                this.onChallengeCompleted();
            }

            const result = {
                correct: isCorrect,
                message: message,
                score: isCorrect ? challengeData.score : 0
            };

            // 結果データを含める（デバッグ用）
            if (userResult && correctResult) {
                result.userResult = userResult;
                result.correctResult = correctResult;
            }

            return result;

        } catch (error) {
            console.error('SQL実行エラー:', error);
            
            const challengeData = {
                correct: false,
                score: 0,
                attempts: this.attempts,
                hintsUsed: this.hintsUsed,
                timeSpent: Date.now() - this.startTime,
                challenge: challenge,
                errorType: 'system'
            };
            this.trackPerformanceData(challengeData);
            
            return {
                correct: false,
                message: `実行エラー: ${error.message}`
            };
        }
    }

    /**
     * 2つのクエリ結果を比較
     * @param {Object} result1 - 1つ目の結果
     * @param {Object} result2 - 2つ目の結果
     * @returns {boolean} 結果が一致するかどうか
     */
    compareQueryResults(result1, result2) {
        // 両方とも成功している必要がある
        if (!result1.success || !result2.success) {
            return false;
        }

        // カラム数の比較
        if (result1.columns.length !== result2.columns.length) {
            return false;
        }

        // カラム名の比較（順序も考慮）
        for (let i = 0; i < result1.columns.length; i++) {
            if (result1.columns[i] !== result2.columns[i]) {
                return false;
            }
        }

        // 行数の比較
        if (result1.data.length !== result2.data.length) {
            return false;
        }

        // データの比較（行ごと）
        for (let i = 0; i < result1.data.length; i++) {
            const row1 = result1.data[i];
            const row2 = result2.data[i];

            // 各カラムの値を比較
            for (const column of result1.columns) {
                const value1 = row1[column];
                const value2 = row2[column];

                // 値の比較（型も考慮）
                if (!this.compareValues(value1, value2)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 2つの値を比較（型変換も考慮）
     * @param {any} value1 - 1つ目の値
     * @param {any} value2 - 2つ目の値
     * @returns {boolean} 値が一致するかどうか
     */
    compareValues(value1, value2) {
        // 完全一致の場合
        if (value1 === value2) {
            return true;
        }

        // null/undefined の処理
        if (value1 == null && value2 == null) {
            return true;
        }

        if (value1 == null || value2 == null) {
            return false;
        }

        // 数値の比較（文字列として格納されている場合も考慮）
        const num1 = Number(value1);
        const num2 = Number(value2);
        
        if (!isNaN(num1) && !isNaN(num2)) {
            return Math.abs(num1 - num2) < 1e-10; // 浮動小数点の誤差を考慮
        }

        // 文字列として比較
        return String(value1) === String(value2);
    }

    calculateScore() {
        const baseScore = 100;
        const attemptPenalty = Math.max(0, (this.attempts - 1) * 10);
        const hintPenalty = this.hintsUsed * 5;
        const timeBonus = Math.max(0, 60 - Math.floor((Date.now() - this.startTime) / 1000));

        const challengeScore = Math.max(10, baseScore - attemptPenalty - hintPenalty + timeBonus);
        this.score += challengeScore;
        return challengeScore;
    }

    /**
     * パフォーマンスデータを追跡
     */
    trackPerformanceData(challengeData) {
        if (this.adaptiveLearning && this.adaptiveLearning.isInitialized() && 
            this.currentCourse && challengeData.challenge && challengeData.challenge.lessonId) {
            this.adaptiveLearning.trackPerformance(
                this.currentCourse.id, 
                challengeData.challenge.lessonId, 
                challengeData
            );
        }
    }

    getHint(level = 0) {
        const challenge = this.getCurrentChallenge();
        if (level < challenge.hints.length) {
            this.hintsUsed++;
            return challenge.hints[level];
        }
        return null;
    }

    getProgress() {
        return {
            current: this.currentChallengeIndex + 1,
            total: this.challenges.length,
            percentage: ((this.currentChallengeIndex + 1) / this.challenges.length) * 100
        };
    }

    reset() {
        this.currentChallengeIndex = 0;
        this.score = 0;
        this.hintsUsed = 0;
        this.attempts = 0;
        this.startTime = Date.now();
    }

    /**
     * CourseManagerを設定
     */
    setCourseManager(courseManager) {
        this.courseManager = courseManager;
    }

    /**
     * AdaptiveLearningを設定
     */
    setAdaptiveLearning(adaptiveLearning) {
        this.adaptiveLearning = adaptiveLearning;
    }

    /**
     * 現在のコースを設定
     */
    async setCourse(course) {
        this.currentCourse = course;
        
        // コースに基づいてチャレンジを読み込み
        await this.loadCourseChallenge();
        
        // 進捗に基づいて現在のチャレンジインデックスを設定
        this.setCurrentChallengeFromProgress();
    }

    /**
     * 現在のコースのチャレンジを読み込み
     */
    async loadCourseChallenge() {
        if (!this.currentCourse || !this.courseManager) {
            console.warn('コースまたはCourseManagerが設定されていません');
            return;
        }

        try {
            // コースの全レッスンIDを取得
            const allLessons = [];
            this.currentCourse.modules.forEach(module => {
                module.lessons.forEach(lessonId => {
                    allLessons.push(lessonId);
                });
            });

            // 各レッスンのチャレンジデータを取得
            this.challenges = [];
            for (const lessonId of allLessons) {
                const challenge = this.courseManager.getCurrentCourseChallenge(lessonId);
                if (challenge) {
                    this.challenges.push({
                        ...challenge,
                        lessonId: lessonId
                    });
                } else {
                    console.warn(`チャレンジが見つかりません: ${lessonId}`);
                }
            }

            console.log(`コース "${this.currentCourse.title}" のチャレンジを読み込みました: ${this.challenges.length}個`);
            
        } catch (error) {
            console.error('コースチャレンジ読み込みエラー:', error);
            // フォールバック: デフォルトチャレンジを読み込み
            await this.loadChallenges();
        }
    }

    /**
     * 進捗に基づいて現在のチャレンジインデックスを設定
     */
    setCurrentChallengeFromProgress() {
        if (!this.currentCourse || !this.courseManager) {
            return;
        }

        const progress = this.courseManager.getCurrentCourseProgress();
        if (!progress) {
            this.currentChallengeIndex = 0;
            return;
        }

        // 完了していない最初のレッスンを見つける
        for (let i = 0; i < this.challenges.length; i++) {
            const challenge = this.challenges[i];
            if (challenge.lessonId && !progress.completedLessons.includes(challenge.lessonId)) {
                // レッスンがアンロックされているかチェック
                if (this.courseManager.isLessonUnlocked(this.currentCourse.id, challenge.lessonId)) {
                    this.currentChallengeIndex = i;
                    return;
                }
            }
        }

        // 全て完了している場合は最後のチャレンジ
        this.currentChallengeIndex = Math.max(0, this.challenges.length - 1);
    }

    /**
     * 現在のコースの進捗を取得
     */
    getCurrentCourseProgress() {
        if (!this.currentCourse || !this.courseManager) {
            return this.getProgress();
        }

        const progress = this.courseManager.getCurrentCourseProgress();
        if (!progress) {
            return this.getProgress();
        }

        const totalLessons = this.challenges.length;
        const completedLessons = progress.completedLessons.length;

        return {
            current: completedLessons + 1,
            total: totalLessons,
            percentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
            courseProgress: progress,
            isCompleted: progress.isCompleted,
            totalScore: progress.totalScore || 0,
            completedModules: progress.completedModules.length,
            totalModules: this.currentCourse.modules.length
        };
    }

    /**
     * コースに基づいてフィルタされたチャレンジを取得
     */
    getFilteredChallenges() {
        if (!this.currentCourse) {
            return this.challenges;
        }

        // 現在のコースのレッスンのみを返す
        return this.challenges.filter(challenge => {
            if (!challenge.lessonId) return true;
            
            // レッスンがコースに含まれているかチェック
            for (const module of this.currentCourse.modules) {
                if (module.lessons.includes(challenge.lessonId)) {
                    return true;
                }
            }
            return false;
        });
    }

    /**
     * チャレンジ完了時の処理（コース対応）
     */
    onChallengeCompleted() {
        const challenge = this.getCurrentChallenge();
        
        if (this.currentCourse && this.courseManager && challenge.lessonId) {
            // コースの進捗を更新
            this.courseManager.updateProgress(this.currentCourse.id, challenge.lessonId, this.score);
            console.log(`レッスン完了: ${challenge.lessonId}`);
            
            // 適応的学習システムでパフォーマンスを追跡
            if (this.adaptiveLearning && this.adaptiveLearning.isInitialized()) {
                const challengeData = {
                    correct: true,
                    score: this.score,
                    attempts: this.attempts,
                    hintsUsed: this.hintsUsed,
                    timeSpent: Date.now() - this.startTime,
                    challenge: challenge
                };
                this.adaptiveLearning.trackPerformance(this.currentCourse.id, challenge.lessonId, challengeData);
            }
            
            // ProgressUIに進捗更新を通知
            if (window.progressUI && typeof window.progressUI.onProgressUpdated === 'function') {
                window.progressUI.onProgressUpdated();
            }
        }
    }



    /**
     * 指定されたレッスンに現在のチャレンジを設定（アクセス制御付き）
     */
    setCurrentLesson(lessonId) {
        // コースが設定されている場合はアクセス制御をチェック
        if (this.currentCourse && this.courseManager) {
            const accessResult = this.courseManager.attemptLessonAccess(this.currentCourse.id, lessonId);
            if (!accessResult.success) {
                console.warn(`レッスンアクセス拒否: ${accessResult.error}`);
                console.log(`推奨アクション: ${accessResult.suggestedAction}`);
                return {
                    success: false,
                    error: accessResult.error,
                    suggestedAction: accessResult.suggestedAction
                };
            }
        }

        // レッスンを検索して設定
        for (let i = 0; i < this.challenges.length; i++) {
            const challenge = this.challenges[i];
            if (challenge.lessonId === lessonId) {
                this.currentChallengeIndex = i;
                this.attempts = 0;
                this.hintsUsed = 0;
                this.startTime = Date.now();
                console.log(`レッスンに移動: ${lessonId}`);
                return {
                    success: true,
                    lessonId: lessonId,
                    challengeIndex: i
                };
            }
        }
        
        return {
            success: false,
            error: `レッスン ${lessonId} が見つかりません`,
            suggestedAction: 'コースデータを確認してください'
        };
    }

    /**
     * レッスンアクセス試行（UI用）
     */
    attemptLessonAccess(lessonId) {
        if (!this.currentCourse || !this.courseManager) {
            return this.setCurrentLesson(lessonId);
        }

        const accessResult = this.courseManager.attemptLessonAccess(this.currentCourse.id, lessonId);
        
        if (accessResult.success) {
            return this.setCurrentLesson(lessonId);
        } else {
            // ErrorHandlerを使用して不正アクセスを処理
            if (window.errorHandler) {
                const errorResult = window.errorHandler.handleError('INVALID_ACCESS', new Error(accessResult.error), {
                    courseId: this.currentCourse.id,
                    lessonId: lessonId,
                    currentProgress: this.courseManager.getCurrentCourseProgress(),
                    attemptedAction: 'lesson_access',
                    lessonLocked: !this.courseManager.isLessonUnlocked(this.currentCourse.id, lessonId)
                });
                
                return {
                    success: false,
                    error: accessResult.error,
                    suggestedAction: accessResult.suggestedAction,
                    lessonId: lessonId,
                    errorHandled: true,
                    errorResult: errorResult
                };
            }
            
            return {
                success: false,
                error: accessResult.error,
                suggestedAction: accessResult.suggestedAction,
                lessonId: lessonId
            };
        }
    }

    /**
     * コース完了判定
     */
    isCourseCompleted() {
        if (!this.currentCourse || !this.courseManager) {
            return false;
        }

        const progress = this.courseManager.getCurrentCourseProgress();
        return progress ? progress.isCompleted : false;
    }

    /**
     * モジュール完了判定
     */
    isModuleCompleted(moduleId) {
        if (!this.currentCourse || !this.courseManager) {
            return false;
        }

        const progress = this.courseManager.getCurrentCourseProgress();
        return progress ? progress.completedModules.includes(moduleId) : false;
    }

    /**
     * 現在のモジュールを取得
     */
    getCurrentModule() {
        if (!this.currentCourse) {
            return null;
        }

        const challenge = this.getCurrentChallenge();
        if (!challenge || !challenge.lessonId) {
            return null;
        }

        // レッスンが属するモジュールを見つける
        for (const module of this.currentCourse.modules) {
            if (module.lessons.includes(challenge.lessonId)) {
                return module;
            }
        }

        return null;
    }

    /**
     * コース全体のスコア計算
     */
    calculateCourseScore() {
        if (!this.currentCourse || !this.courseManager) {
            return 0;
        }

        const progress = this.courseManager.getCurrentCourseProgress();
        if (!progress) {
            return 0;
        }

        // 基本スコア（完了したレッスン数に基づく）
        const completedLessons = progress.completedLessons.length;
        const totalLessons = this.challenges.length;
        const completionRatio = totalLessons > 0 ? completedLessons / totalLessons : 0;
        
        // 完了ボーナス
        const completionBonus = progress.isCompleted ? 500 : 0;
        
        // モジュール完了ボーナス
        const moduleBonus = progress.completedModules.length * 100;
        
        // 時間ボーナス（早期完了）
        let timeBonus = 0;
        if (progress.startDate && progress.lastAccessed) {
            const startTime = new Date(progress.startDate).getTime();
            const endTime = new Date(progress.lastAccessed).getTime();
            const hoursSpent = (endTime - startTime) / (1000 * 60 * 60);
            const estimatedHours = this.currentCourse.estimatedHours || 8;
            
            if (hoursSpent < estimatedHours) {
                timeBonus = Math.max(0, (estimatedHours - hoursSpent) * 10);
            }
        }

        return Math.floor((progress.totalScore || 0) + completionBonus + moduleBonus + timeBonus);
    }

    /**
     * 次に利用可能なチャレンジを取得
     */
    getNextAvailableChallenge() {
        if (!this.currentCourse || !this.courseManager) {
            return null;
        }

        for (let i = this.currentChallengeIndex + 1; i < this.challenges.length; i++) {
            const challenge = this.challenges[i];
            if (challenge.lessonId && this.courseManager.isLessonUnlocked(this.currentCourse.id, challenge.lessonId)) {
                return {
                    index: i,
                    challenge: challenge
                };
            }
        }

        return null;
    }

    /**
     * コース進捗の詳細情報を取得
     */
    getCourseProgressDetails() {
        if (!this.currentCourse || !this.courseManager) {
            return null;
        }

        const progress = this.courseManager.getCurrentCourseProgress();
        if (!progress) {
            return null;
        }

        const moduleProgress = this.currentCourse.modules.map(module => {
            const completedLessonsInModule = module.lessons.filter(lessonId => 
                progress.completedLessons.includes(lessonId)
            ).length;

            return {
                id: module.id,
                title: module.title,
                totalLessons: module.lessons.length,
                completedLessons: completedLessonsInModule,
                isCompleted: progress.completedModules.includes(module.id),
                percentage: module.lessons.length > 0 ? (completedLessonsInModule / module.lessons.length) * 100 : 0
            };
        });

        return {
            courseId: this.currentCourse.id,
            courseTitle: this.currentCourse.title,
            totalScore: this.calculateCourseScore(),
            isCompleted: progress.isCompleted,
            totalLessons: this.challenges.length,
            completedLessons: progress.completedLessons.length,
            totalModules: this.currentCourse.modules.length,
            completedModules: progress.completedModules.length,
            moduleProgress: moduleProgress,
            startDate: progress.startDate,
            lastAccessed: progress.lastAccessed
        };
    }

    /**
     * 学習統計を取得
     */
    getLearningStats() {
        if (!this.currentCourse || !this.courseManager) {
            return null;
        }

        const progressDetails = this.getCourseProgressDetails();
        if (!progressDetails) {
            return null;
        }

        const averageScore = progressDetails.completedLessons > 0 ? 
            progressDetails.totalScore / progressDetails.completedLessons : 0;

        let studyTime = 0;
        if (progressDetails.startDate && progressDetails.lastAccessed) {
            const startTime = new Date(progressDetails.startDate).getTime();
            const endTime = new Date(progressDetails.lastAccessed).getTime();
            studyTime = (endTime - startTime) / (1000 * 60 * 60); // 時間単位
        }

        return {
            totalScore: progressDetails.totalScore,
            averageScore: Math.round(averageScore),
            studyTimeHours: Math.round(studyTime * 10) / 10,
            completionRate: progressDetails.completedLessons / progressDetails.totalLessons,
            moduleCompletionRate: progressDetails.completedModules / progressDetails.totalModules,
            estimatedTimeRemaining: this.calculateEstimatedTimeRemaining()
        };
    }

    /**
     * 残り推定時間を計算
     */
    calculateEstimatedTimeRemaining() {
        if (!this.currentCourse || !this.courseManager) {
            return 0;
        }

        const progress = this.courseManager.getCurrentCourseProgress();
        if (!progress) {
            return this.currentCourse.estimatedHours || 0;
        }

        const totalLessons = this.challenges.length;
        const completedLessons = progress.completedLessons.length;
        const remainingLessons = totalLessons - completedLessons;
        
        if (remainingLessons <= 0) {
            return 0;
        }

        const estimatedHours = this.currentCourse.estimatedHours || 8;
        const remainingRatio = remainingLessons / totalLessons;
        
        return Math.round(estimatedHours * remainingRatio * 10) / 10;
    }

    /**
     * 適応的学習の推奨事項を取得
     */
    getAdaptiveLearningRecommendations() {
        if (!this.adaptiveLearning || !this.adaptiveLearning.isInitialized() || !this.currentCourse) {
            return null;
        }

        const challenge = this.getCurrentChallenge();
        if (!challenge || !challenge.lessonId) {
            return null;
        }

        return this.adaptiveLearning.recommendNextLesson(this.currentCourse.id, challenge.lessonId);
    }

    /**
     * 困難な概念を取得
     */
    getDifficultConcepts() {
        if (!this.adaptiveLearning || !this.adaptiveLearning.isInitialized() || !this.currentCourse) {
            return [];
        }

        return this.adaptiveLearning.detectDifficultConcepts(this.currentCourse.id);
    }

    /**
     * 追加練習問題を取得
     */
    getAdditionalPractice(conceptId) {
        if (!this.adaptiveLearning || !this.adaptiveLearning.isInitialized() || !this.currentCourse) {
            return null;
        }

        return this.adaptiveLearning.suggestAdditionalPractice(this.currentCourse.id, conceptId);
    }

    /**
     * 学習レポートを生成
     */
    generateLearningReport() {
        if (!this.adaptiveLearning || !this.adaptiveLearning.isInitialized() || !this.currentCourse) {
            return null;
        }

        return this.adaptiveLearning.generateLearningReport(this.currentCourse.id);
    }

    /**
     * ユーザーの習熟度を分析
     */
    analyzeUserProficiency() {
        if (!this.adaptiveLearning || !this.adaptiveLearning.isInitialized() || !this.currentCourse) {
            return null;
        }

        return this.adaptiveLearning.analyzeUserProficiency(this.currentCourse.id);
    }
}