<?php
require_once __DIR__ . '/config.php';

function getDbConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection error: " . $e->getMessage());
        echo json_encode(['error' => 'Database connection failed. Please check server logs and MySQL credentials.']);
        exit();
    }
}

function initializeDatabase($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS class_sub_tea (srno INT AUTO_INCREMENT PRIMARY KEY, class VARCHAR(255) NOT NULL, subject VARCHAR(255) NOT NULL, teacher VARCHAR(255) NOT NULL, UNIQUE(class, subject))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS weekly_lesson_plans (id INT AUTO_INCREMENT PRIMARY KEY, class VARCHAR(255) NOT NULL, period INT NOT NULL, day_name VARCHAR(10) NOT NULL, subject VARCHAR(255), teacher VARCHAR(255), UNIQUE(class, period, day_name))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS lessons (srno INT AUTO_INCREMENT PRIMARY KEY, week INT NOT NULL, class VARCHAR(255) NOT NULL, period INT NOT NULL, day1 VARCHAR(255), day2 VARCHAR(255), day3 VARCHAR(255), day4 VARCHAR(255), day5 VARCHAR(255), UNIQUE(week, class, period))");

    $stmt = $pdo->query("SELECT * FROM class_sub_tea");
    if ($stmt->fetchColumn() == 0) {
        $sample_data_class_sub_tea = [
            ['10th Grade', 'Math', 'Mr. Smith'], ['10th Grade', 'Science', 'Ms. Curie'],
            ['9th Grade', 'History', 'Mr. Jones'], ['9th Grade', 'English', 'Ms. Adams'],
            ['11th Grade', 'Physics', 'Dr. Tesla'], ['11th Grade', 'Chemistry', 'Dr. Franklin'],
        ];
        $stmt = $pdo->prepare("INSERT IGNORE INTO class_sub_tea (class, subject, teacher) VALUES (?, ?, ?)");
        foreach ($sample_data_class_sub_tea as $row) { $stmt->execute($row); }
    }

    $stmt = $pdo->prepare("SELECT * FROM lessons WHERE week = 8");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $sample_data_lessons = [
            [8, '10th Grade', 1, 'Math', 'Math', 'Science', 'Math', 'Math'],
            [8, '10th Grade', 2, 'Science', 'Science', 'Math', 'Science', 'Science'],
            [8, '10th Grade', 3, 'Math', 'Science', 'Math', 'Math', 'Science'],
            [8, '10th Grade', 4, 'Science', 'Math', 'Science', 'Science', 'Math'],
            [8, '10th Grade', 5, 'Math', 'Math', 'Math', 'Math', 'Math'],
            [8, '10th Grade', 6, 'Science', 'Science', 'Science', 'Science', 'Science'],
            [8, '10th Grade', 7, 'Math', 'Math', 'Science', 'Math', 'Math'],
            [8, '10th Grade', 8, 'Science', 'Science', 'Math', 'Science', 'Science'],
            [8, '9th Grade', 1, 'History', 'English', 'History', 'English', 'History'],
            [8, '9th Grade', 2, 'English', 'History', 'English', 'History', 'English'],
        ];
        $stmt = $pdo->prepare("INSERT IGNORE INTO lessons (week, class, period, day1, day2, day3, day4, day5) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($sample_data_lessons as $row) { $stmt->execute($row); }
    }
}
?>