CREATE ROLE study_role WITH LOGIN PASSWORD 'password';
GRANT CONNECT ON DATABASE postgres TO study_role;

-- 顧客テーブル
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    birth_date DATE,
    registration_date DATE,
    city VARCHAR(50),
    country VARCHAR(50)
);

-- 商品テーブル
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    category VARCHAR(50),
    price DECIMAL(10, 2),
    stock_quantity INT
);

-- 注文テーブル
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE,
    total_amount DECIMAL(10, 2),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- 注文詳細テーブル
CREATE TABLE order_details (
    order_detail_id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    price_per_unit DECIMAL(10, 2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

GRANT SELECT ON ALL TABLES IN SCHEMA public TO study_role;

-- customers テーブルにデータをインポート
COPY customers(customer_id, first_name, last_name, email, birth_date, registration_date, city, country)
FROM '/csv/customers.csv' DELIMITER ',' CSV HEADER;

-- products テーブルにデータをインポート
COPY products(product_id, product_name, category, price, stock_quantity)
FROM '/csv/products.csv' DELIMITER ',' CSV HEADER;

-- orders テーブルにデータをインポート
COPY orders(order_id, customer_id, order_date, total_amount)
FROM '/csv/orders.csv' DELIMITER ',' CSV HEADER;

-- order_details テーブルにデータをインポート
COPY order_details(order_detail_id, order_id, product_id, quantity, price_per_unit)
FROM '/csv/order_details.csv' DELIMITER ',' CSV HEADER;