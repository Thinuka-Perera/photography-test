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
First, Create a new empty database named `photography_pos`.

> ⚠️ The database name must match `DB_DATABASE` in your `.env` file.

Then, run the migrations and seed the demo data:
```sh
php artisan migrate:fresh --seed
```

This builds all database tables and seeds a ready-to-use starting point.

**🏬 Shops** (this is a multi-shop system):
- ✅ `Photography Studio` — default shop
- ✅ `Digital Colour Lab`

**👤 Roles** — 7 permission levels: `super_admin`, `admin`, `manager`, `inventory_officer`, `cashier`, `studio_staff`, `lab_staff`.

**🔑 Login accounts:**

| Role | Email (login) | Password | Shops |
| --- | --- | --- | --- |
| Super Admin | `admin@possystem.lk` | `admin.pos@` | Both |
| Studio Staff 1 | `studio1@possystem.lk` | `studio1.pos@` | Studio |
| Studio Staff 2 | `studio2@possystem.lk` | `studio2.pos@` | Studio |
| Lab Staff 1 | `lab1@possystem.lk` | `lab1.pos@` | Lab |
| Lab Staff 2 | `lab2@possystem.lk` | `lab2.pos@` | Lab |

> 👉 Log in as **`admin@possystem.lk` / `admin.pos@`** for full access to every feature.

**🏷️ Bill categories** (seeded per shop): Enlargement, Thank You Cards, Collage, Single Photo, Old Photo Recreation, Passport.

**📦 Not seeded (add these inside the app):** products, product variants, inventory/stock, categories, customers, quotations, sales, and bills are intentionally left empty so you can populate real data through the UI.

*(To reset and re-seed at any time, run `php artisan migrate:fresh --seed` again — note this **wipes all existing data** first.)*

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
