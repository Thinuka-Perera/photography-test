# Photography POS System

This is a Laravel + React (Inertia.js & Vite) based application for POS (Point of Sale).

## Prerequisites
Make sure you have the following installed on your local machine:
- PHP (>= 8.1 recommended)
- Composer
- Node.js & npm
- A Database (MySQL, SQLite, etc.)

## Local Setup Instructions 🚀

Follow these steps to get the app running on your local environment:

### 1. Install Backend Dependencies
Run the following command to install Laravel dependencies:
```sh
composer install
```

### 2. Install Frontend Dependencies
Run the following command to install React and Vite dependencies:
```sh
npm install
```

### 3. Setup Environment File
Copy the example environment file to create your own configuration:
```sh
cp .env.example .env
```
*(Important: Open the `.env` file and set up your database credentials like `DB_CONNECTION`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, etc.)*

### 4. Generate Application Key
Generate a unique application key for Laravel:
```sh
php artisan key:generate
```

### 5. Create Database & Run Migrations
First, open your MySQL or WAMP/XAMPP Database Client and create a new empty database named `photograpy_pos`.

Then, run the migrations and seed the demo data:
```sh
php artisan migrate:fresh --seed
```

This will automatically create:
- ✅ All database tables (categories, products, product_variants, inventory, stock_logs)
- ✅ Default admin user → `admin@local` / `pass123`
- ✅ Sample categories: Photo Frames, Inks, Photo Paper
- ✅ Sample products with variants (4x6 Grade A/B, 8x10 Grade A, etc.) and auto-generated SKUs
- ✅ Opening stock for all variants logged as "Opening Balance"

*(If you want to reset and re-seed at any time, just run `php artisan migrate:fresh --seed` again)*

### 6. Start the Development Servers
You need to run both the Laravel backend and the Vite frontend server at the same time.

**Terminal 1 (Frontend):**
Start Vite to compile React assets:
```sh
npm run dev
```

**Terminal 2 (Backend):**
Start the Laravel development server:
```sh
php artisan serve
```

### 7. View the Application
Now, open your web browser and visit:
👉 **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**
