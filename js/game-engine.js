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