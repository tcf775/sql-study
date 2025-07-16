export class DuckDBManager {
    constructor() {
        this.db = null;
        this.conn = null;
        this.isInitialized = false;
        this.dbFileName = 'sql-game.db';
    }

    async initialize() {
        try {
            const JSDELIVR_BUNDLES = window.duckdb.getJsDelivrBundles();
            const bundle = await window.duckdb.selectBundle(JSDELIVR_BUNDLES);
            
            const worker_url = URL.createObjectURL(
                new Blob([`importScripts("${bundle.mainWorker}");`], {
                    type: "text/javascript",
                })
            );
            const worker = new Worker(worker_url);
            const logger = new window.duckdb.ConsoleLogger();
            this.db = new window.duckdb.AsyncDuckDB(logger, worker);
            await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            this.conn = await this.db.connect();
            URL.revokeObjectURL(worker_url);
            
            // 強制的に新しいCSVデータを読み込み（開発中）
            console.log('新しいCSVデータを読み込みます...');
            await this.clearOPFS(); // 古いデータをクリア
            await this.setupCSVData();
            await this.saveToOPFS();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('DuckDB初期化エラー:', error);
            return false;
        }
    }



    async restoreFromOPFS() {
        try {
            const opfsRoot = await navigator.storage.getDirectory();
            const fileHandle = await opfsRoot.getFileHandle('sql-game-data.json');
            const file = await fileHandle.getFile();
            const jsonData = JSON.parse(await file.text());
            
            // 各テーブルを復元
            for (const [tableName, tableData] of Object.entries(jsonData)) {
                const columns = Object.keys(tableData[0] || {});
                const createSql = `CREATE TABLE ${tableName} (${columns.map(col => `${col} VARCHAR`).join(', ')})`;
                await this.conn.query(createSql);
                
                for (const row of tableData) {
                    const values = columns.map(col => `'${row[col]}'`).join(', ');
                    await this.conn.query(`INSERT INTO ${tableName} VALUES (${values})`);
                }
            }
            
            console.log('OPFSからデータを復元しました');
            return true;
        } catch (error) {
            console.log('OPFSにデータが見つかりません。新規作成します。');
            return false;
        }
    }

    async saveToOPFS() {
        try {
            const tables = ['customers', 'categories', 'products', 'orders', 'order_details'];
            const data = {};
            
            for (const tableName of tables) {
                const result = await this.conn.query(`SELECT * FROM ${tableName}`);
                data[tableName] = result.toArray();
            }
            
            const opfsRoot = await navigator.storage.getDirectory();
            const fileHandle = await opfsRoot.getFileHandle('sql-game-data.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data));
            await writable.close();
            console.log('データをOPFSに保存しました');
        } catch (error) {
            console.error('OPFS保存エラー:', error);
        }
    }

    async clearOPFS() {
        try {
            const opfsRoot = await navigator.storage.getDirectory();
            try {
                await opfsRoot.removeEntry('sql-game-data.json');
                console.log('古いOPFSデータを削除しました');
            } catch (error) {
                console.log('OPFSデータが存在しないか、削除に失敗しました');
            }
        } catch (error) {
            console.error('OPFS削除エラー:', error);
        }
    }


    
    async setupCSVData() {
        try {
            // 実際のCSVファイルを読み込み
            const csvFiles = ['customers', 'categories', 'products', 'orders', 'order_details'];
            
            for (const fileName of csvFiles) {
                try {
                    const response = await fetch(`data/${fileName}.csv`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${fileName}.csv`);
                    }
                    const csvContent = await response.text();
                    
                    // DuckDBにCSVファイルを登録
                    await this.db.registerFileText(`${fileName}.csv`, csvContent);
                    
                    // テーブルを作成
                    await this.conn.query(`
                        CREATE TABLE ${fileName} AS 
                        SELECT * FROM read_csv_auto('${fileName}.csv')
                    `);
                    
                    console.log(`${fileName}テーブルを作成しました`);
                } catch (error) {
                    console.error(`${fileName}.csvの読み込みに失敗:`, error);
                }
            }
            
            console.log('全てのCSVデータを読み込みました');
        } catch (error) {
            console.error('CSVデータ設定エラー:', error);
            throw error;
        }
    }

    async executeQuery(sql) {
        if (!this.isInitialized) {
            // ErrorHandlerを使用してデータベースエラーを処理
            if (window.errorHandler) {
                const result = await window.errorHandler.handleError('DATABASE_ERROR', 
                    new Error('データベースが初期化されていません'), {
                    operation: 'executeQuery',
                    sql: sql.substring(0, 100) // SQLの最初の100文字のみログ
                });
                
                if (result.success && result.action === 'offline_mode') {
                    // オフラインモードの場合は制限された結果を返す
                    return {
                        success: false,
                        error: 'オフラインモードのため、SQLクエリを実行できません',
                        offline: true
                    };
                }
            }
            
            throw new Error('データベースが初期化されていません');
        }

        try {
            const result = await this.conn.query(sql);
            // データ変更クエリの場合はOPFSに保存
            if (sql.trim().toUpperCase().match(/^(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/)) {
                await this.saveToOPFS();
            }
            return {
                success: true,
                data: result.toArray(),
                columns: result.schema.fields.map(field => field.name)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getSchemaInfo() {
        if (!this.isInitialized) {
            throw new Error('データベースが初期化されていません');
        }

        try {
            // DuckDB固有の方法でテーブル一覧を取得
            const tablesResult = await this.conn.query(`SHOW TABLES`);
            const tables = tablesResult.toArray();
            const schemaInfo = [];
            
            // 各テーブルのカラム情報を取得
            for (const table of tables) {
                const tableName = table.name;
                const columnsResult = await this.conn.query(`DESCRIBE ${tableName}`);
                const columns = columnsResult.toArray();
                
                schemaInfo.push({
                    tableName: tableName,
                    columns: columns.map(col => ({
                        name: col.column_name,
                        type: col.column_type
                    }))
                });
            }
            
            return schemaInfo;
        } catch (error) {
            console.error('スキーマ情報取得エラー:', error);
            throw error;
        }
    }

    async close() {
        if (this.conn) {
            await this.conn.close();
        }
        if (this.db) {
            await this.db.terminate();
        }
    }
}