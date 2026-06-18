<?php
/**
 * Tests unitaires pour la gestion des types d'événements :
 * - Add_type_evenement.php
 * - Edit_Type_Event.php
 * - delete_type_evenent.php
 */

use PHPUnit\Framework\TestCase;

class EventTypeTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->exec("
            CREATE TABLE dolibarr_event_types (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                code     TEXT NOT NULL UNIQUE,
                libelle  TEXT NOT NULL,
                color    TEXT DEFAULT '#3498db',
                fk_user  INTEGER,
                position INTEGER DEFAULT 0,
                source   TEXT DEFAULT 'local',
                active   INTEGER DEFAULT 1
            )
        ");

        // Un type de base pour les tests de modification et suppression
        $this->pdo->exec("
            INSERT INTO dolibarr_event_types (code, libelle, color, fk_user, position)
            VALUES ('RDV_TECH', 'Rendez-vous technique', '#3498db', 1, 10)
        ");
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Logique extraite de Add_type_evenement.php
    // ══════════════════════════════════════════════════════════════════════════

    private function addEventType(PDO $conn, array $data): array
    {
        if (empty($data['code']) || empty($data['libelle']) || empty($data['fk_user'])) {
            return ['success' => false, 'error' => 'Données incomplètes : code, libelle ou fk_user manquant.'];
        }

        $rawColor = !empty($data['color']) ? $data['color'] : '#3498db';
        $color    = '#' . ltrim($rawColor, '#');

        try {
            $stmt = $conn->prepare("
                INSERT INTO dolibarr_event_types (code, libelle, color, fk_user, position, source)
                VALUES (:code, :libelle, :color, :fk_user, :position, 'local')
                ON CONFLICT(code) DO UPDATE SET
                    libelle  = excluded.libelle,
                    color    = excluded.color,
                    position = excluded.position,
                    fk_user  = excluded.fk_user
            ");
            $stmt->execute([
                ':code'     => strtoupper($data['code']),
                ':libelle'  => $data['libelle'],
                ':color'    => $color,
                ':fk_user'  => $data['fk_user'],
                ':position' => (int)($data['position'] ?? 0),
            ]);

            return ['success' => true, 'message' => "Type d'événement enregistré."];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Logique extraite de Edit_Type_Event.php
    // ══════════════════════════════════════════════════════════════════════════

    private function editEventType(PDO $conn, array $data): array
    {
        if (empty($data['code'])) {
            return ['success' => false, 'error' => 'Données incomplètes (code manquant).'];
        }

        $rawColor   = !empty($data['color']) ? $data['color'] : '#3498db';
        $cleanColor = '#' . ltrim($rawColor, '#');

        try {
            $stmt = $conn->prepare("
                UPDATE dolibarr_event_types
                SET libelle  = :libelle,
                    color    = :color,
                    position = :position
                WHERE code   = :code
            ");
            $stmt->execute([
                ':libelle'  => $data['libelle'],
                ':color'    => $cleanColor,
                ':position' => isset($data['position']) ? (int)$data['position'] : 0,
                ':code'     => $data['code'],
            ]);

            return ['success' => true];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Logique extraite de delete_type_evenent.php
    // ══════════════════════════════════════════════════════════════════════════

    private function deleteEventType(PDO $conn, array $data): array
    {
        if (empty($data['code'])) {
            return ['success' => false, 'error' => "Code d'événement manquant."];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM dolibarr_event_types WHERE code = :code");
            $stmt->execute([':code' => $data['code']]);
            return ['success' => true, 'message' => "Type d'événement supprimé avec succès."];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TESTS — Ajout
    // ══════════════════════════════════════════════════════════════════════════

    public function test_ajout_type_evenement_valide(): void
    {
        $result = $this->addEventType($this->pdo, [
            'code'     => 'email_client',
            'libelle'  => 'Email client',
            'color'    => '#16a34a',
            'fk_user'  => 2,
            'position' => 20,
        ]);

        $this->assertTrue($result['success']);
    }

    public function test_code_converti_en_majuscules(): void
    {
        $this->addEventType($this->pdo, [
            'code'    => 'rdv_commercial',
            'libelle' => 'RDV Commercial',
            'fk_user' => 1,
        ]);

        $row = $this->pdo->query("SELECT code FROM dolibarr_event_types WHERE code = 'RDV_COMMERCIAL'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('RDV_COMMERCIAL', $row['code']);
    }

    public function test_couleur_prefixee_par_diese(): void
    {
        $this->addEventType($this->pdo, [
            'code'    => 'COULEUR_TEST',
            'libelle' => 'Test couleur',
            'color'   => 'e74c3c', // sans '#'
            'fk_user' => 1,
        ]);

        $row = $this->pdo->query("SELECT color FROM dolibarr_event_types WHERE code = 'COULEUR_TEST'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('#e74c3c', $row['color']);
    }

    public function test_couleur_par_defaut_si_absente(): void
    {
        $this->addEventType($this->pdo, [
            'code'    => 'SANS_COULEUR',
            'libelle' => 'Sans couleur',
            'fk_user' => 1,
            // pas de 'color'
        ]);

        $row = $this->pdo->query("SELECT color FROM dolibarr_event_types WHERE code = 'SANS_COULEUR'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('#3498db', $row['color']);
    }

    public function test_ajout_echoue_si_code_manquant(): void
    {
        $result = $this->addEventType($this->pdo, [
            'libelle' => 'Sans code',
            'fk_user' => 1,
        ]);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('code', strtolower($result['error']));
    }

    public function test_ajout_echoue_si_fk_user_manquant(): void
    {
        $result = $this->addEventType($this->pdo, [
            'code'    => 'RDV_TEST',
            'libelle' => 'Rendez-vous test',
            // pas de fk_user
        ]);

        $this->assertFalse($result['success']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TESTS — Modification
    // ══════════════════════════════════════════════════════════════════════════

    public function test_modification_libelle(): void
    {
        $this->editEventType($this->pdo, [
            'code'     => 'RDV_TECH',
            'libelle'  => 'Nouveau libellé',
            'color'    => '#3498db',
            'position' => 10,
        ]);

        $row = $this->pdo->query("SELECT libelle FROM dolibarr_event_types WHERE code = 'RDV_TECH'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('Nouveau libellé', $row['libelle']);
    }

    public function test_modification_couleur_corrige_le_diese(): void
    {
        $this->editEventType($this->pdo, [
            'code'     => 'RDV_TECH',
            'libelle'  => 'Rendez-vous technique',
            'color'    => 'ff0000', // sans '#'
            'position' => 10,
        ]);

        $row = $this->pdo->query("SELECT color FROM dolibarr_event_types WHERE code = 'RDV_TECH'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('#ff0000', $row['color']);
    }

    public function test_modification_echoue_si_code_manquant(): void
    {
        $result = $this->editEventType($this->pdo, [
            'libelle' => 'Sans code',
        ]);

        $this->assertFalse($result['success']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TESTS — Suppression
    // ══════════════════════════════════════════════════════════════════════════

    public function test_suppression_type_existant(): void
    {
        $result = $this->deleteEventType($this->pdo, ['code' => 'RDV_TECH']);

        $this->assertTrue($result['success']);

        $count = $this->pdo->query("SELECT COUNT(*) FROM dolibarr_event_types WHERE code = 'RDV_TECH'")
                           ->fetchColumn();
        $this->assertEquals(0, $count);
    }

    public function test_suppression_echoue_si_code_manquant(): void
    {
        $result = $this->deleteEventType($this->pdo, []);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('code', strtolower($result['error']));
    }

    public function test_suppression_silencieuse_si_code_inexistant(): void
    {
        // Supprimer un code qui n'existe pas — pas d'exception attendue
        $result = $this->deleteEventType($this->pdo, ['code' => 'CODE_FANTOME']);

        $this->assertTrue($result['success']);
    }
}