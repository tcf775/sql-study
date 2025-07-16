import { DuckDBManager } from './duckdb-manager.js';
import { GameEngine } from './game-engine.js';
import { UIController } from './ui-controller.js';
import { SQLAutoComplete } from './sql-autocomplete.js';
import { CourseUI } from './course-ui.js';
import { CourseManager } from './course-manager.js';
import { ProgressManager } from './progress-manager.js';
import { ProgressUI } from './progress-ui.js';
import { ErrorHandler } from './error-handler.js';
import { NotificationSystem } from './notification-system.js';
import { AdaptiveLearning } from './adaptive-learning.js';
import { AdaptiveLearningUI } from './adaptive-learning-ui.js';
import { UIOptimizer } from './ui-optimizer.js';
import { PerformanceMonitor } from './performance-monitor.js';


// グローバル変数
let dbManager;
let gameEngine;
let uiController;
let courseManager;
let courseUI;
let progressUI;
let adaptiveLearning;
let adaptiveLearningUI;
let uiOptimizer;
let performanceMonitor;

// アプリケーション初期化
async function initializeApp() {
    try {
        // エラーハンドリングシステムを最初に初期化
        const errorHandler = new ErrorHandler();
        const notificationSystem = new NotificationSystem();
        
        // エラーハンドラーに通知システムを登録
        errorHandler.addNotificationCallback((message, type) => {
            notificationSystem.showErrorNotification(message, type);
        });
        
        // グローバルアクセス用
        window.errorHandler = errorHandler;
        window.notificationSystem = notificationSystem;
        
        // DuckDB初期化
        dbManager = new DuckDBManager();
        const dbInitialized = await dbManager.initialize();
        
        if (!dbInitialized) {
            throw new Error('データベースの初期化に失敗しました');
        }

        // ProgressManager初期化
        const progressManager = new ProgressManager();
        
        // CourseManager初期化
        courseManager = new CourseManager();
        courseManager.setProgressManager(progressManager);
        await courseManager.loadCourses();

        // ゲームエンジン初期化
        gameEngine = new GameEngine();
        gameEngine.setCourseManager(courseManager);

        // 適応的学習システム初期化
        adaptiveLearning = new AdaptiveLearning(courseManager, gameEngine);
        await adaptiveLearning.initialize();
        gameEngine.setAdaptiveLearning(adaptiveLearning);
        
        // 既存のチャレンジ読み込み（フォールバック用）
        await gameEngine.loadChallenges();

        // UIOptimizer初期化
        uiOptimizer = new UIOptimizer();
        uiOptimizer.initialize();
        
        // PerformanceMonitor初期化
        performanceMonitor = new PerformanceMonitor();
        
        // グローバルアクセス用
        window.dbManager = dbManager;
        window.gameEngine = gameEngine;
        window.courseManager = courseManager;
        window.adaptiveLearning = adaptiveLearning;
        window.uiOptimizer = uiOptimizer;
        window.performanceMonitor = performanceMonitor;
        
        // UIコントローラー初期化
        const autoComplete = new SQLAutoComplete();
        uiController = new UIController(gameEngine, autoComplete);
        uiController.setCourseManager(courseManager);
        uiController.initializeCourseUI();
        window.uiController = uiController;

        // CourseUI初期化
        courseUI = new CourseUI(courseManager, gameEngine);
        window.courseUI = courseUI;
        
        // ProgressUI初期化
        progressUI = new ProgressUI(courseManager, gameEngine);
        window.progressUI = progressUI;
        
        // AdaptiveLearningUI初期化
        adaptiveLearningUI = new AdaptiveLearningUI(adaptiveLearning, gameEngine, courseManager);
        window.adaptiveLearningUI = adaptiveLearningUI;
        
        // スキーマ情報を読み込み
        await uiController.loadSchemaInfo();
        
        // 実行ボタンを有効化
        document.getElementById('run-query').disabled = false;
        
        // コースシステムの初期化
        await initializeCourseSystem();
        
        // ローディング画面を非表示
        uiController.hideLoading();
        
        console.log('SQL学習ゲームが正常に初期化されました');
        
    } catch (error) {
        console.error('初期化エラー:', error);
        
        // ErrorHandlerが利用可能な場合は使用
        if (window.errorHandler) {
            window.errorHandler.logError('INITIALIZATION_ERROR', error, {
                operation: 'main_initialization',
                timestamp: new Date().toISOString()
            });
        }
        
        // NotificationSystemが利用可能な場合は通知を表示
        if (window.notificationSystem) {
            window.notificationSystem.show(
                'アプリケーションの初期化中にエラーが発生しました。ページを再読み込みしてください。',
                'error',
                {
                    duration: 0,
                    actions: [
                        {
                            label: '再読み込み',
                            callback: () => location.reload(),
                            primary: true
                        }
                    ]
                }
            );
        }
        
        document.getElementById('loading-screen').innerHTML = `
            <div class="loading-content">
                <h2>エラーが発生しました</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">再読み込み</button>
            </div>
        `;
    }
}

// コースシステムの初期化
async function initializeCourseSystem() {
    try {
        console.log('コースシステムの初期化を開始します...');
        
        // CourseManagerの初期化状態を確認
        if (!courseManager.initialized) {
            console.warn('CourseManagerが初期化されていません。再初期化を試行します。');
            await courseManager.loadCourses();
        }
        
        // 既存ユーザーの進捗復元処理
        const restoredCourse = await restoreUserProgress();
        
        if (restoredCourse) {
            // 既存のコースがある場合はそのコースを設定
            await gameEngine.setCourse(restoredCourse);
            
            // 進捗に基づいて適切なレッスンに移動
            const nextLesson = courseManager.getNextLesson(restoredCourse.id);
            if (nextLesson) {
                console.log(`次のレッスンに移動: ${nextLesson.lessonId} (モジュール: ${nextLesson.moduleTitle})`);
                // 適切なレッスンを設定
                await gameEngine.setCurrentLesson(nextLesson.lessonId);
            }
            
            // UI更新
            uiController.updateChallenge();
            progressUI.updateProgressDisplay();
            
            // 復元完了の通知
            if (window.notificationSystem) {
                window.notificationSystem.show(
                    `学習を再開しました: ${restoredCourse.title}`,
                    'success',
                    { duration: 3000 }
                );
            }
            
            console.log(`既存のコースを復元しました: ${restoredCourse.title}`);
        } else {
            // 初回アクセス時のコース選択画面表示
            await showInitialCourseSelection();
        }
        
        console.log('コースシステムの初期化が完了しました');
        
    } catch (error) {
        console.error('コースシステム初期化エラー:', error);
        
        // ErrorHandlerを使用してエラーを処理
        if (window.errorHandler) {
            window.errorHandler.logError('COURSE_SYSTEM_INIT_ERROR', error, {
                operation: 'initializeCourseSystem',
                timestamp: new Date().toISOString()
            });
        }
        
        // エラー時のフォールバック処理
        await handleCourseSystemInitError(error);
    }
}

// 既存ユーザーの進捗復元処理
async function restoreUserProgress() {
    try {
        console.log('既存ユーザーの進捗復元を開始します...');
        
        // 現在選択されているコースを取得
        const currentCourse = courseManager.getCurrentCourse();
        
        if (currentCourse) {
            // コースの進捗データを取得
            const progress = courseManager.getCourseProgress(currentCourse.id);
            
            if (progress) {
                console.log(`進捗データを発見: ${currentCourse.title}`, {
                    completedLessons: progress.completedLessons.length,
                    completedModules: progress.completedModules.length,
                    totalScore: progress.totalScore,
                    lastAccessed: progress.lastAccessed
                });
                
                // 最終アクセス日時を更新
                courseManager.progressManager.updateLastAccessed(currentCourse.id);
                
                // 進捗の整合性をチェック
                const validationResult = validateProgressIntegrity(currentCourse, progress);
                if (!validationResult.isValid) {
                    console.warn('進捗データの整合性に問題があります:', validationResult.issues);
                    
                    // 自動修復を試行
                    const repairResult = await repairProgressData(currentCourse.id, progress, validationResult.issues);
                    if (repairResult.success) {
                        console.log('進捗データの自動修復が完了しました');
                    } else {
                        console.error('進捗データの修復に失敗しました:', repairResult.error);
                    }
                }
                
                return currentCourse;
            } else {
                console.log(`コース ${currentCourse.title} の進捗データが見つかりません。新規として扱います。`);
                // 進捗データを初期化
                courseManager.initializeCourseProgress(currentCourse.id);
                return currentCourse;
            }
        }
        
        console.log('選択されたコースが見つかりません');
        return null;
        
    } catch (error) {
        console.error('進捗復元エラー:', error);
        
        // ErrorHandlerを使用してエラーを処理
        if (window.errorHandler) {
            window.errorHandler.logError('PROGRESS_RESTORE_ERROR', error, {
                operation: 'restoreUserProgress',
                timestamp: new Date().toISOString()
            });
        }
        
        return null;
    }
}

// 初回アクセス時のコース選択画面表示
async function showInitialCourseSelection() {
    try {
        console.log('初回アクセス: コース選択画面を表示します');
        
        // 利用可能なコース一覧を取得
        const availableCourses = courseManager.getCourses();
        
        if (availableCourses.length === 0) {
            throw new Error('利用可能なコースが見つかりません');
        }
        
        console.log(`${availableCourses.length}個のコースが利用可能です:`, 
            availableCourses.map(course => course.title));
        
        // コース選択画面を表示
        courseUI.showCourseSelection();
        
        // ウェルカムメッセージを表示
        if (window.notificationSystem) {
            window.notificationSystem.show(
                'SQL学習プラットフォームへようこそ！学習したいコースを選択してください。',
                'info',
                { 
                    duration: 5000,
                    position: 'top-center'
                }
            );
        }
        
    } catch (error) {
        console.error('初回コース選択画面表示エラー:', error);
        throw error;
    }
}

// 進捗データの整合性チェック
function validateProgressIntegrity(course, progress) {
    const issues = [];
    let isValid = true;
    
    try {
        // 完了済みレッスンの妥当性チェック
        const allValidLessons = course.modules.flatMap(module => module.lessons);
        const invalidLessons = progress.completedLessons.filter(lessonId => 
            !allValidLessons.includes(lessonId)
        );
        
        if (invalidLessons.length > 0) {
            issues.push({
                type: 'invalid_lessons',
                description: '存在しないレッスンが完了済みとしてマークされています',
                data: invalidLessons
            });
            isValid = false;
        }
        
        // 完了済みモジュールの妥当性チェック
        const allValidModules = course.modules.map(module => module.id);
        const invalidModules = progress.completedModules.filter(moduleId => 
            !allValidModules.includes(moduleId)
        );
        
        if (invalidModules.length > 0) {
            issues.push({
                type: 'invalid_modules',
                description: '存在しないモジュールが完了済みとしてマークされています',
                data: invalidModules
            });
            isValid = false;
        }
        
        // モジュール完了の論理的整合性チェック
        for (const moduleId of progress.completedModules) {
            const module = course.modules.find(m => m.id === moduleId);
            if (module) {
                const moduleAllLessonsCompleted = module.lessons.every(lessonId => 
                    progress.completedLessons.includes(lessonId)
                );
                
                if (!moduleAllLessonsCompleted) {
                    issues.push({
                        type: 'module_lesson_mismatch',
                        description: `モジュール ${moduleId} が完了済みですが、すべてのレッスンが完了していません`,
                        data: { moduleId, incompleteLessons: module.lessons.filter(lessonId => 
                            !progress.completedLessons.includes(lessonId)
                        )}
                    });
                    isValid = false;
                }
            }
        }
        
        // 日付の妥当性チェック
        if (progress.startDate && progress.lastAccessed) {
            const startDate = new Date(progress.startDate);
            const lastAccessed = new Date(progress.lastAccessed);
            
            if (lastAccessed < startDate) {
                issues.push({
                    type: 'invalid_dates',
                    description: '最終アクセス日時が開始日時より前になっています',
                    data: { startDate: progress.startDate, lastAccessed: progress.lastAccessed }
                });
                isValid = false;
            }
        }
        
    } catch (error) {
        console.error('進捗整合性チェックエラー:', error);
        issues.push({
            type: 'validation_error',
            description: '整合性チェック中にエラーが発生しました',
            data: error.message
        });
        isValid = false;
    }
    
    return { isValid, issues };
}

// 進捗データの自動修復
async function repairProgressData(courseId, progress, issues) {
    try {
        console.log(`進捗データの自動修復を開始: ${courseId}`);
        
        let repaired = false;
        
        for (const issue of issues) {
            switch (issue.type) {
                case 'invalid_lessons':
                    // 存在しないレッスンを削除
                    const validLessons = progress.completedLessons.filter(lessonId => 
                        !issue.data.includes(lessonId)
                    );
                    courseManager.progressManager.setCompletedLessons(courseId, validLessons);
                    repaired = true;
                    console.log(`無効なレッスンを削除しました:`, issue.data);
                    break;
                    
                case 'invalid_modules':
                    // 存在しないモジュールを削除
                    const validModules = progress.completedModules.filter(moduleId => 
                        !issue.data.includes(moduleId)
                    );
                    courseManager.progressManager.setCompletedModules(courseId, validModules);
                    repaired = true;
                    console.log(`無効なモジュールを削除しました:`, issue.data);
                    break;
                    
                case 'module_lesson_mismatch':
                    // モジュール完了状態をリセット
                    courseManager.progressManager.removeCompletedModule(courseId, issue.data.moduleId);
                    repaired = true;
                    console.log(`モジュール完了状態をリセットしました: ${issue.data.moduleId}`);
                    break;
                    
                case 'invalid_dates':
                    // 最終アクセス日時を現在時刻に更新
                    courseManager.progressManager.updateLastAccessed(courseId);
                    repaired = true;
                    console.log('最終アクセス日時を修正しました');
                    break;
            }
        }
        
        if (repaired) {
            console.log('進捗データの自動修復が完了しました');
            return { success: true };
        } else {
            return { success: false, error: '修復可能な問題が見つかりませんでした' };
        }
        
    } catch (error) {
        console.error('進捗データ修復エラー:', error);
        return { success: false, error: error.message };
    }
}

// コースシステム初期化エラーのハンドリング
async function handleCourseSystemInitError(error) {
    try {
        console.log('コースシステム初期化エラーのフォールバック処理を実行します');
        
        // エラーの種類に応じた処理
        if (error.message.includes('courses.json') || error.message.includes('COURSE_LOAD_ERROR')) {
            // コースデータ読み込みエラーの場合
            console.log('デフォルトコースでの初期化を試行します');
            
            // デフォルトコースを読み込み
            await courseManager.loadDefaultCourse();
            
            // デフォルトコースを設定
            const defaultCourse = courseManager.getCourses()[0];
            if (defaultCourse) {
                courseManager.selectCourse(defaultCourse.id);
                await gameEngine.setCourse(defaultCourse);
                uiController.updateChallenge();
                
                // ユーザーに通知
                if (window.notificationSystem) {
                    window.notificationSystem.show(
                        'コースデータの読み込みに問題がありましたが、デフォルトコースで学習を開始できます。',
                        'warning',
                        { duration: 5000 }
                    );
                }
                
                console.log('デフォルトコースでの初期化が完了しました');
                return;
            }
        }
        
        // その他のエラーの場合は基本的なUI更新のみ実行
        console.log('基本的なUI更新を実行します');
        uiController.updateChallenge();
        
        // ユーザーにエラーを通知
        if (window.notificationSystem) {
            window.notificationSystem.show(
                'コースシステムの初期化中に問題が発生しました。一部の機能が制限される可能性があります。',
                'error',
                { 
                    duration: 0,
                    actions: [
                        {
                            label: 'ページを再読み込み',
                            callback: () => location.reload(),
                            primary: true
                        }
                    ]
                }
            );
        }
        
    } catch (fallbackError) {
        console.error('フォールバック処理でもエラーが発生しました:', fallbackError);
        
        // 最後の手段として基本的なUI更新
        try {
            uiController.updateChallenge();
        } catch (finalError) {
            console.error('最終的なUI更新も失敗しました:', finalError);
        }
    }
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', initializeApp);

// ページ終了時のクリーンアップ
window.addEventListener('beforeunload', async () => {
    if (dbManager) {
        await dbManager.close();
    }
});

