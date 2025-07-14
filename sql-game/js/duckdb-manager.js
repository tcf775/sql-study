export class DuckDBManager {
    constructor() {
        this.db = null;
        this.conn = null;
        this.isInitialized = false;
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
            
            await this.loadCSVData();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('DuckDB初期化エラー:', error);
            return false;
        }
    }



    async loadCSVData() {
        try {
            // OPFSにCSVファイルを保存してDuckDBで読み込み
            await this.setupCSVInOPFS();
            
            // DuckDBにCSVファイルを登録してテーブル作成
            const tables = ['employees', 'departments', 'products', 'inventory', 'orders'];
            
            for (const table of tables) {
                await this.conn.query(`
                    CREATE TABLE ${table} AS 
                    SELECT * FROM read_csv_auto('${table}.csv')
                `);
            }
            
            console.log('CSVデータがOPFSから読み込まれました');
        } catch (error) {
            console.error('CSV読み込みエラー:', error);
            throw error;
        }
    }
    
    async setupCSVInOPFS() {
        const csvData = {
            employees: `employee_id,first_name,last_name,email,department_id,hire_date,salary
1,John,Doe,john.doe@example.com,1,2020-01-01,50000.00
2,Jane,Smith,jane.smith@example.com,2,2021-03-15,45000.00
3,Michael,Johnson,michael.johnson@example.com,1,2019-06-01,55000.00
4,Emily,Brown,emily.brown@example.com,3,2022-02-01,48000.00
5,David,Lee,david.lee@example.com,2,2018-09-01,52000.00
6,Sarah,Wilson,sarah.wilson@example.com,4,2021-04-15,47000.00
7,Robert,Anderson,robert.anderson@example.com,1,2020-07-01,53000.00
8,Jessica,Thompson,jessica.thompson@example.com,3,2019-11-01,49000.00
9,Daniel,Martinez,daniel.martinez@example.com,2,2022-01-01,46000.00
10,Olivia,Hernandez,olivia.hernandez@example.com,4,2018-05-01,51000.00`,
            
            departments: `department_id,department_name,location
1,Sales,New York
2,Marketing,Los Angeles
3,IT,Chicago
4,Finance,Seattle
5,HR,Boston`,
            
            products: `product_id,product_name,category,unit_price
1,Product A,Electronics,100.00
2,Product B,Office Supplies,150.00
3,Product C,Electronics,120.00
4,Product D,Home Goods,150.00
5,Product E,Office Supplies,80.00
6,Product F,Electronics,90.00
7,Product G,Home Goods,100.00
8,Product H,Office Supplies,130.00
9,Product I,Electronics,110.00
10,Product J,Home Goods,160.00`,
            
            inventory: `inventory_id,product_id,quantity_in_stock
1,1,25
2,2,30
3,3,15
4,4,20
5,5,40
6,6,35
7,7,10
8,8,25
9,9,30
10,10,5`,
            
            orders: `order_id,customer_name,product_id,quantity,order_date,total_amount
1,ABC Corp,1,5,2024-01-15,500.00
2,XYZ Ltd,2,3,2024-01-16,450.00
3,Tech Solutions,3,2,2024-01-17,240.00
4,Office Plus,4,4,2024-01-18,600.00
5,Home Store,5,10,2024-01-19,800.00`
        };
        
        // 各CSVファイルをDuckDBに登録
        for (const [tableName, csvContent] of Object.entries(csvData)) {
            await this.db.registerFileText(`${tableName}.csv`, csvContent);
        }
    }

    async executeQuery(sql) {
        if (!this.isInitialized) {
            throw new Error('データベースが初期化されていません');
        }

        try {
            const result = await this.conn.query(sql);
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

    async close() {
        if (this.conn) {
            await this.conn.close();
        }
        if (this.db) {
            await this.db.terminate();
        }
    }
}