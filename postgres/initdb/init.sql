-- 従業員テーブル
CREATE TABLE employees (
employee_id SERIAL PRIMARY KEY,
first_name VARCHAR(50) NOT NULL,
last_name VARCHAR(50) NOT NULL,
email VARCHAR(100) NOT NULL,
department_id INTEGER NOT NULL,
hire_date DATE NOT NULL,
salary NUMERIC(10,2) NOT NULL
);

-- 部門テーブル
CREATE TABLE departments (
department_id SERIAL PRIMARY KEY,
department_name VARCHAR(100) NOT NULL,
location VARCHAR(100) NOT NULL
);

-- 商品テーブル
CREATE TABLE products (
product_id SERIAL PRIMARY KEY,
product_name VARCHAR(100) NOT NULL,
category VARCHAR(50) NOT NULL,
unit_price NUMERIC(10,2) NOT NULL
);

-- 在庫テーブル
CREATE TABLE inventory (
inventory_id SERIAL PRIMARY KEY,
product_id INTEGER NOT NULL,
quantity_in_stock INTEGER NOT NULL,
FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- 注文テーブル
CREATE TABLE orders (
order_id SERIAL PRIMARY KEY,
customer_name VARCHAR(100) NOT NULL,
product_id INTEGER NOT NULL,
quantity INTEGER NOT NULL,
order_date DATE NOT NULL,
total_amount NUMERIC(10,2) NOT NULL,
FOREIGN KEY (product_id) REFERENCES products(product_id)
);

COPY employees FROM '/csv/employees.csv' DELIMITER ',' CSV HEADER;
COPY departments FROM '/csv/departments.csv' DELIMITER ',' CSV HEADER;
COPY products FROM '/csv/products.csv' DELIMITER ',' CSV HEADER;
COPY inventory FROM '/csv/inventory.csv' DELIMITER ',' CSV HEADER;
COPY orders FROM '/csv/orders.csv' DELIMITER ',' CSV HEADER;