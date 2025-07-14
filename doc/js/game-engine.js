export class GameEngine {
    constructor() {
        this.challenges = [];
        this.currentChallengeIndex = 0;
        this.score = 0;
        this.hintsUsed = 0;
        this.attempts = 0;
        this.startTime = Date.now();
    }

    loadChallenges() {
        this.challenges = [
            {
                id: 1,
                title: "商品一覧を取得しよう",
                description: "products テーブルから商品名(product_name)と価格(unit_price)を取得してください。",
                difficulty: 1,
                expectedColumns: ["product_name", "unit_price"],
                hints: [
                    "SELECT文を使用します",
                    "FROM句でテーブルを指定します",
                    "SELECT product_name, unit_price FROM products"
                ],
                solution: "SELECT product_name, unit_price FROM products"
            },
            {
                id: 2,
                title: "全ての列を取得しよう",
                description: "products テーブルから全ての列を取得してください。",
                difficulty: 1,
                expectedColumns: ["product_id", "product_name", "category", "unit_price"],
                hints: [
                    "アスタリスク(*)を使用すると全ての列を取得できます",
                    "SELECT * FROM products"
                ],
                solution: "SELECT * FROM products"
            },
            {
                id: 3,
                title: "条件を指定して検索しよう",
                description: "products テーブルから価格が10000円以上の商品を取得してください。",
                difficulty: 2,
                expectedColumns: ["product_id", "product_name", "category", "unit_price"],
                hints: [
                    "WHERE句を使用して条件を指定します",
                    "価格の比較には >= 演算子を使用します",
                    "SELECT * FROM products WHERE unit_price >= 10000"
                ],
                solution: "SELECT * FROM products WHERE unit_price >= 10000"
            },
            {
                id: 4,
                title: "従業員情報を取得しよう",
                description: "employees テーブルから名前(first_name, last_name)とメールアドレス(email)を取得してください。",
                difficulty: 1,
                expectedColumns: ["first_name", "last_name", "email"],
                hints: [
                    "複数の列を指定する場合はカンマで区切ります",
                    "SELECT first_name, last_name, email FROM employees"
                ],
                solution: "SELECT first_name, last_name, email FROM employees"
            },
            {
                id: 5,
                title: "部門情報を確認しよう",
                description: "departments テーブルから全ての部門情報を取得してください。",
                difficulty: 1,
                expectedColumns: ["department_id", "department_name", "location"],
                hints: [
                    "全ての列を取得するには * を使用します",
                    "SELECT * FROM departments"
                ],
                solution: "SELECT * FROM departments"
            }
        ];
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

        if (!result.success) {
            return {
                correct: false,
                message: `エラー: ${result.error}`
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