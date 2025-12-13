# 🤑 Udhaar Sathi (Financial Ledger Bot)

A powerful Telegram bot to track debts, expenses, and split bills. It features AI-powered extraction from text, voice notes, and images, along with sarcastic financial roasts.

---

## ✨ Features

- **📝 Debt Tracking**: Maintain a persistent ledger of who owes you (or who you owe).
- **🗣️ Voice & AI**: Speak naturally ("Ramesh 500 next week") and the bot extracts Name, Amount, and Intent (Credit/Debit) using **Llama-3.3-70b**.
- **📸 Smart Vision**: Upload a photo of a handwritten note, and the bot digitizes the debts.
- **📜 Statement & History**: View detailed logs (/summary, /history) or get a visual Pie Chart (/chart).
- **🔥 AI Roast**: Get a sarcastic reality check on your spending habits (/roast).
- **📢 Notifications**: Automatically notifies the other party if their phone number is registered.
- **✅ Confirmation Flow**: Verify extracted data with "Confirm / Cancel" buttons before saving.
- **🪙 Coin Flip**: Settle disputes with a random coin flip (/menu).

---

## 🛠️ Prerequisites

Before you begin, ensure you have:
1.  **Node.js** (v18 or higher)
2.  **Supabase Account** (for Database)
3.  **Telegram Bot Token** (from @BotFather)
4.  **Groq API Key** (for fast AI inference)

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/PAVAN9464/udhaar-sathi.git
cd udhaar-sathi
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (you can copy `.env.example`):
```bash
cp .env.example .env
```
Fill in your credentials:
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJh......
GROQ_API_KEY=gsk_......
PORT=3000
```

### 4. Database Setup (Supabase)
Create the following tables in your Supabase SQL Editor:
```sql
-- Users Table
create table users (
  id uuid default uuid_generate_v4() primary key,
  chatId text unique not null,
  phone text,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- history Table
create table history (
  id uuid default uuid_generate_v4() primary key,
  chatId text not null,
  name text not null,
  amount numeric not null,
  phone text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- debt_track (Ledger) Table
create table debt_track (
  id uuid default uuid_generate_v4() primary key,
  chatId text not null,
  name text not null,
  amount text not null, -- stored as text to preserve precision if needed
  dueDate timestamp with time zone,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

## 🏃‍♂️ Start the Server

Run the bot locally:
```bash
node app.js
```
*You should see "Telegram bot polling..." in the console.*

---

## 🤖 Usage Examples

**Add a Debt (Text):**
> "Ramesh 500"
> *Bot adds ₹500 debt for Ramesh.*

**Record Payment:**
> "Paid Ramesh 200"
> *Bot records ₹200 payment (Debit).*

**Voice Note:**
> 🎤 *"Ramesh 500 rupees next Tuesday"*
> *Bot transcribes, extracts name/amount, and asks for confirmation.*

**Upload Photo:**

![5](https://github.com/user-attachments/assets/54e06edc-a1f3-4c32-956a-8782ab2384b8)

![2](https://github.com/user-attachments/assets/bc83ce0b-665a-4080-b46d-f92071f63f37)

![1](https://github.com/user-attachments/assets/7a9336d8-107c-4821-9e28-8853ba4e17c2)

![3](https://github.com/user-attachments/assets/ecbe256b-62b1-4434-b392-3c894093bfd4)
![4](https://github.com/user-attachments/assets/02ac9633-072d-46a4-89f2-c88cab9408c8)

**Commands:**
- `/start` -  Welcome menu
- `/menu` - Main dashboard (Stats, Roast, Coin Flip)
- `/summary` - Ledger balance summary
- `/chart` - Visual Pie Chart of debts
- `/roast` - AI roasts your finances
- `/clear [name]` - Clear specific debt
- `/reset` - Clear **ALL** history (Dangerous!)

---

## 🤝 Contributing
Feel free to open issues or submit pull requests!

## 📄 License
ISC

