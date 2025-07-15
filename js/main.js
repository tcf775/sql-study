import { DuckDBManager } from './duckdb-manager.js';
import { GameEngine } from './game-engine.js';
import { UIController } from './ui-controller.js';
import { SQLAutoComplete } from './sql-autocomplete.js';


// グローバル変数
let dbManager;
let gameEngine;
let uiController;

// アプリケーション初期化
async function initializeApp() {
    try {
        // DuckDB初期化
        dbManager = new DuckDBManager();
        const dbInitialized = await dbManager.initialize();
        
        if (!dbInitialized) {
            throw new Error('データベースの初期化に失敗しました');
        }

        // ゲームエンジン初期化
        gameEngine = new GameEngine();
        await gameEngine.loadChallenges();

        // グローバルアクセス用（スキーマ読み込み前に設定）
        window.dbManager = dbManager;
        window.gameEngine = gameEngine;
        
        // UIコントローラー初期化
        const autoComplete = new SQLAutoComplete();
        uiController = new UIController(gameEngine, autoComplete);
        window.uiController = uiController;
        
        // 最初のチャレンジを表示
        uiController.updateChallenge();
        
        // スキーマ情報を読み込み
        await uiController.loadSchemaInfo();
        
        // 実行ボタンを有効化
        document.getElementById('run-query').disabled = false;
        
        // ローディング画面を非表示
        uiController.hideLoading();
        
        console.log('SQL学習ゲームが正常に初期化されました');
        
    } catch (error) {
        console.error('初期化エラー:', error);
        document.getElementById('loading-screen').innerHTML = `
            <div class="loading-content">
                <h2>エラーが発生しました</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">再読み込み</button>
            </div>
        `;
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

