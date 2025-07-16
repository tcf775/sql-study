/**
 * CourseManager - コースシステムの管理クラス
 * コースの読み込み、進捗管理、レッスンアンロック機能を提供
 */
class CourseManager {
    constructor() {
        this.courses = [];
        this.currentCourse = null;
        this.challengeData = {};
        this.initialized = false;
        this.progressManager = null;
    }

    /**
     * ProgressManagerを設定
     */
    setProgressManager(progressManager) {
        this.progressManager = progressManager;
    }

    /**
     * コース定義を読み込み
     */
    async loadCourses() {
        try {
            if (!this.progressManager) {
                throw new Error('ProgressManagerが設定されていません。setProgressManager()を先に呼び出してください。');
            }
            
            const response = await fetch('data/courses.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.courses = data.courses;
            
            // 各コースのチャレンジデータを読み込み
            await this.loadChallengeData();
            
            // 進捗管理システムを初期化
            this.progressManager.initialize();
            
            // 選択されたコースを復元
            this.restoreSelectedCourse();
            
            this.initialized = true;
            console.log('コースデータの読み込みが完了しました');
            return this.courses;
        } catch (error) {
            console.error('コース読み込みエラー:', error);
            
            // ErrorHandlerを使用してエラーを処理
            if (window.errorHandler) {
                const result = await window.errorHandler.handleError('COURSE_LOAD_ERROR', error, {
                    operation: 'loadCourses',
                    url: 'data/courses.json'
                });
                
                if (result.success) {
                    this.courses = result.data;
                    this.initialized = true;
                    return this.courses;
                }
            }
            
            // フォールバック: デフォルトコースを読み込み
            return this.loadDefaultCourse();
        }
    }

    /**
     * 各コースのチャレンジデータを読み込み
     */
    async loadChallengeData() {
        const challengeFiles = {
            'sql-basics': 'slides/challenges.json',
            'db-fundamentals': 'slides/db-fundamentals-challenges.json',
            'big-data-basics': 'slides/big-data-basics-challenges.json'
        };

        for (const [courseId, filePath] of Object.entries(challengeFiles)) {
            try {
                const response = await fetch(filePath);
                if (response.ok) {
                    this.challengeData[courseId] = await response.json();
                } else {
                    console.warn(`チャレンジファイルが見つかりません: ${filePath}`);
                    this.challengeData[courseId] = [];
                }
            } catch (error) {
                console.error(`チャレンジデータ読み込みエラー (${courseId}):`, error);
                
                // ErrorHandlerを使用してチャレンジデータエラーを処理
                if (window.errorHandler) {
                    const result = await window.errorHandler.handleError('CHALLENGE_LOAD_ERROR', error, {
                        courseId: courseId,
                        challengeFile: filePath,
                        operation: 'loadChallengeData'
                    });
                    
                    if (result.success) {
                        this.challengeData[courseId] = result.data;
                    } else {
                        this.challengeData[courseId] = [];
                    }
                } else {
                    this.challengeData[courseId] = [];
                }
            }
        }
    }

    /**
     * デフォルトコースを読み込み（エラー時のフォールバック）
     */
    async loadDefaultCourse() {
        console.log('デフォルトコースを読み込み中...');
        this.courses = [{
            id: 'sql-basics',
            title: 'SQL基礎コース',
            description: 'デフォルトのSQL基礎コース',
            targetAudience: '初心者',
            difficulty: '初級',
            estimatedHours: 8,
            modules: [{
                id: 'module-1',
                title: '基本操作',
                description: 'SQL基本操作',
                lessons: ['challenge-001', 'challenge-002'],
                prerequisites: []
            }]
        }];
        
        // 既存のchallenges.jsonを読み込み
        try {
            const response = await fetch('slides/challenges.json');
            if (response.ok) {
                this.challengeData['sql-basics'] = await response.json();
            }
        } catch (error) {
            console.error('デフォルトチャレンジ読み込みエラー:', error);
        }
        
        this.initialized = true;
        return this.courses;
    }

    /**
     * 利用可能なコース一覧を取得
     */
    getCourses() {
        return this.courses;
    }

    /**
     * 特定のコースを取得
     */
    getCourse(courseId) {
        return this.courses.find(course => course.id === courseId);
    }

    /**
     * 現在選択中のコースを取得
     */
    getCurrentCourse() {
        return this.currentCourse;
    }

    /**
     * コースを選択
     */
    selectCourse(courseId) {
        const course = this.getCourse(courseId);
        if (!course) {
            throw new Error(`コースが見つかりません: ${courseId}`);
        }
        
        this.currentCourse = course;
        this.progressManager.saveSelectedCourse(courseId);
        
        // 進捗データが存在しない場合は初期化
        if (!this.progressManager.getCourseProgress(courseId)) {
            this.progressManager.initializeCourseProgress(courseId);
        }
        
        console.log(`コースを選択しました: ${course.title}`);
        return course;
    }

    /**
     * コースの進捗を取得
     */
    getCourseProgress(courseId) {
        return this.progressManager.getCourseProgress(courseId);
    }

    /**
     * 現在のコースの進捗を取得
     */
    getCurrentCourseProgress() {
        if (!this.currentCourse) return null;
        return this.progressManager.getCourseProgress(this.currentCourse.id);
    }

    /**
     * 進捗を更新
     */
    updateProgress(courseId, lessonId, score = 0) {
        // ProgressManagerを使用してレッスン完了を記録
        this.progressManager.markLessonCompleted(courseId, lessonId, score);
        
        // レッスン完了時の自動アンロック処理
        const unlockedLessons = this.processLessonCompletion(courseId, lessonId);
        
        // モジュール完了チェック
        const completedModules = this.checkModuleCompletion(courseId);
        
        // モジュール完了時の処理（概念要約と自動アンロック）
        let moduleCompletionResults = [];
        if (completedModules.length > 0) {
            moduleCompletionResults = this.processModuleCompletionWithSummary(courseId, completedModules);
            console.log(`モジュール完了処理が実行されました:`, moduleCompletionResults);
        }
        
        // コース完了チェック
        this.checkCourseCompletion(courseId);
        
        console.log(`進捗を更新しました: ${courseId} - ${lessonId}`);
        
        // 拡張されたアンロック情報を返す
        return {
            lessonId: lessonId,
            score: score,
            unlockedLessons: unlockedLessons,
            completedModules: completedModules,
            moduleCompletionResults: moduleCompletionResults
        };
    }

    /**
     * レッスン完了時の自動アンロック処理
     */
    processLessonCompletion(courseId, completedLessonId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return [];
        
        const newlyUnlockedLessons = [];
        
        // 完了したレッスンが属するモジュールを見つける
        let completedLessonModule = null;
        for (const module of course.modules) {
            if (module.lessons.includes(completedLessonId)) {
                completedLessonModule = module;
                break;
            }
        }
        
        if (!completedLessonModule) return [];
        
        // 同じモジュール内の次のレッスンをチェック
        const lessonIndex = completedLessonModule.lessons.indexOf(completedLessonId);
        if (lessonIndex >= 0 && lessonIndex < completedLessonModule.lessons.length - 1) {
            const nextLessonId = completedLessonModule.lessons[lessonIndex + 1];
            
            // 次のレッスンがまだ完了していない場合、アンロック状態をチェック
            if (!progress.completedLessons.includes(nextLessonId)) {
                if (this.isLessonUnlocked(courseId, nextLessonId)) {
                    newlyUnlockedLessons.push({
                        lessonId: nextLessonId,
                        moduleId: completedLessonModule.id,
                        moduleTitle: completedLessonModule.title,
                        reason: 'previous_lesson_completed'
                    });
                    console.log(`レッスン完了により次のレッスンがアンロックされました: ${nextLessonId}`);
                }
            }
        }
        
        return newlyUnlockedLessons;
    }

    /**
     * モジュール完了時の自動アンロック処理
     */
    processModuleCompletion(courseId, completedModuleIds) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress || !completedModuleIds.length) return [];
        
        const newlyUnlockedModules = [];
        
        // 各モジュールをチェックして、新たにアンロックされるモジュールを見つける
        for (const module of course.modules) {
            // まだ開始されていないモジュールのみチェック
            if (!progress.completedModules.includes(module.id)) {
                // 前提条件がすべて満たされているかチェック
                const allPrerequisitesMet = module.prerequisites.every(prereqId => 
                    progress.completedModules.includes(prereqId)
                );
                
                if (allPrerequisitesMet && this.isModuleUnlocked(courseId, module.id)) {
                    // モジュールの最初のレッスンがアンロックされているかチェック
                    if (module.lessons.length > 0) {
                        const firstLessonId = module.lessons[0];
                        if (this.isLessonUnlocked(courseId, firstLessonId)) {
                            newlyUnlockedModules.push({
                                moduleId: module.id,
                                moduleTitle: module.title,
                                firstLessonId: firstLessonId,
                                reason: 'prerequisites_completed',
                                completedPrerequisites: completedModuleIds.filter(id => 
                                    module.prerequisites.includes(id)
                                )
                            });
                            console.log(`モジュール完了により新しいモジュールがアンロックされました: ${module.title}`);
                        }
                    }
                }
            }
        }
        
        return newlyUnlockedModules;
    }

    /**
     * 次のレッスンを取得
     */
    getNextLesson(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return null;
        
        // 全モジュールから全レッスンを取得
        const allLessons = [];
        course.modules.forEach(module => {
            module.lessons.forEach(lessonId => {
                allLessons.push({
                    lessonId,
                    moduleId: module.id,
                    moduleTitle: module.title
                });
            });
        });
        
        // 完了していない最初のレッスンを探す
        for (const lesson of allLessons) {
            if (!progress.completedLessons.includes(lesson.lessonId)) {
                // レッスンがアンロックされているかチェック
                if (this.isLessonUnlocked(courseId, lesson.lessonId)) {
                    return lesson;
                }
            }
        }
        
        return null; // 全レッスン完了
    }

    /**
     * レッスンがアンロックされているかチェック
     */
    isLessonUnlocked(courseId, lessonId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) {
            console.warn(`コースまたは進捗データが見つかりません: ${courseId}`);
            return false;
        }
        
        // レッスンが属するモジュールを見つける
        let targetModule = null;
        for (const module of course.modules) {
            if (module.lessons.includes(lessonId)) {
                targetModule = module;
                break;
            }
        }
        
        if (!targetModule) {
            console.warn(`レッスン ${lessonId} が属するモジュールが見つかりません`);
            return false;
        }
        
        // 前提条件モジュールがすべて完了しているかチェック
        for (const prerequisiteModuleId of targetModule.prerequisites) {
            if (!progress.completedModules.includes(prerequisiteModuleId)) {
                console.log(`前提条件モジュール ${prerequisiteModuleId} が未完了のため、レッスン ${lessonId} はロックされています`);
                return false;
            }
        }
        
        // モジュール内での順序チェック
        const lessonIndex = targetModule.lessons.indexOf(lessonId);
        if (lessonIndex > 0) {
            // 前のレッスンが完了しているかチェック
            const previousLessonId = targetModule.lessons[lessonIndex - 1];
            if (!progress.completedLessons.includes(previousLessonId)) {
                console.log(`前のレッスン ${previousLessonId} が未完了のため、レッスン ${lessonId} はロックされています`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * モジュールがアンロックされているかチェック
     */
    isModuleUnlocked(courseId, moduleId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) {
            console.warn(`コースまたは進捗データが見つかりません: ${courseId}`);
            return false;
        }
        
        // 対象モジュールを見つける
        const targetModule = course.modules.find(module => module.id === moduleId);
        if (!targetModule) {
            console.warn(`モジュール ${moduleId} が見つかりません`);
            return false;
        }
        
        // 前提条件モジュールがすべて完了しているかチェック
        for (const prerequisiteModuleId of targetModule.prerequisites) {
            if (!progress.completedModules.includes(prerequisiteModuleId)) {
                console.log(`前提条件モジュール ${prerequisiteModuleId} が未完了のため、モジュール ${moduleId} はロックされています`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * アンロックされていないレッスンへのアクセス制御
     */
    enforceAccessControl(courseId, lessonId) {
        if (!this.isLessonUnlocked(courseId, lessonId)) {
            const course = this.getCourse(courseId);
            const courseName = course ? course.title : courseId;
            
            throw new Error(`レッスン ${lessonId} はまだアンロックされていません。前のレッスンを完了してください。（コース: ${courseName}）`);
        }
        return true;
    }

    /**
     * レッスンアクセス試行（制御付き）
     */
    attemptLessonAccess(courseId, lessonId) {
        try {
            this.enforceAccessControl(courseId, lessonId);
            console.log(`レッスンアクセス許可: ${lessonId}`);
            return {
                success: true,
                lessonId: lessonId,
                message: 'レッスンにアクセスできます'
            };
        } catch (error) {
            console.warn(`レッスンアクセス拒否: ${error.message}`);
            return {
                success: false,
                lessonId: lessonId,
                error: error.message,
                suggestedAction: this.getSuggestedAction(courseId, lessonId)
            };
        }
    }

    /**
     * アクセス拒否時の推奨アクションを取得
     */
    getSuggestedAction(courseId, lessonId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) {
            return '進捗データを確認してください';
        }
        
        // レッスンが属するモジュールを見つける
        let targetModule = null;
        for (const module of course.modules) {
            if (module.lessons.includes(lessonId)) {
                targetModule = module;
                break;
            }
        }
        
        if (!targetModule) {
            return 'コースデータを確認してください';
        }
        
        // 前提条件モジュールの確認
        for (const prerequisiteModuleId of targetModule.prerequisites) {
            if (!progress.completedModules.includes(prerequisiteModuleId)) {
                const prerequisiteModule = course.modules.find(m => m.id === prerequisiteModuleId);
                const moduleName = prerequisiteModule ? prerequisiteModule.title : prerequisiteModuleId;
                return `まず「${moduleName}」モジュールを完了してください`;
            }
        }
        
        // モジュール内での順序確認
        const lessonIndex = targetModule.lessons.indexOf(lessonId);
        if (lessonIndex > 0) {
            const previousLessonId = targetModule.lessons[lessonIndex - 1];
            if (!progress.completedLessons.includes(previousLessonId)) {
                return `まず前のレッスン「${previousLessonId}」を完了してください`;
            }
        }
        
        return '前提条件を確認してください';
    }

    /**
     * 特定のコースのチャレンジデータを取得
     */
    getCourseChallenge(courseId, challengeId) {
        const challenges = this.challengeData[courseId] || [];
        return challenges.find(challenge => challenge.id === challengeId);
    }

    /**
     * 現在のコースのチャレンジデータを取得
     */
    getCurrentCourseChallenge(challengeId) {
        if (!this.currentCourse) return null;
        return this.getCourseChallenge(this.currentCourse.id, challengeId);
    }

    /**
     * コースの進捗を初期化
     */
    initializeCourseProgress(courseId) {
        return this.progressManager.initializeCourseProgress(courseId);
    }

    /**
     * モジュール完了をチェック
     */
    checkModuleCompletion(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return [];
        
        const newlyCompletedModules = [];
        
        course.modules.forEach(module => {
            // モジュール内の全レッスンが完了しているかチェック
            const allLessonsCompleted = module.lessons.every(lessonId => 
                progress.completedLessons.includes(lessonId)
            );
            
            if (allLessonsCompleted && !progress.completedModules.includes(module.id)) {
                this.progressManager.markModuleCompleted(courseId, module.id);
                newlyCompletedModules.push({
                    moduleId: module.id,
                    moduleTitle: module.title,
                    moduleDescription: module.description,
                    completedLessons: module.lessons,
                    conceptSummary: this.generateModuleConceptSummary(courseId, module.id)
                });
                console.log(`モジュール完了: ${module.title}`);
            }
        });
        
        return newlyCompletedModules;
    }

    /**
     * コース完了をチェック
     */
    checkCourseCompletion(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return false;
        
        // 全モジュールが完了しているかチェック
        const allModulesCompleted = course.modules.every(module => 
            progress.completedModules.includes(module.id)
        );
        
        if (allModulesCompleted && !progress.isCompleted) {
            // コース完了を記録
            this.progressManager.markCourseCompleted(courseId);
            
            // コース完了処理を実行
            const completionResult = this.processCourseCompletion(courseId);
            
            console.log(`コース完了: ${course.title}`);
            return completionResult;
        }
        
        return false;
    }

    /**
     * コース完了処理を実行
     */
    processCourseCompletion(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return null;
        
        // 完了統計を計算
        const completionStats = this.calculateCourseCompletionStats(courseId);
        
        // 次のコース推奨を生成
        const recommendedCourses = this.generateCourseRecommendations(courseId);
        
        // 完了証明書データを生成
        const certificate = this.generateCourseCertificate(courseId, completionStats);
        
        const completionResult = {
            courseId: courseId,
            courseTitle: course.title,
            completedAt: new Date().toISOString(),
            stats: completionStats,
            certificate: certificate,
            recommendedCourses: recommendedCourses,
            achievements: this.generateAchievements(courseId, completionStats)
        };
        
        // 完了イベントを発火
        this.triggerCourseCompletionEvent(completionResult);
        
        return completionResult;
    }

    /**
     * コース完了統計を計算
     */
    calculateCourseCompletionStats(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return null;
        
        const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
        const totalModules = course.modules.length;
        
        const startDate = new Date(progress.startDate);
        const completedDate = new Date();
        const studyDuration = Math.ceil((completedDate - startDate) / (1000 * 60 * 60 * 24)); // 日数
        
        return {
            totalLessons: totalLessons,
            totalModules: totalModules,
            totalScore: progress.totalScore,
            averageScore: totalLessons > 0 ? Math.round(progress.totalScore / totalLessons) : 0,
            studyDuration: studyDuration,
            startDate: progress.startDate,
            completedDate: completedDate.toISOString(),
            efficiency: this.calculateStudyEfficiency(studyDuration, course.estimatedHours)
        };
    }

    /**
     * 学習効率を計算
     */
    calculateStudyEfficiency(actualDays, estimatedHours) {
        // 推定時間を日数に変換（1日2時間学習と仮定）
        const estimatedDays = Math.ceil(estimatedHours / 2);
        
        if (actualDays <= estimatedDays) {
            return 'excellent'; // 優秀
        } else if (actualDays <= estimatedDays * 1.5) {
            return 'good'; // 良好
        } else if (actualDays <= estimatedDays * 2) {
            return 'average'; // 平均
        } else {
            return 'needs_improvement'; // 要改善
        }
    }

    /**
     * 次のコース推奨を生成
     */
    generateCourseRecommendations(completedCourseId) {
        const allCourses = this.getCourses();
        const completedCourse = this.getCourse(completedCourseId);
        
        if (!completedCourse) return [];
        
        // コース推奨ロジック
        const recommendations = [];
        
        // 難易度ベースの推奨
        const difficultyProgression = {
            'sql-basics': ['db-fundamentals'],
            'db-fundamentals': ['big-data-basics'],
            'big-data-basics': []
        };
        
        const nextCourseIds = difficultyProgression[completedCourseId] || [];
        
        nextCourseIds.forEach(courseId => {
            const course = this.getCourse(courseId);
            const progress = this.getCourseProgress(courseId);
            
            if (course && (!progress || !progress.isCompleted)) {
                recommendations.push({
                    courseId: course.id,
                    title: course.title,
                    description: course.description,
                    difficulty: course.difficulty,
                    estimatedHours: course.estimatedHours,
                    reason: this.getRecommendationReason(completedCourseId, courseId),
                    priority: 'high'
                });
            }
        });
        
        // 関連コースの推奨
        allCourses.forEach(course => {
            if (course.id !== completedCourseId && !nextCourseIds.includes(course.id)) {
                const progress = this.getCourseProgress(course.id);
                if (!progress || !progress.isCompleted) {
                    recommendations.push({
                        courseId: course.id,
                        title: course.title,
                        description: course.description,
                        difficulty: course.difficulty,
                        estimatedHours: course.estimatedHours,
                        reason: '関連スキルの習得',
                        priority: 'medium'
                    });
                }
            }
        });
        
        return recommendations.slice(0, 3); // 最大3つの推奨
    }

    /**
     * 推奨理由を取得
     */
    getRecommendationReason(completedCourseId, recommendedCourseId) {
        const reasons = {
            'sql-basics': {
                'db-fundamentals': 'SQL基礎を習得したので、次はデータベース設計と操作を学びましょう',
                'big-data-basics': '大規模データ処理の基礎を学ぶ準備ができています'
            },
            'db-fundamentals': {
                'big-data-basics': 'データベース基礎を習得したので、大規模データ処理技術を学びましょう',
                'sql-basics': 'SQL基礎で実践的なクエリ技術を身につけましょう'
            },
            'big-data-basics': {
                'sql-basics': 'SQL基礎で基本的なクエリ技術を復習しましょう',
                'db-fundamentals': 'データベース設計の基礎を学びましょう'
            }
        };
        
        return reasons[completedCourseId]?.[recommendedCourseId] || 'スキルアップのための次のステップ';
    }

    /**
     * コース完了証明書を生成
     */
    generateCourseCertificate(courseId, stats) {
        const course = this.getCourse(courseId);
        if (!course) return null;
        
        return {
            certificateId: `cert-${courseId}-${Date.now()}`,
            courseTitle: course.title,
            courseDescription: course.description,
            difficulty: course.difficulty,
            estimatedHours: course.estimatedHours,
            completedAt: stats.completedDate,
            studyDuration: stats.studyDuration,
            totalScore: stats.totalScore,
            averageScore: stats.averageScore,
            efficiency: stats.efficiency,
            skills: this.getCourseSkills(courseId),
            issuer: 'SQL学習プラットフォーム',
            validationCode: this.generateValidationCode(courseId, stats.completedDate)
        };
    }

    /**
     * コースで習得したスキルを取得
     */
    getCourseSkills(courseId) {
        const skillsMap = {
            'sql-basics': [
                'SELECT文の基本構文',
                'WHERE句による条件指定',
                'ORDER BYとLIMITによるデータ操作',
                '集約関数（COUNT、SUM、AVG）',
                'GROUP BYとHAVING',
                'テーブル結合（JOIN）',
                'サブクエリの活用'
            ],
            'db-fundamentals': [
                'DDL（データ定義言語）',
                'DML（データ操作言語）',
                'テーブル設計と制約',
                'インデックス管理',
                'トランザクション制御',
                'データ整合性管理'
            ],
            'big-data-basics': [
                'DuckDBの特性理解',
                '大規模データ読み込み',
                'ウィンドウ関数',
                'パフォーマンス最適化',
                'ETLパイプライン構築',
                '分析用SQL技術'
            ]
        };
        
        return skillsMap[courseId] || [];
    }

    /**
     * 検証コードを生成
     */
    generateValidationCode(courseId, completedDate) {
        const data = `${courseId}-${completedDate}`;
        // 簡単なハッシュ生成（実際の実装では暗号化ライブラリを使用）
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        return Math.abs(hash).toString(16).toUpperCase().substring(0, 8);
    }

    /**
     * 達成バッジを生成
     */
    generateAchievements(courseId, stats) {
        const achievements = [];
        
        // 基本完了バッジ
        achievements.push({
            id: `completion-${courseId}`,
            title: `${this.getCourse(courseId)?.title} 完了`,
            description: 'コースを完了しました',
            icon: '🎓',
            earnedAt: stats.completedDate
        });
        
        // 効率性バッジ
        if (stats.efficiency === 'excellent') {
            achievements.push({
                id: `efficiency-${courseId}`,
                title: '効率的学習者',
                description: '予定より早くコースを完了しました',
                icon: '⚡',
                earnedAt: stats.completedDate
            });
        }
        
        // 高得点バッジ
        if (stats.averageScore >= 90) {
            achievements.push({
                id: `high-score-${courseId}`,
                title: '高得点達成',
                description: '平均90点以上を獲得しました',
                icon: '🌟',
                earnedAt: stats.completedDate
            });
        }
        
        // 継続学習バッジ
        if (stats.studyDuration <= 7) {
            achievements.push({
                id: `consistent-${courseId}`,
                title: '集中学習者',
                description: '1週間以内にコースを完了しました',
                icon: '🔥',
                earnedAt: stats.completedDate
            });
        }
        
        return achievements;
    }

    /**
     * コース完了イベントを発火
     */
    triggerCourseCompletionEvent(completionResult) {
        // カスタムイベントを発火
        const event = new CustomEvent('courseCompleted', {
            detail: completionResult
        });
        document.dispatchEvent(event);
        
        // UIControllerに通知
        if (window.uiController && typeof window.uiController.onCourseCompleted === 'function') {
            window.uiController.onCourseCompleted(completionResult);
        }
        
        // CourseUIに通知
        if (window.courseUI && typeof window.courseUI.onCourseCompleted === 'function') {
            window.courseUI.onCourseCompleted(completionResult);
        }
    }

    /**
     * モジュール完了時の概念要約を生成
     */
    generateModuleConceptSummary(courseId, moduleId) {
        const course = this.getCourse(courseId);
        if (!course) return null;
        
        const module = course.modules.find(m => m.id === moduleId);
        if (!module) return null;
        
        // コースとモジュールに基づいて概念要約を生成
        const conceptSummaries = {
            'sql-basics': {
                'module-1': {
                    title: 'SELECT文の基本',
                    keyConcepts: [
                        'SELECT文の基本構文',
                        'テーブルからのデータ取得',
                        '列の指定と全列取得（*）',
                        'データベースの基本概念'
                    ],
                    practicalSkills: [
                        '基本的なSELECT文を書くことができる',
                        'テーブルから必要な列のデータを取得できる',
                        'SQLの基本的な実行方法を理解している'
                    ],
                    nextSteps: 'データの絞り込み（WHERE句）を学習して、より具体的な条件でデータを取得する方法を身につけましょう。'
                },
                'module-2': {
                    title: 'データの絞り込み',
                    keyConcepts: [
                        'WHERE句の使用方法',
                        '比較演算子（=, >, <, >=, <=, <>）',
                        '論理演算子（AND, OR, NOT）',
                        'LIKE演算子とワイルドカード',
                        'NULL値の扱い（IS NULL, IS NOT NULL）'
                    ],
                    practicalSkills: [
                        '条件を指定してデータを絞り込むことができる',
                        '複数の条件を組み合わせることができる',
                        '文字列の部分一致検索ができる'
                    ],
                    nextSteps: 'データの並び替えと制限を学習して、結果をより見やすく整理する方法を学びましょう。'
                },
                'module-3': {
                    title: 'データの並び替えと制限',
                    keyConcepts: [
                        'ORDER BY句による並び替え',
                        '昇順（ASC）と降順（DESC）',
                        '複数列による並び替え',
                        'LIMIT句による結果数の制限',
                        'OFFSET句による開始位置の指定'
                    ],
                    practicalSkills: [
                        'データを任意の順序で並び替えることができる',
                        '必要な件数だけデータを取得できる',
                        'ページング処理の基本を理解している'
                    ],
                    nextSteps: '集約関数を学習して、データの合計や平均などの統計情報を取得する方法を身につけましょう。'
                },
                'module-4': {
                    title: '集約関数の基本',
                    keyConcepts: [
                        'COUNT関数による件数の取得',
                        'SUM関数による合計値の計算',
                        'AVG関数による平均値の計算',
                        'MAX/MIN関数による最大値・最小値の取得',
                        'NULL値の集約関数での扱い'
                    ],
                    practicalSkills: [
                        'データの件数を数えることができる',
                        '数値データの合計・平均を計算できる',
                        'データの最大値・最小値を取得できる'
                    ],
                    nextSteps: 'グループ化と集計を学習して、カテゴリ別の統計情報を取得する方法を学びましょう。'
                },
                'module-5': {
                    title: 'グループ化と集計',
                    keyConcepts: [
                        'GROUP BY句によるデータのグループ化',
                        'グループ別の集約関数の適用',
                        'HAVING句による集約結果の絞り込み',
                        'WHEREとHAVINGの違い',
                        'グループ化における注意点'
                    ],
                    practicalSkills: [
                        'カテゴリ別にデータを集計できる',
                        '集計結果に条件を適用できる',
                        '複雑な集計クエリを作成できる'
                    ],
                    nextSteps: 'テーブル結合を学習して、複数のテーブルからデータを組み合わせる方法を身につけましょう。'
                },
                'module-6': {
                    title: 'テーブル結合の基本',
                    keyConcepts: [
                        'INNER JOINによる内部結合',
                        'LEFT JOINによる左外部結合',
                        'RIGHT JOINによる右外部結合',
                        'FULL OUTER JOINによる完全外部結合',
                        '結合条件の指定方法',
                        'テーブルエイリアスの使用'
                    ],
                    practicalSkills: [
                        '複数のテーブルからデータを結合できる',
                        '適切な結合タイプを選択できる',
                        '結合条件を正しく指定できる'
                    ],
                    nextSteps: 'サブクエリと応用技術を学習して、より複雑なデータ分析を行う方法を学びましょう。'
                },
                'module-7': {
                    title: 'サブクエリと応用',
                    keyConcepts: [
                        'サブクエリの基本概念',
                        'WHERE句でのサブクエリ',
                        'FROM句でのサブクエリ',
                        'SELECT句でのサブクエリ',
                        'EXISTS演算子の使用',
                        'IN演算子とサブクエリ'
                    ],
                    practicalSkills: [
                        '複雑な条件でデータを抽出できる',
                        'サブクエリを使った高度な分析ができる',
                        '実践的なビジネス課題を解決できる'
                    ],
                    nextSteps: 'SQL基礎コースを完了しました！より高度なデータベース操作を学ぶためにDB基礎コースに進むことをお勧めします。'
                }
            },
            'db-fundamentals': {
                'module-1': {
                    title: 'DDL（データ定義言語）',
                    keyConcepts: [
                        'CREATE TABLE文によるテーブル作成',
                        'データ型の選択と指定',
                        'ALTER TABLE文によるテーブル構造の変更',
                        'DROP TABLE文によるテーブル削除',
                        '制約の基本概念'
                    ],
                    practicalSkills: [
                        'テーブルを設計・作成できる',
                        'テーブル構造を変更できる',
                        '適切なデータ型を選択できる'
                    ],
                    nextSteps: 'DML（データ操作言語）を学習して、作成したテーブルにデータを挿入・更新・削除する方法を学びましょう。'
                },
                'module-2': {
                    title: 'DML（データ操作言語）',
                    keyConcepts: [
                        'INSERT文によるデータ挿入',
                        'UPDATE文によるデータ更新',
                        'DELETE文によるデータ削除',
                        '条件付きの更新・削除',
                        'バッチ処理の考慮事項'
                    ],
                    practicalSkills: [
                        'テーブルにデータを挿入できる',
                        '既存データを安全に更新できる',
                        '不要なデータを削除できる'
                    ],
                    nextSteps: '制約とインデックスを学習して、データの整合性とパフォーマンスを向上させる方法を学びましょう。'
                },
                'module-3': {
                    title: '制約とインデックス',
                    keyConcepts: [
                        'PRIMARY KEY制約',
                        'FOREIGN KEY制約',
                        'UNIQUE制約',
                        'NOT NULL制約',
                        'CHECK制約',
                        'インデックスの作成と管理'
                    ],
                    practicalSkills: [
                        'データの整合性を保つ制約を設定できる',
                        'パフォーマンスを向上させるインデックスを作成できる',
                        'データベース設計の品質を向上させることができる'
                    ],
                    nextSteps: 'トランザクション管理を学習して、データの一貫性を保つ高度な技術を身につけましょう。'
                },
                'module-4': {
                    title: 'トランザクション管理',
                    keyConcepts: [
                        'ACID特性の理解',
                        'BEGIN/COMMIT/ROLLBACKの使用',
                        'トランザクション分離レベル',
                        'デッドロックの理解と対策',
                        '同時実行制御'
                    ],
                    practicalSkills: [
                        'トランザクションを適切に管理できる',
                        'データの一貫性を保つことができる',
                        '同時実行環境での問題を理解している'
                    ],
                    nextSteps: 'DB基礎コースを完了しました！大規模データ処理に興味がある場合は、大規模データ基礎コースに進むことをお勧めします。'
                }
            },
            'big-data-basics': {
                'module-1': {
                    title: 'DuckDBの特徴',
                    keyConcepts: [
                        'DuckDBの分析特化アーキテクチャ',
                        'カラムナーストレージの利点',
                        'インメモリ処理の特性',
                        'PostgreSQL互換性',
                        'ファイル形式サポート'
                    ],
                    practicalSkills: [
                        'DuckDBの特徴を理解している',
                        '分析用途での利点を説明できる',
                        '適切な使用場面を判断できる'
                    ],
                    nextSteps: '大規模データの読み込みを学習して、様々なファイル形式からデータを効率的に処理する方法を学びましょう。'
                },
                'module-2': {
                    title: '大規模データの読み込み',
                    keyConcepts: [
                        'CSVファイルの効率的な読み込み',
                        'Parquetファイルの処理',
                        'JSONファイルの扱い',
                        'ストリーミング処理',
                        'データ型の自動推論'
                    ],
                    practicalSkills: [
                        '大容量ファイルを効率的に読み込める',
                        '様々なファイル形式を扱える',
                        'メモリ効率を考慮した処理ができる'
                    ],
                    nextSteps: '高度な集計とウィンドウ関数を学習して、複雑な分析処理を行う方法を身につけましょう。'
                },
                'module-3': {
                    title: '高度な集計とウィンドウ関数',
                    keyConcepts: [
                        'ウィンドウ関数の基本',
                        'ROW_NUMBER, RANK, DENSE_RANK',
                        'LAG, LEAD関数',
                        '移動平均の計算',
                        'パーティション分割'
                    ],
                    practicalSkills: [
                        'ウィンドウ関数を使った高度な分析ができる',
                        '時系列データの分析ができる',
                        'ランキングや順位付けができる'
                    ],
                    nextSteps: 'パフォーマンス最適化を学習して、大規模データ処理を高速化する技術を学びましょう。'
                },
                'module-4': {
                    title: 'パフォーマンス最適化',
                    keyConcepts: [
                        'クエリ実行計画の理解',
                        'インデックス戦略',
                        'パーティショニング',
                        'メモリ管理',
                        '並列処理の活用'
                    ],
                    practicalSkills: [
                        'クエリのパフォーマンスを分析できる',
                        '最適化手法を適用できる',
                        '大規模データを効率的に処理できる'
                    ],
                    nextSteps: 'ETLパイプライン構築を学習して、実践的なデータ処理システムを構築する方法を学びましょう。'
                },
                'module-5': {
                    title: 'ETLパイプライン構築',
                    keyConcepts: [
                        'ETLプロセスの設計',
                        'データ品質管理',
                        'エラーハンドリング',
                        'スケジューリング',
                        'モニタリングとログ'
                    ],
                    practicalSkills: [
                        '実践的なETLパイプラインを構築できる',
                        'データ品質を管理できる',
                        '運用を考慮したシステムを設計できる'
                    ],
                    nextSteps: '大規模データ基礎コースを完了しました！実際のプロジェクトでこれらの技術を活用してください。'
                }
            }
        };
        
        const courseConceptSummaries = conceptSummaries[courseId];
        if (!courseConceptSummaries) return null;
        
        return courseConceptSummaries[moduleId] || null;
    }

    /**
     * モジュール完了時の処理を実行
     */
    processModuleCompletionWithSummary(courseId, completedModuleIds) {
        if (!completedModuleIds || completedModuleIds.length === 0) return [];
        
        const course = this.getCourse(courseId);
        if (!course) return [];
        
        const moduleCompletionResults = [];
        
        completedModuleIds.forEach(moduleData => {
            const moduleId = typeof moduleData === 'string' ? moduleData : moduleData.moduleId;
            const module = course.modules.find(m => m.id === moduleId);
            
            if (module) {
                const conceptSummary = this.generateModuleConceptSummary(courseId, moduleId);
                
                moduleCompletionResults.push({
                    moduleId: moduleId,
                    moduleTitle: module.title,
                    moduleDescription: module.description,
                    completedLessons: module.lessons,
                    conceptSummary: conceptSummary,
                    unlockedModules: this.checkAndUnlockNextModules(courseId, moduleId)
                });
                
                console.log(`モジュール完了処理完了: ${module.title}`);
            }
        });
        
        return moduleCompletionResults;
    }

    /**
     * モジュール完了時に次のモジュールをアンロック
     */
    checkAndUnlockNextModules(courseId, completedModuleId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return [];
        
        const newlyUnlockedModules = [];
        
        // 完了したモジュールを前提条件とするモジュールを探す
        course.modules.forEach(module => {
            // まだ完了していないモジュールのみチェック
            if (!progress.completedModules.includes(module.id)) {
                // 前提条件に完了したモジュールが含まれているかチェック
                if (module.prerequisites.includes(completedModuleId)) {
                    // 全ての前提条件が満たされているかチェック
                    const allPrerequisitesMet = module.prerequisites.every(prereqId => 
                        progress.completedModules.includes(prereqId)
                    );
                    
                    if (allPrerequisitesMet) {
                        newlyUnlockedModules.push({
                            moduleId: module.id,
                            moduleTitle: module.title,
                            moduleDescription: module.description,
                            firstLessonId: module.lessons[0],
                            unlockedBy: completedModuleId
                        });
                        
                        console.log(`新しいモジュールがアンロックされました: ${module.title} (${completedModuleId}により)`);
                    }
                }
            }
        });
        
        return newlyUnlockedModules;
    }

    /**
     * コース完了をチェック
     */
    checkCourseCompletion(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return;
        
        // 全モジュールが完了しているかチェック
        const allModulesCompleted = course.modules.every(module => 
            progress.completedModules.includes(module.id)
        );
        
        if (allModulesCompleted && !progress.isCompleted) {
            this.progressManager.markCourseCompleted(courseId);
            console.log(`コース完了: ${course.title}`);
        }
    }

    /**
     * 選択されたコースを復元
     */
    restoreSelectedCourse() {
        const selectedCourseId = this.progressManager.getSelectedCourse();
        if (selectedCourseId) {
            const course = this.getCourse(selectedCourseId);
            if (course) {
                this.currentCourse = course;
                console.log(`選択されたコースを復元しました: ${course.title}`);
            }
        }
    }

    /**
     * 進捗をリセット
     */
    resetProgress(courseId = null) {
        if (courseId) {
            this.progressManager.resetCourseProgress(courseId);
            console.log(`コース進捗をリセットしました: ${courseId}`);
        } else {
            this.progressManager.resetAllProgress();
            this.currentCourse = null;
            console.log('全ての進捗をリセットしました');
        }
    }

    /**
     * 進捗統計を取得
     */
    getProgressStats(courseId) {
        return this.progressManager.getProgressStats(courseId);
    }

    /**
     * 進捗データの整合性をチェック
     */
    validateProgressIntegrity() {
        return this.progressManager.validateDataIntegrity();
    }

    /**
     * 初期化状態を確認
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * アンロック可能なレッスンの一覧を取得
     */
    getUnlockedLessons(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return [];
        
        const unlockedLessons = [];
        
        course.modules.forEach(module => {
            // モジュールがアンロックされているかチェック
            if (this.isModuleUnlocked(courseId, module.id)) {
                module.lessons.forEach(lessonId => {
                    if (this.isLessonUnlocked(courseId, lessonId)) {
                        unlockedLessons.push({
                            lessonId: lessonId,
                            moduleId: module.id,
                            moduleTitle: module.title,
                            isCompleted: progress.completedLessons.includes(lessonId)
                        });
                    }
                });
            }
        });
        
        return unlockedLessons;
    }

    /**
     * 次にアンロックされるレッスンの情報を取得
     */
    getNextUnlockInfo(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return null;
        
        // 全レッスンを順番に確認
        for (const module of course.modules) {
            for (const lessonId of module.lessons) {
                // まだ完了していないレッスンを探す
                if (!progress.completedLessons.includes(lessonId)) {
                    if (this.isLessonUnlocked(courseId, lessonId)) {
                        // 既にアンロックされている場合は次のレッスン
                        continue;
                    } else {
                        // ロックされているレッスンの場合、アンロック条件を返す
                        return this.getUnlockRequirements(courseId, lessonId);
                    }
                }
            }
        }
        
        return null; // 全レッスン完了
    }

    /**
     * レッスンのアンロック要件を取得
     */
    getUnlockRequirements(courseId, lessonId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return null;
        
        // レッスンが属するモジュールを見つける
        let targetModule = null;
        for (const module of course.modules) {
            if (module.lessons.includes(lessonId)) {
                targetModule = module;
                break;
            }
        }
        
        if (!targetModule) return null;
        
        const requirements = {
            lessonId: lessonId,
            moduleId: targetModule.id,
            moduleTitle: targetModule.title,
            missingPrerequisites: [],
            missingPreviousLessons: []
        };
        
        // 前提条件モジュールのチェック
        for (const prerequisiteModuleId of targetModule.prerequisites) {
            if (!progress.completedModules.includes(prerequisiteModuleId)) {
                const prerequisiteModule = course.modules.find(m => m.id === prerequisiteModuleId);
                requirements.missingPrerequisites.push({
                    moduleId: prerequisiteModuleId,
                    moduleTitle: prerequisiteModule ? prerequisiteModule.title : prerequisiteModuleId
                });
            }
        }
        
        // 前のレッスンのチェック
        const lessonIndex = targetModule.lessons.indexOf(lessonId);
        if (lessonIndex > 0) {
            const previousLessonId = targetModule.lessons[lessonIndex - 1];
            if (!progress.completedLessons.includes(previousLessonId)) {
                requirements.missingPreviousLessons.push(previousLessonId);
            }
        }
        
        return requirements;
    }

    /**
     * コース全体のアンロック状況を取得
     */
    getCourseUnlockStatus(courseId) {
        const course = this.getCourse(courseId);
        const progress = this.getCourseProgress(courseId);
        
        if (!course || !progress) return null;
        
        const moduleStatus = course.modules.map(module => {
            const isUnlocked = this.isModuleUnlocked(courseId, module.id);
            const isCompleted = progress.completedModules.includes(module.id);
            
            const lessonStatus = module.lessons.map(lessonId => ({
                lessonId: lessonId,
                isUnlocked: this.isLessonUnlocked(courseId, lessonId),
                isCompleted: progress.completedLessons.includes(lessonId)
            }));
            
            const completedLessons = lessonStatus.filter(l => l.isCompleted).length;
            const unlockedLessons = lessonStatus.filter(l => l.isUnlocked).length;
            
            return {
                moduleId: module.id,
                moduleTitle: module.title,
                isUnlocked: isUnlocked,
                isCompleted: isCompleted,
                totalLessons: module.lessons.length,
                completedLessons: completedLessons,
                unlockedLessons: unlockedLessons,
                lessons: lessonStatus,
                prerequisites: module.prerequisites
            };
        });
        
        return {
            courseId: courseId,
            courseTitle: course.title,
            modules: moduleStatus,
            totalModules: course.modules.length,
            completedModules: progress.completedModules.length,
            unlockedModules: moduleStatus.filter(m => m.isUnlocked).length
        };
    }
}

export { CourseManager };