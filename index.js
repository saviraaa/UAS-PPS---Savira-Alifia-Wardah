// Inisialisasi load library express, mysql & util
const express = require("express");
const mysql = require("mysql2");
const util = require('util');
const app = express();
const port = 5000;

app.use(express.json());

// Inisialisi koneksi ke database MySQL dengan host: localhost, username: root, password: , database: tugas-uas
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "tugas-uas",
});

// Koneksi ke MYSQL
db.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
    } else {
        console.log("Connected to MySQL");
    }
});

// Metode GET
// Menampilkan seluruh bank soal
app.get("/soal", (req, res) => {
    db.query("SELECT * FROM bank_soal WHERE status_soal = 1", (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({
                "error": true,
                "message": "Internal Server Error",
                "data": []
            });
        } else {
            res.json({
                "error": false,
                "message": "",
                "data": results
            });
        }
    });
});

// Menampilkan bank soal by ID
app.get("/soal/:id", (req, res) => {
    const id = req.params.id
    db.query("SELECT * FROM bank_soal WHERE id = ? AND status_soal = 1", [id], (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({
                "error": true,
                "message": "Internal Server Error",
                "data": []
            });
        } else {
            res.json({
                "error": false,
                "message": "",
                "data": results
            });
        }
    });
});

// Menampilkan seluruh data peserta
app.get("/peserta", (req, res) => {
    db.query("SELECT * FROM peserta", (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({
                "error": true,
                "message": "Internal Server Error",
                "data": []
            });
        } else {
            res.json({
                "error": false,
                "message": "",
                "data": results
            });
        }
    });
});

// Menampilkan seluruh data peserta by ID
app.get("/peserta/:id", (req, res) => {
    const id = req.params.id
    db.query("SELECT * FROM peserta WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({
                "error": true,
                "message": "Internal Server Error",
                "data": []
            });
        } else {
            res.json({
                "error": false,
                "message": "",
                "data": results
            });
        }
    });
});

// Metode POST
// Menyimpan data soal yang baru kedalam database
// tipe_soal ada 3 value
// 1. Mudah (tipe_soal == 1)
// 2. Sedang (tipe_soal == 2)
// 3. Sulit (tipe_soal == 3)
app.post("/soal", (req, res) => {
    const { pertanyaan, pilihan_1, pilihan_2, pilihan_3, pilihan_4, pilihan_5, kunci_jawaban, gambar, tipe_soal } = req.body;
    db.query(
        "INSERT INTO bank_soal (pertanyaan, pilihan_1, pilihan_2, pilihan_3, pilihan_4, pilihan_5, kunci_jawaban, gambar, tipe_soal, status_soal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [pertanyaan, pilihan_1, pilihan_2, pilihan_3, pilihan_4, pilihan_5, kunci_jawaban, gambar, tipe_soal, 1],
        (err, result) => {
            if (err) {
                console.error("Error executing query:", err);
                res.status(500).send({
                    "error": true,
                    "message": "Internal Server Error"
                });
            } else {
                res.status(200).send({
                    "error": false,
                    "message": "Soal has been successfully created"
                });
            }
        }
    );
});

// Menyimpan data peserta kedalam database dan menampilkan response soal
app.post("/mulai-tes", async (req, res) => {
    // Rumus:
    // Seluruh Soal = 100% = 30 Soal
    // Mudah = 50% = 15 Soal
    // Sedang = 35% = 10 Soal
    // Sulit = 15% = 5 Soal

    const { name, email, phone_number, opsi_soal } = req.body;
    db.query(
        "INSERT INTO peserta (name, email, phone_number, opsi_soal, hasil_nilai) VALUES (?, ?, ?, ?, ?)",
        [name, email, phone_number, opsi_soal, 0],
        async (err, result) => {
            if (err) {
                console.error("Error executing query:", err);
                res.status(500).send({
                    "error": true,
                    "message": "Internal Server Error",
                    "data": []
                });
            } else {
                const queryAsync = util.promisify(db.query).bind(db);
                const getBankSoal = async (opsi_soal) => {
                    try {
                        let results = []
                        let totalSoal = 30
                        let soalMudah = parseInt(totalSoal / 100 * 50) // 15
                        let soalSedang = parseInt(totalSoal / 100 * 35) // 10
                        let soalSulit = totalSoal - (soalMudah + soalSedang) // 5
                        if (opsi_soal == 4) {
                            results = await queryAsync(`
                                (SELECT * FROM bank_soal WHERE status_soal = 1 AND tipe_soal = 1 ORDER BY RAND() LIMIT ?)
                                UNION ALL
                                (SELECT * FROM bank_soal WHERE status_soal = 1 AND tipe_soal = 2 ORDER BY RAND() LIMIT ?)
                                UNION ALL
                                (SELECT * FROM bank_soal WHERE status_soal = 1 AND tipe_soal = 3 ORDER BY RAND() LIMIT ?);
                            `, [soalMudah, soalSedang, soalSulit]);
                        } else {
                            let limit = 0
                            if (opsi_soal == 1) {
                                limit = soalMudah
                            } else if (opsi_soal == 2) {
                                limit = soalSedang
                            } else if (opsi_soal == 3) {
                                limit = soalSulit
                            }
                            results = await queryAsync("SELECT * FROM bank_soal WHERE tipe_soal = ? AND status_soal = 1 ORDER BY RAND() LIMIT ?", [opsi_soal, limit]);
                        }

                        return {
                            "error": false,
                            "message": "",
                            "data": results
                        };
                    } catch (err) {
                        console.error("Error executing query:", err);
                        return {
                            "error": true,
                            "message": "Internal Server Error",
                            "data": []
                        };
                    }
                };

                const daftarSoal = await getBankSoal(opsi_soal);
                if (daftarSoal.error === true) {
                    res.status(500).send({
                        "error": true,
                        "message": daftarSoal.message,
                        "data": []
                    });

                } else {
                    res.status(200).send({
                        "error": false,
                        "message": "Selamat Mengerjakan",
                        "data": daftarSoal.data
                    });
                }
            }
        }
    );
});

// Menyelesaikan tes dan memberikan hasil nilai berdasarkan mencocokkan antara jawaban dari peserta & kunci jawaban yang ada
app.post("/selesaikan-tes", async (req, res) => {
    const { name, email, phone_number, answers } = req.body;
    const queryAsync = util.promisify(db.query).bind(db);

    let userInfo = await queryAsync(`SELECT * FROM peserta WHERE email = ? ORDER BY id DESC`, [email]);
    if (userInfo.length > 0) {
        let id_user = userInfo[0].id
        let jawaban_benar = []
        for (let i = 0; i < answers.length; i++) {
            const item = answers[i];
            if (item.jawaban == item.kunci_jawaban) {
                jawaban_benar.push(true)
            }
            await queryAsync(
                "INSERT INTO jawaban_peserta (id_user, id_soal, jawaban, kunci_jawaban) VALUES (?, ?, ?, ?)",
                [id_user, item.id_soal, item.jawaban, item.kunci_jawaban]
            );
        }

        let nilai = 0
        if (jawaban_benar.length > 0) {
            nilai = jawaban_benar.length / answers.length * 100
        }
        if (nilai < 100) {
            nilai = nilai.toFixed(2)
        }

        db.query(
            "UPDATE peserta SET hasil_nilai = ? WHERE id = ?",
            [nilai, id_user],
            (err, result) => {
                if (err) {
                    console.error("Error executing query:", err);
                    res.status(500).send({
                        "error": true,
                        "message": "Internal Server Error",
                        "name": name,
                        "email": email,
                        "phone_number": phone_number,
                        "nilai": 0
                    });
                } else {
                    res.status(200).send({
                        "error": false,
                        "message": "This is your result",
                        "name": name,
                        "email": email,
                        "phone_number": phone_number,
                        "nilai": nilai
                    });
                }
            }
        );

    } else {
        res.status(500).send({
            "error": true,
            "message": "User Not Found or Internal Server Error",
            "name": name,
            "email": email,
            "phone_number": phone_number,
            "nilai": 0
        });
    }
});

// Metode PUT
// Memperbarui data soal by ID kedalam database
// tipe_soal ada 3 value
// 1. Mudah (tipe_soal == 1)
// 2. Sedang (tipe_soal == 2)
// 3. Sulit (tipe_soal == 3)
app.put("/soal/:id", (req, res) => {
    const id = req.params.id;
    const { pertanyaan, pilihan_1, pilihan_2, pilihan_3, pilihan_4, pilihan_5, kunci_jawaban, gambar, tipe_soal } = req.body;
    db.query(
        "UPDATE bank_soal SET pertanyaan = ?, pilihan_1 = ?, pilihan_2 = ?, pilihan_3 = ?, pilihan_4 = ?, pilihan_5 = ?, kunci_jawaban = ?, gambar = ?, tipe_soal = ? WHERE id = ?",
        [pertanyaan, pilihan_1, pilihan_2, pilihan_3, pilihan_4, pilihan_5, kunci_jawaban, gambar, tipe_soal, id],
        (err, result) => {
            if (err) {
                console.error("Error executing query:", err);
                res.status(500).send({
                    "error": true,
                    "message": "Internal Server Error"
                });
            } else {
                res.status(200).send({
                    "error": false,
                    "message": "Soal has been successfully updated"
                });
            }
        }
    );
});

// Memperbarui data peserta by ID kedalam database
app.put("/peserta/:id", (req, res) => {
    const id = req.params.id;
    const { name, email, phone_number } = req.body;
    db.query(
        "UPDATE peserta SET name = ?, email = ?, phone_number = ? WHERE id = ?",
        [name, email, phone_number, id],
        (err, result) => {
            if (err) {
                console.error("Error executing query:", err);
                res.status(500).send({
                    "error": true,
                    "message": "Internal Server Error"
                });
            } else {
                res.status(200).send({
                    "error": false,
                    "message": "Peserta has been successfully updated"
                });
            }
        }
    );
});

// Metode DELETE
// Menghapus data soal by ID menggunakan soft delete
app.delete("/soal/:id", (req, res) => {
    const id = req.params.id;
    db.query(
        "UPDATE bank_soal SET status_soal = ? WHERE id = ?",
        [0, id],
        (err, result) => {
            if (err) {
                console.error("Error executing query:", err);
                res.status(500).send({
                    "error": true,
                    "message": "Internal Server Error"
                });
            } else {
                res.status(200).send({
                    "error": false,
                    "message": "Soal has been successfully soft deleted"
                });
            }
        }
    );
});

// Menghapus data soal by ID menggunakan hard delete
app.delete("/delete-soal/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM bank_soal WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({
                "error": true,
                "message": "Internal Server Error"
            });
        } else {
            res.status(200).send({
                "error": false,
                "message": "Soal has been successfully deleted"
            });
        }
    });
});

// Menghapus data peserta by ID
app.delete("/peserta/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM peserta WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send({
                "error": true,
                "message": "Internal Server Error"
            });
        } else {
            res.status(200).send({
                "error": false,
                "message": "Peserta has been successfully deleted"
            });
        }
    });
});

// Check Running Server
app.listen(port, () => {
    console.log("Server is listening on port", port);
});
