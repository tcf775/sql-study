#!/bin/bash

# CSVファイル生成用の関数
generate_customers_csv() {
    echo "customer_id,first_name,last_name,email,birth_date,registration_date,city,country" > customers.csv
    for i in {1..5000}; do
        echo "$i,FirstName$i,LastName$i,user$i@example.com,$(date -d "1970-01-01 + $((RANDOM % 18250)) days" +%Y-%m-%d),$(date -d "2010-01-01 + $((RANDOM % 5000)) days" +%Y-%m-%d),City$((RANDOM % 100)),Country$((RANDOM % 20))" >> customers.csv
    done
}

generate_products_csv() {
    echo "product_id,product_name,category,price,stock_quantity" > products.csv
    for i in {1..1000}; do
        echo "$i,Product$i,Category$((RANDOM % 10)),$(printf "%.2f" $(echo "scale=2; $RANDOM/100" | bc)),${RANDOM}" >> products.csv
    done
}

generate_orders_csv() {
    echo "order_id,customer_id,order_date,total_amount" > orders.csv
    for i in {1..10000}; do
        customer_id=$((RANDOM % 5000 + 1))
        echo "$i,$customer_id,$(date -v+$(($RANDOM % 1000))d -jf "%Y-%m-%d" "2020-01-01" +%Y-%m-%d),$(printf "%.2f" $(echo "scale=2; $RANDOM/100" | bc))" >> orders.csv
    done
}

generate_order_details_csv() {
    echo "order_detail_id,order_id,product_id,quantity,price_per_unit" > order_details.csv
    for i in {1..30000}; do
        order_id=$((RANDOM % 10000 + 1))
        product_id=$((RANDOM % 1000 + 1))
        quantity=$((RANDOM % 10 + 1))
        echo "$i,$order_id,$product_id,$quantity,$(printf "%.2f" $(echo "scale=2; $RANDOM/100" | bc))" >> order_details.csv
    done
}

# CSVファイル生成
echo "Generating CSV files..."
generate_customers_csv
generate_products_csv
generate_orders_csv
generate_order_details_csv
echo "CSV file generation completed."