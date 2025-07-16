/**
 * AdaptiveLearning - 適応的学習機能
 * ユーザーの回答パフォーマンス追跡、困難な概念の検出、習熟度に応じた推奨機能を提供
 */
class AdaptiveLearning {
    constructor(courseManager, gameEngine) {
        this.courseManager = courseManager;
        this.gameEngine = gameEngine;
        this.performanceData = {};
        this.difficultyThresholds = {
            struggling: 0.4,    // 40%以下の正答率で困難と判定
            proficient: 0.8,    // 80%以上の正答率で習熟と判定
            minAttempts: 3       // 最低試行回数
        };
        this.conceptCategories = this.initializeConceptCategories();
        this.initialized = false;
    }

    /**
     * 適応的学習システムを初期化
     */
    async initialize() {
        try {
            this.loadPerformanceData();
            this.initialized = true;
            console.log('適応的学習システムが初期化されました');
            return true;
        } catch (error) {
            console.error('適応的学習システム初期化エラー:', error);
            this.performanceData = {};
            this.initialized = true;
            return false;
        }
    }

    /**
     * 概念カテゴリを初期化
     */
    initializeConceptCategories() {
        return {
            'sql-basics': {
                'basic-select': {
                    name: 'SELECT文の基本',
                    keywords: ['SELECT', 'FROM', 'basic', 'table'],
                    difficulty: 1,
                    prerequisites: []
                },
                'where-clause': {
                    name: 'WHERE句による絞り込み',
                    keywords: ['WHERE', 'filter', 'condition', '=', '>', '<'],
                    difficulty: 2,
                    prerequisites: ['basic-select']
                },
                'order-limit': {
                    name: 'ORDER BYとLIMIT',
                    keywords: ['ORDER BY', 'LIMIT', 'ASC', 'DESC', 'sort'],
                    difficulty: 2,
                    prerequisites: ['basic-select']
                },
                'aggregate': {
                    name: '集約関数',
                    keywords: ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'aggregate'],
                    difficulty: 3,
                    prerequisites: ['basic-select', 'where-clause']
                },
                'group-by': {
                    name: 'GROUP BYとHAVING',
                    keywords: ['GROUP BY', 'HAVING', 'group', 'aggregate'],
                    difficulty: 4,
                    prerequisites: ['aggregate']
                },
                'joins': {
                    name: 'テーブル結合',
                    keywords: ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'relationship'],
                    difficulty: 5,
                    prerequisites: ['basic-select', 'where-clause']
                },
                'subqueries': {
                    name: 'サブクエリ',
                    keywords: ['subquery', 'EXISTS', 'IN', 'nested'],
                    difficulty: 6,
                    prerequisites: ['joins', 'aggregate']
                }
            },
            'db-fundamentals': {
                'ddl-basics': {
                    name: 'DDL基本操作',
                    keywords: ['CREATE', 'ALTER', 'DROP', 'TABLE', 'schema'],
                    difficulty: 3,
                    prerequisites: []
                },
                'dml-operations': {
                    name: 'DML操作',
                    keywords: ['INSERT', 'UPDATE', 'DELETE', 'data manipulation'],
                    difficulty: 3,
                    prerequisites: ['ddl-basics']
                },
                'constraints': {
                    name: '制約とインデックス',
                    keywords: ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'INDEX', 'constraint'],
                    difficulty: 4,
                    prerequisites: ['ddl-basics']
                },
                'transactions': {
                    name: 'トランザクション管理',
                    keywords: ['TRANSACTION', 'COMMIT', 'ROLLBACK', 'ACID'],
                    difficulty: 5,
                    prerequisites: ['dml-operations']
                }
            },
            'big-data-basics': {
                'duckdb-features': {
                    name: 'DuckDBの特徴',
                    keywords: ['DuckDB', 'columnar', 'analytics', 'performance'],
                    difficulty: 4,
                    prerequisites: []
                },
                'file-processing': {
                    name: 'ファイル処理',
                    keywords: ['CSV', 'Parquet', 'JSON', 'file', 'import'],
                    difficulty: 4,
                    prerequisites: ['duckdb-features']
                },
                'window-functions': {
                    name: 'ウィンドウ関数',
                    keywords: ['WINDOW', 'ROW_NUMBER', 'RANK', 'LAG', 'LEAD'],
                    difficulty: 6,
                    prerequisites: ['file-processing']
                },
                'performance-optimization': {
                    name: 'パフォーマンス最適化',
                    keywords: ['optimization', 'index', 'partition', 'parallel'],
                    difficulty: 7,
                    prerequisites: ['window-functions']
                },
                'etl-pipelines': {
                    name: 'ETLパイプライン',
                    keywords: ['ETL', 'pipeline', 'workflow', 'automation'],
                    difficulty: 8,
                    prerequisites: ['performance-optimization']
                }
            }
        };
    }

    /**
     * ユーザーの回答パフォーマンスを追跡
     */
    trackPerformance(courseId, lessonId, challengeData) {
        if (!courseId || !lessonId || !challengeData) {
            console.warn('パフォーマンス追跡に必要なデータが不足しています');
            return;
        }

        // コースのパフォーマンスデータを初期化
        if (!this.performanceData[courseId]) {
            this.performanceData[courseId] = {};
        }

        // レッスンのパフォーマンスデータを初期化
        if (!this.performanceData[courseId][lessonId]) {
            this.performanceData[courseId][lessonId] = {
                attempts: [],
                concepts: {},
                firstAttemptTime: Date.now(),
                lastAttemptTime: Date.now(),
                totalTimeSpent: 0,
                hintsUsed: 0,
                averageScore: 0,
                isCompleted: false
            };
        }

        const lessonPerformance = this.performanceData[courseId][lessonId];

        // 試行データを記録
        const attemptData = {
            timestamp: Date.now(),
            correct: challengeData.correct || false,
            score: challengeData.score || 0,
            attempts: challengeData.attempts || 1,
            hintsUsed: challengeData.hintsUsed || 0,
            timeSpent: challengeData.timeSpent || 0,
            errorType: challengeData.errorType || null,
            concepts: this.identifyConcepts(courseId, challengeData.challenge)
        };

        lessonPerformance.attempts.push(attemptData);
        lessonPerformance.lastAttemptTime = Date.now();
        lessonPerformance.totalTimeSpent += attemptData.timeSpent;
        lessonPerformance.hintsUsed += attemptData.hintsUsed;

        // 概念別パフォーマンスを更新
        this.updateConceptPerformance(lessonPerformance, attemptData);

        // 平均スコアを計算
        this.calculateAverageScore(lessonPerformance);

        // 完了状態を更新
        if (challengeData.correct) {
            lessonPerformance.isCompleted = true;
        }

        // データを保存
        this.savePerformanceData();

        console.log(`パフォーマンス追跡: ${courseId} - ${lessonId}`, attemptData);
    }

    /**
     * チャレンジから概念を識別
     */
    identifyConcepts(courseId, challenge) {
        if (!challenge || !this.conceptCategories[courseId]) {
            return [];
        }

        const identifiedConcepts = [];
        const challengeText = (challenge.question + ' ' + (challenge.solution || '')).toLowerCase();

        for (const [conceptId, concept] of Object.entries(this.conceptCategories[courseId])) {
            const matchCount = concept.keywords.filter(keyword => 
                challengeText.includes(keyword.toLowerCase())
            ).length;

            if (matchCount > 0) {
                identifiedConcepts.push({
                    id: conceptId,
                    name: concept.name,
                    matchCount: matchCount,
                    difficulty: concept.difficulty
                });
            }
        }

        return identifiedConcepts.sort((a, b) => b.matchCount - a.matchCount);
    }

    /**
     * 概念別パフォーマンスを更新
     */
    updateConceptPerformance(lessonPerformance, attemptData) {
        attemptData.concepts.forEach(concept => {
            if (!lessonPerformance.concepts[concept.id]) {
                lessonPerformance.concepts[concept.id] = {
                    name: concept.name,
                    attempts: 0,
                    correctAttempts: 0,
                    totalScore: 0,
                    averageScore: 0,
                    successRate: 0,
                    difficulty: concept.difficulty,
                    strugglingIndicators: []
                };
            }

            const conceptPerf = lessonPerformance.concepts[concept.id];
            conceptPerf.attempts++;
            
            if (attemptData.correct) {
                conceptPerf.correctAttempts++;
            }
            
            conceptPerf.totalScore += attemptData.score;
            conceptPerf.averageScore = conceptPerf.totalScore / conceptPerf.attempts;
            conceptPerf.successRate = conceptPerf.correctAttempts / conceptPerf.attempts;

            // 困難指標を記録
            if (!attemptData.correct) {
                conceptPerf.strugglingIndicators.push({
                    timestamp: attemptData.timestamp,
                    errorType: attemptData.errorType,
                    attempts: attemptData.attempts,
                    hintsUsed: attemptData.hintsUsed
                });
            }
        });
    }

    /**
     * 平均スコアを計算
     */
    calculateAverageScore(lessonPerformance) {
        if (lessonPerformance.attempts.length === 0) {
            lessonPerformance.averageScore = 0;
            return;
        }

        const totalScore = lessonPerformance.attempts.reduce((sum, attempt) => sum + attempt.score, 0);
        lessonPerformance.averageScore = totalScore / lessonPerformance.attempts.length;
    }

    /**
     * 困難な概念を検出
     */
    detectDifficultConcepts(courseId, userId = 'default') {
        if (!this.performanceData[courseId]) {
            return [];
        }

        const difficultConcepts = [];
        const conceptSummary = {};

        // 全レッスンから概念パフォーマンスを集約
        for (const [lessonId, lessonPerf] of Object.entries(this.performanceData[courseId])) {
            for (const [conceptId, conceptPerf] of Object.entries(lessonPerf.concepts)) {
                if (!conceptSummary[conceptId]) {
                    conceptSummary[conceptId] = {
                        name: conceptPerf.name,
                        totalAttempts: 0,
                        totalCorrect: 0,
                        totalScore: 0,
                        difficulty: conceptPerf.difficulty,
                        strugglingIndicators: [],
                        lessons: []
                    };
                }

                const summary = conceptSummary[conceptId];
                summary.totalAttempts += conceptPerf.attempts;
                summary.totalCorrect += conceptPerf.correctAttempts;
                summary.totalScore += conceptPerf.totalScore;
                summary.strugglingIndicators.push(...conceptPerf.strugglingIndicators);
                summary.lessons.push(lessonId);
            }
        }

        // 困難な概念を判定
        for (const [conceptId, summary] of Object.entries(conceptSummary)) {
            if (summary.totalAttempts >= this.difficultyThresholds.minAttempts) {
                const successRate = summary.totalCorrect / summary.totalAttempts;
                const averageScore = summary.totalScore / summary.totalAttempts;

                if (successRate <= this.difficultyThresholds.struggling) {
                    difficultConcepts.push({
                        id: conceptId,
                        name: summary.name,
                        successRate: successRate,
                        averageScore: averageScore,
                        totalAttempts: summary.totalAttempts,
                        difficulty: summary.difficulty,
                        strugglingIndicators: summary.strugglingIndicators,
                        affectedLessons: summary.lessons,
                        recommendedActions: this.generateRecommendedActions(conceptId, summary)
                    });
                }
            }
        }

        return difficultConcepts.sort((a, b) => a.successRate - b.successRate);
    }

    /**
     * 推奨アクションを生成
     */
    generateRecommendedActions(conceptId, summary) {
        const actions = [];

        // 基本的な復習の推奨
        actions.push({
            type: 'review',
            title: '基本概念の復習',
            description: `${summary.name}の基本的な使い方を復習しましょう`,
            priority: 'high'
        });

        // 前提条件の確認
        const courseId = Object.keys(this.performanceData)[0]; // 現在のコース
        if (this.conceptCategories[courseId] && this.conceptCategories[courseId][conceptId]) {
            const concept = this.conceptCategories[courseId][conceptId];
            if (concept.prerequisites.length > 0) {
                actions.push({
                    type: 'prerequisites',
                    title: '前提条件の確認',
                    description: `まず ${concept.prerequisites.join(', ')} を確実に理解しましょう`,
                    priority: 'high',
                    prerequisites: concept.prerequisites
                });
            }
        }

        // 追加練習問題の提案
        if (summary.totalAttempts < 10) {
            actions.push({
                type: 'practice',
                title: '追加練習問題',
                description: `${summary.name}に関する追加の練習問題を解いてみましょう`,
                priority: 'medium'
            });
        }

        // エラーパターンに基づく具体的なアドバイス
        const commonErrors = this.analyzeCommonErrors(summary.strugglingIndicators);
        if (commonErrors.length > 0) {
            actions.push({
                type: 'error-analysis',
                title: 'よくあるエラーの対策',
                description: '特に注意すべきポイントを確認しましょう',
                priority: 'medium',
                commonErrors: commonErrors
            });
        }

        return actions;
    }

    /**
     * よくあるエラーを分析
     */
    analyzeCommonErrors(strugglingIndicators) {
        const errorCounts = {};
        
        strugglingIndicators.forEach(indicator => {
            if (indicator.errorType) {
                errorCounts[indicator.errorType] = (errorCounts[indicator.errorType] || 0) + 1;
            }
        });

        return Object.entries(errorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([errorType, count]) => ({
                type: errorType,
                count: count,
                advice: this.getErrorAdvice(errorType)
            }));
    }

    /**
     * エラータイプに応じたアドバイスを取得
     */
    getErrorAdvice(errorType) {
        const adviceMap = {
            'syntax': 'SQL構文を再確認し、カンマやセミコロンの位置に注意しましょう',
            'column': '列名のスペルや存在を確認しましょう',
            'table': 'テーブル名が正しいか確認しましょう',
            'join': '結合条件を正しく指定しているか確認しましょう',
            'aggregate': '集約関数の使い方を復習しましょう',
            'logic': 'WHERE句の条件ロジックを見直しましょう'
        };
        
        return adviceMap[errorType] || '基本的な構文を再確認しましょう';
    }

    /**
     * 追加練習問題を提案
     */
    suggestAdditionalPractice(courseId, conceptId) {
        const difficultConcepts = this.detectDifficultConcepts(courseId);
        const targetConcept = difficultConcepts.find(concept => concept.id === conceptId);
        
        if (!targetConcept) {
            return null;
        }

        // 概念の難易度に応じた練習問題を生成
        const practiceProblems = this.generatePracticeProblems(courseId, conceptId, targetConcept);
        
        return {
            conceptId: conceptId,
            conceptName: targetConcept.name,
            currentPerformance: {
                successRate: targetConcept.successRate,
                averageScore: targetConcept.averageScore,
                totalAttempts: targetConcept.totalAttempts
            },
            practiceProblems: practiceProblems,
            estimatedTime: practiceProblems.length * 5, // 1問あたり5分と仮定
            recommendedActions: targetConcept.recommendedActions
        };
    }

    /**
     * 練習問題を生成
     */
    generatePracticeProblems(courseId, conceptId, conceptData) {
        const problems = [];
        
        // 概念に基づいた基本的な練習問題テンプレート
        const problemTemplates = {
            'basic-select': [
                {
                    question: 'customers テーブルから全ての列を取得してください',
                    solution: 'SELECT * FROM customers;',
                    difficulty: 1
                },
                {
                    question: 'products テーブルから product_name と price 列のみを取得してください',
                    solution: 'SELECT product_name, price FROM products;',
                    difficulty: 1
                }
            ],
            'where-clause': [
                {
                    question: 'customers テーブルから city が "Tokyo" の顧客を取得してください',
                    solution: 'SELECT * FROM customers WHERE city = "Tokyo";',
                    difficulty: 2
                },
                {
                    question: 'products テーブルから price が 1000 以上の商品を取得してください',
                    solution: 'SELECT * FROM products WHERE price >= 1000;',
                    difficulty: 2
                }
            ],
            'aggregate': [
                {
                    question: 'orders テーブルの注文数を数えてください',
                    solution: 'SELECT COUNT(*) FROM orders;',
                    difficulty: 3
                },
                {
                    question: 'products テーブルの平均価格を計算してください',
                    solution: 'SELECT AVG(price) FROM products;',
                    difficulty: 3
                }
            ]
        };

        const templates = problemTemplates[conceptId] || [];
        
        // 現在のパフォーマンスに基づいて問題を選択
        const maxDifficulty = conceptData.successRate < 0.3 ? 2 : 
                             conceptData.successRate < 0.6 ? 3 : 4;

        templates.forEach((template, index) => {
            if (template.difficulty <= maxDifficulty) {
                problems.push({
                    id: `practice-${conceptId}-${index}`,
                    question: template.question,
                    solution: template.solution,
                    difficulty: template.difficulty,
                    type: 'practice',
                    conceptId: conceptId,
                    hints: this.generateHints(template)
                });
            }
        });

        return problems;
    }

    /**
     * ヒントを生成
     */
    generateHints(problemTemplate) {
        const hints = [];
        
        if (problemTemplate.solution.includes('SELECT')) {
            hints.push('SELECT文を使用してデータを取得します');
        }
        if (problemTemplate.solution.includes('WHERE')) {
            hints.push('WHERE句を使用して条件を指定します');
        }
        if (problemTemplate.solution.includes('COUNT') || problemTemplate.solution.includes('AVG')) {
            hints.push('集約関数を使用して計算を行います');
        }
        
        hints.push(`正解例: ${problemTemplate.solution}`);
        
        return hints;
    }

    /**
     * 習熟度に応じた次レッスンの推奨
     */
    recommendNextLesson(courseId, currentLessonId) {
        if (!this.courseManager || !this.courseManager.getCurrentCourse()) {
            return null;
        }

        const course = this.courseManager.getCurrentCourse();
        const progress = this.courseManager.getCurrentCourseProgress();
        const userPerformance = this.analyzeUserProficiency(courseId);

        // 現在のレッスンのパフォーマンスを確認
        const currentPerformance = this.performanceData[courseId]?.[currentLessonId];
        
        let recommendation = {
            type: 'next',
            lessonId: null,
            reason: '',
            confidence: 0,
            alternatives: []
        };

        // 習熟度に基づく判定
        if (currentPerformance) {
            const successRate = currentPerformance.concepts ? 
                this.calculateOverallSuccessRate(currentPerformance.concepts) : 0;

            if (successRate >= this.difficultyThresholds.proficient) {
                // 高い習熟度 - 次のレッスンまたは高度なチャレンジを推奨
                recommendation = this.recommendAdvancedPath(course, progress, userPerformance);
            } else if (successRate <= this.difficultyThresholds.struggling) {
                // 低い習熟度 - 復習または基礎固めを推奨
                recommendation = this.recommendReviewPath(courseId, currentLessonId, userPerformance);
            } else {
                // 標準的な習熟度 - 通常の進行を推奨
                recommendation = this.recommendStandardPath(course, progress);
            }
        } else {
            // パフォーマンスデータがない場合は標準進行
            recommendation = this.recommendStandardPath(course, progress);
        }

        return recommendation;
    }

    /**
     * 全体的な成功率を計算
     */
    calculateOverallSuccessRate(concepts) {
        if (!concepts || Object.keys(concepts).length === 0) {
            return 0;
        }

        const rates = Object.values(concepts).map(concept => concept.successRate);
        return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    }

    /**
     * 高度なパスを推奨
     */
    recommendAdvancedPath(course, progress, userPerformance) {
        // 次の利用可能なレッスンを取得
        const nextLesson = this.courseManager.getNextLesson(course.id);
        
        if (nextLesson) {
            return {
                type: 'advanced',
                lessonId: nextLesson.lessonId,
                reason: '高い習熟度を示しているため、次のレッスンに進むことをお勧めします',
                confidence: 0.9,
                alternatives: [
                    {
                        type: 'challenge',
                        description: 'より高度なチャレンジ問題に挑戦',
                        confidence: 0.7
                    }
                ]
            };
        }

        return {
            type: 'completion',
            lessonId: null,
            reason: 'コースを完了しました！次のコースに進むことをお勧めします',
            confidence: 1.0,
            alternatives: []
        };
    }

    /**
     * 復習パスを推奨
     */
    recommendReviewPath(courseId, currentLessonId, userPerformance) {
        const difficultConcepts = this.detectDifficultConcepts(courseId);
        
        if (difficultConcepts.length > 0) {
            const mostDifficult = difficultConcepts[0];
            
            return {
                type: 'review',
                lessonId: currentLessonId, // 現在のレッスンを復習
                reason: `${mostDifficult.name}の理解を深めるため、復習をお勧めします`,
                confidence: 0.8,
                alternatives: [
                    {
                        type: 'practice',
                        description: '追加の練習問題で基礎を固める',
                        confidence: 0.9,
                        conceptId: mostDifficult.id
                    },
                    {
                        type: 'prerequisites',
                        description: '前提条件となる概念を復習する',
                        confidence: 0.7
                    }
                ],
                difficultConcepts: difficultConcepts.slice(0, 3)
            };
        }

        return {
            type: 'retry',
            lessonId: currentLessonId,
            reason: '理解を深めるため、もう一度挑戦してみましょう',
            confidence: 0.6,
            alternatives: []
        };
    }

    /**
     * 標準パスを推奨
     */
    recommendStandardPath(course, progress) {
        const nextLesson = this.courseManager.getNextLesson(course.id);
        
        if (nextLesson) {
            return {
                type: 'standard',
                lessonId: nextLesson.lessonId,
                reason: '順調に進んでいます。次のレッスンに進みましょう',
                confidence: 0.8,
                alternatives: []
            };
        }

        return {
            type: 'completion',
            lessonId: null,
            reason: 'コースを完了しました！',
            confidence: 1.0,
            alternatives: []
        };
    }

    /**
     * ユーザーの習熟度を分析
     */
    analyzeUserProficiency(courseId) {
        if (!this.performanceData[courseId]) {
            return {
                overallProficiency: 0,
                conceptProficiency: {},
                learningVelocity: 0,
                consistencyScore: 0
            };
        }

        const courseData = this.performanceData[courseId];
        const allConcepts = {};
        let totalAttempts = 0;
        let totalCorrect = 0;
        let totalTime = 0;

        // 全レッスンのデータを集約
        for (const lessonData of Object.values(courseData)) {
            totalAttempts += lessonData.attempts.length;
            totalCorrect += lessonData.attempts.filter(a => a.correct).length;
            totalTime += lessonData.totalTimeSpent;

            // 概念別データを集約
            for (const [conceptId, conceptData] of Object.entries(lessonData.concepts)) {
                if (!allConcepts[conceptId]) {
                    allConcepts[conceptId] = {
                        attempts: 0,
                        correct: 0,
                        totalScore: 0
                    };
                }
                allConcepts[conceptId].attempts += conceptData.attempts;
                allConcepts[conceptId].correct += conceptData.correctAttempts;
                allConcepts[conceptId].totalScore += conceptData.totalScore;
            }
        }

        // 習熟度指標を計算
        const overallProficiency = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
        
        const conceptProficiency = {};
        for (const [conceptId, data] of Object.entries(allConcepts)) {
            conceptProficiency[conceptId] = {
                successRate: data.attempts > 0 ? data.correct / data.attempts : 0,
                averageScore: data.attempts > 0 ? data.totalScore / data.attempts : 0,
                proficiencyLevel: this.calculateProficiencyLevel(data.correct / data.attempts)
            };
        }

        return {
            overallProficiency: overallProficiency,
            conceptProficiency: conceptProficiency,
            learningVelocity: this.calculateLearningVelocity(courseData),
            consistencyScore: this.calculateConsistencyScore(courseData)
        };
    }

    /**
     * 習熟度レベルを計算
     */
    calculateProficiencyLevel(successRate) {
        if (successRate >= 0.9) return 'expert';
        if (successRate >= 0.8) return 'proficient';
        if (successRate >= 0.6) return 'intermediate';
        if (successRate >= 0.4) return 'beginner';
        return 'struggling';
    }

    /**
     * 学習速度を計算
     */
    calculateLearningVelocity(courseData) {
        const lessonTimes = Object.values(courseData)
            .filter(lesson => lesson.isCompleted)
            .map(lesson => lesson.totalTimeSpent);

        if (lessonTimes.length < 2) return 0;

        // 最近のレッスンほど重みを大きくして平均時間を計算
        const weightedSum = lessonTimes.reduce((sum, time, index) => {
            const weight = (index + 1) / lessonTimes.length;
            return sum + (time * weight);
        }, 0);

        const weightSum = lessonTimes.reduce((sum, _, index) => {
            return sum + ((index + 1) / lessonTimes.length);
        }, 0);

        const averageTime = weightedSum / weightSum;
        
        // 速度スコア（短時間ほど高スコア）
        return Math.max(0, 1 - (averageTime / (30 * 60 * 1000))); // 30分を基準
    }

    /**
     * 一貫性スコアを計算
     */
    calculateConsistencyScore(courseData) {
        const successRates = Object.values(courseData)
            .filter(lesson => lesson.attempts.length >= 3)
            .map(lesson => {
                const correct = lesson.attempts.filter(a => a.correct).length;
                return correct / lesson.attempts.length;
            });

        if (successRates.length < 2) return 0;

        // 標準偏差を計算（低いほど一貫性が高い）
        const mean = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
        const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / successRates.length;
        const standardDeviation = Math.sqrt(variance);

        // 一貫性スコア（標準偏差が小さいほど高スコア）
        return Math.max(0, 1 - (standardDeviation * 2));
    }

    /**
     * パフォーマンスデータを保存
     */
    savePerformanceData() {
        try {
            const dataToSave = {
                performanceData: this.performanceData,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem('adaptiveLearningData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('適応的学習データ保存エラー:', error);
        }
    }

    /**
     * パフォーマンスデータを読み込み
     */
    loadPerformanceData() {
        try {
            const savedData = localStorage.getItem('adaptiveLearningData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.performanceData = parsedData.performanceData || {};
            } else {
                this.performanceData = {};
            }
        } catch (error) {
            console.error('適応的学習データ読み込みエラー:', error);
            this.performanceData = {};
        }
    }

    /**
     * 学習レポートを生成
     */
    generateLearningReport(courseId) {
        const proficiency = this.analyzeUserProficiency(courseId);
        const difficultConcepts = this.detectDifficultConcepts(courseId);
        const courseData = this.performanceData[courseId] || {};

        const completedLessons = Object.keys(courseData).filter(
            lessonId => courseData[lessonId].isCompleted
        ).length;

        const totalTime = Object.values(courseData).reduce(
            (sum, lesson) => sum + lesson.totalTimeSpent, 0
        );

        return {
            courseId: courseId,
            generatedAt: new Date().toISOString(),
            summary: {
                completedLessons: completedLessons,
                totalTimeSpent: Math.round(totalTime / (1000 * 60)), // 分単位
                overallProficiency: Math.round(proficiency.overallProficiency * 100),
                learningVelocity: Math.round(proficiency.learningVelocity * 100),
                consistencyScore: Math.round(proficiency.consistencyScore * 100)
            },
            strengths: this.identifyStrengths(proficiency.conceptProficiency),
            weaknesses: difficultConcepts.slice(0, 5),
            recommendations: this.generateOverallRecommendations(proficiency, difficultConcepts),
            nextSteps: this.recommendNextLesson(courseId, null)
        };
    }

    /**
     * 強みを特定
     */
    identifyStrengths(conceptProficiency) {
        return Object.entries(conceptProficiency)
            .filter(([_, data]) => data.proficiencyLevel === 'expert' || data.proficiencyLevel === 'proficient')
            .sort(([_, a], [__, b]) => b.successRate - a.successRate)
            .slice(0, 5)
            .map(([conceptId, data]) => ({
                conceptId: conceptId,
                successRate: Math.round(data.successRate * 100),
                averageScore: Math.round(data.averageScore),
                level: data.proficiencyLevel
            }));
    }

    /**
     * 全体的な推奨事項を生成
     */
    generateOverallRecommendations(proficiency, difficultConcepts) {
        const recommendations = [];

        // 習熟度に基づく推奨
        if (proficiency.overallProficiency >= 0.8) {
            recommendations.push({
                type: 'advancement',
                title: '次のレベルへ',
                description: '高い習熟度を示しています。より高度なトピックに挑戦しましょう。'
            });
        } else if (proficiency.overallProficiency <= 0.4) {
            recommendations.push({
                type: 'foundation',
                title: '基礎固め',
                description: '基本概念の理解を深めることに集中しましょう。'
            });
        }

        // 困難な概念に基づく推奨
        if (difficultConcepts.length > 0) {
            recommendations.push({
                type: 'focus',
                title: '重点学習',
                description: `特に ${difficultConcepts[0].name} の理解を深めることをお勧めします。`
            });
        }

        // 学習速度に基づく推奨
        if (proficiency.learningVelocity < 0.3) {
            recommendations.push({
                type: 'pace',
                title: '学習ペース',
                description: 'じっくりと時間をかけて理解を深めることが大切です。'
            });
        } else if (proficiency.learningVelocity > 0.8) {
            recommendations.push({
                type: 'challenge',
                title: 'チャレンジ',
                description: '学習速度が速いので、より難しい問題に挑戦してみましょう。'
            });
        }

        return recommendations;
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
            performanceDataKeys: Object.keys(this.performanceData),
            conceptCategories: Object.keys(this.conceptCategories),
            thresholds: this.difficultyThresholds
        };
    }
}

// Export for ES6 modules
export { AdaptiveLearning };