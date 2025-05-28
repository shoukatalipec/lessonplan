<?php
header('Content-Type: application/json');
require_once __DIR__ . '/functions.php';

$pdo = getDbConnection();
initializeDatabase($pdo);
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getClasses':
        try {
            $stmt = $pdo->query('SELECT DISTINCT class FROM class_sub_tea');
            $classes = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            echo json_encode($classes);
        } catch (PDOException $e) {
            error_log("Error fetching classes: " . $e->getMessage());
            echo json_encode(['error' => 'Could not fetch classes.']);
        }
        break;

    case 'getSubjects':
        $selectedClass = $_GET['class'] ?? '';
        if (empty($selectedClass)) {
            echo json_encode(['error' => 'Class parameter is missing.']);
            break;
        }
        try {
            $stmt = $pdo->prepare('SELECT DISTINCT subject FROM class_sub_tea WHERE class = ? ORDER BY subject');
            $stmt->execute([$selectedClass]);
            $subjects = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            echo json_encode(['subjects' => $subjects]);
        } catch (PDOException $e) {
            error_log("Error fetching subjects for class '{$selectedClass}': " . $e->getMessage());
            echo json_encode(['error' => 'Could not fetch subjects.']);
        }
        break;

    case 'getTeacher':
        $selectedClass = $_GET['class'] ?? '';
        $selectedSubject = $_GET['subject'] ?? '';
        if (empty($selectedClass) || empty($selectedSubject)) {
            echo json_encode(['error' => 'Class or subject parameter is missing.']);
            break;
        }
        try {
            $stmt = $pdo->prepare('SELECT teacher FROM class_sub_tea WHERE class = ? AND subject = ? LIMIT 1');
            $stmt->execute([$selectedClass, $selectedSubject]);
            $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['teacher' => $teacher ? $teacher['teacher'] : null]);
        } catch (PDOException $e) {
            error_log("Error fetching teacher for class '{$selectedClass}', subject '{$selectedSubject}': " . $e->getMessage());
            echo json_encode(['error' => 'Could not fetch teacher.']);
        }
        break;

    case 'getLessonPlan':
        $selectedClass = $_GET['class'] ?? '';
        if (empty($selectedClass)) {
            echo json_encode(['error' => 'Class parameter is missing.']);
            break;
        }
        try {
            // Select all relevant columns from the 'timetable' table for the given class, including 'subjects' and 'teachers'
            $stmt = $pdo->prepare('SELECT period, day1, day2, day3, day4, day5, subjects, teachers FROM timetable WHERE class = ? ORDER BY period ASC');
            $stmt->execute([$selectedClass]);
            $lessonPlanData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($lessonPlanData);
        } catch (PDOException $e) {
            error_log("Error fetching lesson plan for class '{$selectedClass}': " . $e->getMessage());
            echo json_encode(['error' => 'Could not fetch lesson plan data.']);
        }
        break;

    case 'saveLessonPlan':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || strpos($_SERVER['CONTENT_TYPE'], 'application/json') === false) {
            echo json_encode(['success' => false, 'error' => 'Invalid request method or content type.']);
            exit();
        }
        $input = file_get_contents('php://input');
        $lessonPlanData = json_decode($input, true);
        if (!is_array($lessonPlanData) || empty($lessonPlanData)) {
            echo json_encode(['success' => false, 'error' => 'Invalid or empty data format. Expected JSON array of lesson plan rows.']);
            exit();
        }

        try {
            $pdo->beginTransaction();

            // Extract class from the first item of the received data
            $classToUpdate = $lessonPlanData[0]['class'] ?? null;

            if (empty($classToUpdate)) {
                throw new Exception("Class information missing in the submitted data.");
            }

            // Delete all existing entries for this class in the 'timetable' table
            $deleteStmt = $pdo->prepare("DELETE FROM timetable WHERE class = ?");
            $deleteStmt->execute([$classToUpdate]);

            // Prepare an INSERT statement for the 'timetable' table, using 'subjects' and 'teachers' columns
            $insertStmt = $pdo->prepare("
                INSERT INTO timetable (class, period, subjects, day1, day2, day3, day4, day5,  teachers)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($lessonPlanData as $item) {
                $class = $item['class'] ?? null;
                $period = $item['period'] ?? null;
                $day1 = $item['day1'] ?? null;
                $day2 = $item['day2'] ?? null;
                $day3 = $item['day3'] ?? null;
                $day4 = $item['day4'] ?? null;
                $day5 = $item['day5'] ?? null;
                // Get 'subjects' and 'teachers' from the frontend's 'main_subject' and 'main_teacher' properties
                $subjects = $item['subjects'] ?? null;
                $teachers = $item['teachers'] ?? null;

                if ($class && $period) {
                    $insertStmt->execute([$class, $period, $subjects, $day1, $day2, $day3, $day4, $day5, $teachers]);
                } else {
                    error_log("Skipping invalid timetable item: " . json_encode($item));
                }
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Timetable saved successfully.']);

        } catch (PDOException $e) {
            $pdo->rollBack();
            error_log("Error saving timetable: " . $e->getMessage());
            echo json_encode(['success' => false, 'error' => 'Database error during save: ' . $e->getMessage()]);
        } catch (Exception $e) {
            $pdo->rollBack();
            error_log("Application error during save: " . $e->getMessage());
            echo json_encode(['success' => false, 'error' => 'An application error occurred: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['error' => 'Invalid action.']);
        break;
}
$pdo = null;
?>
