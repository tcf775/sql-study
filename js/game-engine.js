export class GameEngine {
    constructor() {
        this.challenges = [];
        this.currentChallengeIndex = 0;
        this.score = 0;
        this.hintsUsed = 0;
        this.attempts = 0;
        this.startTime = Date.now();
        this.slideManager = null;
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
        if (this.currentChallengeIndex < this.challenges.length - 1) {
            this.currentChallengeIndex++;
            this.attempts = 0;
            this.hintsUsed = 0;
            return true;
        }
        return false;
    }

    previousChallenge() {
        if (this.currentChallengeIndex > 0) {
            this.currentChallengeIndex--;
            this.attempts = 0;
            this.hintsUsed = 0;
            return true;
        }
        return false;
    }

    checkAnswer(result) {
        const challenge = this.getCurrentChallenge();
        this.attempts++;

        // スライドタイプの場合は常に正解
        if (challenge.type === 'slide') {
            return {
                correct: true,
                message: "スライドを確認しました！"
            };
        }

        if (!result.success) {
            return {
                correct: false,
                message: `エラー: ${result.error}`
            };
        }

        // expectedColumnsが存在しない場合はスキップ
        if (!challenge.expectedColumns) {
            return {
                correct: true,
                message: "正解です！"
            };
        }

        // 列名チェック
        const expectedCols = challenge.expectedColumns.sort();
        const actualCols = result.columns.sort();

        if (JSON.stringify(expectedCols) !== JSON.stringify(actualCols)) {
            return {
                correct: false,
                message: `期待される列: ${expectedCols.join(', ')}\n実際の列: ${actualCols.join(', ')}`
            };
        }

        // 正解の場合
        this.calculateScore();
        return {
            correct: true,
            message: "正解です！",
            score: this.score
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

            // ユーザーのSQLでエラーが発生した場合
            if (!userResult.success) {
                return {
                    correct: false,
                    message: `SQLエラー: ${userResult.error}`
                };
            }

            // 正解SQLでエラーが発生した場合（チャレンジデータの問題）
            if (!correctResult.success) {
                console.error('正解SQLでエラーが発生:', correctResult.error);
                return {
                    correct: false,
                    message: "チャレンジデータに問題があります。管理者に報告してください。"
                };
            }

            // 結果を比較
            const isCorrect = this.compareQueryResults(userResult, correctResult);

            if (isCorrect) {
                this.calculateScore();
                return {
                    correct: true,
                    message: "正解です！素晴らしい！",
                    score: this.score,
                    userResult: userResult,
                    correctResult: correctResult
                };
            } else {
                return {
                    correct: false,
                    message: "結果が正解と一致しません。もう一度確認してください。",
                    userResult: userResult,
                    correctResult: correctResult
                };
            }

        } catch (error) {
            console.error('SQL実行エラー:', error);
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
}