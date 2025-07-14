export class SQLAutoComplete {
    constructor() {
        this.keywords = [
            'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING',
            'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
            'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
            'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT',
            'ASC', 'DESC', 'LIMIT', 'OFFSET'
        ];
        
        this.tables = {
            'products': ['product_id', 'product_name', 'category', 'unit_price'],
            'employees': ['employee_id', 'first_name', 'last_name', 'email', 'department_id', 'hire_date', 'salary'],
            'departments': ['department_id', 'department_name', 'location'],
            'inventory': ['inventory_id', 'product_id', 'quantity_in_stock'],
            'orders': ['order_id', 'customer_name', 'product_id', 'quantity', 'order_date', 'total_amount']
        };
        
        this.currentSuggestions = [];
        this.selectedIndex = -1;
    }

    getSuggestions(text, cursorPos) {
        const beforeCursor = text.substring(0, cursorPos);
        const words = beforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1].toUpperCase();
        
        if (!currentWord) return [];

        const suggestions = [];
        
        // キーワード候補
        this.keywords.forEach(keyword => {
            if (keyword.startsWith(currentWord)) {
                suggestions.push({
                    text: keyword,
                    type: 'keyword',
                    display: keyword
                });
            }
        });

        // テーブル名候補
        Object.keys(this.tables).forEach(table => {
            if (table.toUpperCase().startsWith(currentWord)) {
                suggestions.push({
                    text: table,
                    type: 'table',
                    display: `${table} (テーブル)`
                });
            }
        });

        // カラム名候補
        this.addColumnSuggestions(beforeCursor, currentWord, suggestions);

        return suggestions.slice(0, 10); // 最大10件
    }
    
    addColumnSuggestions(beforeCursor, currentWord, suggestions) {
        const upperText = beforeCursor.toUpperCase();
        
        // FROM句からテーブル名を抽出
        const fromMatches = [...upperText.matchAll(/FROM\s+(\w+)/g)];
        const tables = new Set();
        
        fromMatches.forEach(match => {
            const tableName = match[1].toLowerCase();
            if (this.tables[tableName]) {
                tables.add(tableName);
            }
        });
        
        // JOIN句からテーブル名を抽出
        const joinMatches = [...upperText.matchAll(/JOIN\s+(\w+)/g)];
        joinMatches.forEach(match => {
            const tableName = match[1].toLowerCase();
            if (this.tables[tableName]) {
                tables.add(tableName);
            }
        });
        
        // 各テーブルのカラムを候補に追加
        tables.forEach(tableName => {
            this.tables[tableName].forEach(column => {
                if (column.toUpperCase().startsWith(currentWord)) {
                    suggestions.push({
                        text: column,
                        type: 'column',
                        display: `${column} (${tableName})`
                    });
                }
            });
        });
        
        // テーブル名が特定できない場合は全カラムを候補に
        if (tables.size === 0 && (upperText.includes('SELECT') || upperText.includes('WHERE') || upperText.includes('ORDER'))) {
            Object.keys(this.tables).forEach(tableName => {
                this.tables[tableName].forEach(column => {
                    if (column.toUpperCase().startsWith(currentWord)) {
                        suggestions.push({
                            text: column,
                            type: 'column',
                            display: `${column} (${tableName})`
                        });
                    }
                });
            });
        }
    }

    createSuggestionElement(suggestion, isSelected = false) {
        const div = document.createElement('div');
        div.className = `suggestion-item ${isSelected ? 'selected' : ''} suggestion-${suggestion.type}`;
        div.textContent = suggestion.display;
        div.dataset.text = suggestion.text;
        return div;
    }
}