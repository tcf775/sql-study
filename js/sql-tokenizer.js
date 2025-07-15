export class SQLTokenizer {
    constructor() {
        // SQLキーワードの定義
        this.keywords = new Set([
            'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'GROUP', 'HAVING',
            'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
            'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS',
            'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
            'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT',
            'ASC', 'DESC', 'LIMIT', 'OFFSET', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
            'UNION', 'ALL', 'NULL', 'IS', 'TRUE', 'FALSE'
        ]);
        
        // 演算子の定義
        this.operators = new Set([
            '=', '!=', '<>', '<', '>', '<=', '>=', '+', '-', '*', '/', '%'
        ]);
    }
    
    /**
     * SQLを単語単位で分解する
     * @param {string} sql - 分解するSQL文
     * @returns {Array<Object>} トークンの配列
     */
    tokenize(sql) {
        if (!sql || typeof sql !== 'string') {
            return [];
        }
        
        const tokens = [];
        let i = 0;
        
        while (i < sql.length) {
            const char = sql[i];
            
            // 空白文字をスキップ
            if (/\s/.test(char)) {
                i++;
                continue;
            }
            
            // 文字列リテラル（シングルクォート）
            if (char === "'") {
                const result = this.extractString(sql, i);
                tokens.push({
                    text: result.text,
                    type: 'string',
                    position: tokens.length
                });
                i = result.nextIndex;
                continue;
            }
            
            // 数値
            if (/\d/.test(char)) {
                const result = this.extractNumber(sql, i);
                tokens.push({
                    text: result.text,
                    type: 'number',
                    position: tokens.length
                });
                i = result.nextIndex;
                continue;
            }
            
            // 演算子（2文字の演算子を先にチェック）
            if (i < sql.length - 1) {
                const twoChar = sql.substring(i, i + 2);
                if (this.operators.has(twoChar)) {
                    tokens.push({
                        text: twoChar,
                        type: 'operator',
                        position: tokens.length
                    });
                    i += 2;
                    continue;
                }
            }
            
            // 1文字の演算子
            if (this.operators.has(char)) {
                tokens.push({
                    text: char,
                    type: 'operator',
                    position: tokens.length
                });
                i++;
                continue;
            }
            
            // 区切り文字
            if (/[(),;]/.test(char)) {
                tokens.push({
                    text: char,
                    type: 'punctuation',
                    position: tokens.length
                });
                i++;
                continue;
            }
            
            // 識別子またはキーワード
            if (/[a-zA-Z_]/.test(char)) {
                const result = this.extractIdentifier(sql, i);
                const upperText = result.text.toUpperCase();
                
                tokens.push({
                    text: result.text,
                    type: this.keywords.has(upperText) ? 'keyword' : 'identifier',
                    position: tokens.length
                });
                i = result.nextIndex;
                continue;
            }
            
            // その他の文字（エラー処理）
            tokens.push({
                text: char,
                type: 'unknown',
                position: tokens.length
            });
            i++;
        }
        
        return tokens;
    }
    
    /**
     * 文字列リテラルを抽出
     */
    extractString(sql, startIndex) {
        let i = startIndex + 1; // 開始のクォートをスキップ
        let text = "'";
        
        while (i < sql.length) {
            const char = sql[i];
            text += char;
            
            if (char === "'") {
                // エスケープされたクォートかチェック
                if (i + 1 < sql.length && sql[i + 1] === "'") {
                    text += "'";
                    i += 2;
                } else {
                    // 文字列の終了
                    i++;
                    break;
                }
            } else {
                i++;
            }
        }
        
        return { text, nextIndex: i };
    }
    
    /**
     * 数値を抽出
     */
    extractNumber(sql, startIndex) {
        let i = startIndex;
        let text = '';
        let hasDecimal = false;
        
        while (i < sql.length) {
            const char = sql[i];
            
            if (/\d/.test(char)) {
                text += char;
                i++;
            } else if (char === '.' && !hasDecimal) {
                text += char;
                hasDecimal = true;
                i++;
            } else {
                break;
            }
        }
        
        return { text, nextIndex: i };
    }
    
    /**
     * 識別子を抽出
     */
    extractIdentifier(sql, startIndex) {
        let i = startIndex;
        let text = '';
        
        while (i < sql.length) {
            const char = sql[i];
            
            if (/[a-zA-Z0-9_]/.test(char)) {
                text += char;
                i++;
            } else {
                break;
            }
        }
        
        return { text, nextIndex: i };
    }
    
    /**
     * トークンをランダムに並び替える
     * @param {Array<Object>} tokens - 並び替えるトークンの配列
     * @returns {Array<Object>} シャッフルされたトークンの配列
     */
    shuffle(tokens) {
        if (!Array.isArray(tokens) || tokens.length === 0) {
            return [];
        }
        
        // 元の配列をコピー
        const shuffled = [...tokens];
        
        // Fisher-Yates シャッフルアルゴリズム
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
    }
    
    /**
     * トークンからSQLを再構築
     * @param {Array<Object>} tokens - 再構築するトークンの配列
     * @returns {string} 再構築されたSQL文
     */
    buildSQL(tokens) {
        if (!Array.isArray(tokens) || tokens.length === 0) {
            return '';
        }
        
        let sql = '';
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const prevToken = i > 0 ? tokens[i - 1] : null;
            
            // スペースを追加するかどうかの判定
            if (i > 0 && this.needsSpace(prevToken, token)) {
                sql += ' ';
            }
            
            sql += token.text;
        }
        
        return sql.trim();
    }
    
    /**
     * 2つのトークン間にスペースが必要かどうかを判定
     */
    needsSpace(prevToken, currentToken) {
        // 区切り文字の前後はスペース不要の場合が多い
        if (prevToken.type === 'punctuation' && prevToken.text === '(') {
            return false;
        }
        
        if (currentToken.type === 'punctuation' && /[(),;]/.test(currentToken.text)) {
            return false;
        }
        
        // 演算子の前後は基本的にスペースが必要
        if (prevToken.type === 'operator' || currentToken.type === 'operator') {
            return true;
        }
        
        // その他の場合は基本的にスペースが必要
        return true;
    }
}