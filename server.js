const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const db = new sqlite3.Database('contracting.db');

const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

app.use(bodyParser.json());
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, client_id INTEGER, title TEXT, status TEXT, progress INTEGER, notes TEXT, img TEXT)");
    
    db.get("SELECT count(*) as count FROM users", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO users (username, password, role) VALUES ('admin', '123', 'admin')");
            console.log("✅ تم إنشاء حساب الأدمن (admin / 123)");
        }
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username=? AND password=?", [username, password], (err, row) => {
        if (row) res.json({ success: true, user: row });
        else res.json({ success: false });
    });
});

app.post('/add-user', (req, res) => {
    const { username, password } = req.body;
    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'client')", [username, password], function(err) {
        if (err) res.json({ success: false, message: "موجود مسبقاً" });
        else res.json({ success: true, id: this.lastID });
    });
});

app.post('/add-project', (req, res) => {
    const { title, client_id } = req.body;
    db.run("INSERT INTO projects (client_id, title, status, progress, notes) VALUES (?, ?, 'تحت التنفيذ', 0, '')", [client_id, title], () => {
        res.json({ success: true });
    });
});

app.get('/projects', (req, res) => {
    const { userId, role } = req.query;
    let sql = (role === 'admin') ? "SELECT * FROM projects" : "SELECT * FROM projects WHERE client_id = ?";
    db.all(sql, (role === 'admin' ? [] : [userId]), (err, rows) => res.json(rows));
});

app.post('/update', upload.single('photo'), (req, res) => {
    const { id, status, progress, notes } = req.body;
    const imgPath = req.file ? '/uploads/' + req.file.filename : null;
    let sql = imgPath ? "UPDATE projects SET status=?, progress=?, notes=?, img=? WHERE id=?" : "UPDATE projects SET status=?, progress=?, notes=? WHERE id=?";
    let params = imgPath ? [status, progress, notes, imgPath, id] : [status, progress, notes, id];
    db.run(sql, params, () => res.json({ success: true }));
});

app.listen(3000, () => console.log('🚀 Server ON: http://localhost:3000'));