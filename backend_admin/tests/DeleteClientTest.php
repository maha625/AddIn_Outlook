<?php
/**
 * Tests unitaires pour deleteClient.php
 */

use PHPUnit\Framework\TestCase;

class DeleteClientTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->exec("
            CREATE TABLE clients (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                site_number TEXT NOT NULL,
                email       TEXT NOT NULL,
                domain      TEXT NOT NULL
            )
        ");

        // Insérer deux clients de test
        $this->pdo->exec("INSERT INTO clients (site_number, email, domain) VALUES ('S001', 'a@test.com', 'test.com')");
        $this->pdo->exec("INSERT INTO clients (site_number, email, domain) VALUES ('S002', 'b@autre.com', 'autre.com')");
    }

    // ── Fonction extraite de deleteClient.php ────────────────────────────────

    private function deleteClient(PDO $conn, ?int $id): array
    {
        if (!$id) {
            return ['success' => false, 'error' => 'ID manquant'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM clients WHERE id = ?");
            $stmt->execute([$id]);
            return ['success' => true];
        } catch (\PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_supprime_un_client_existant(): void
    {
        $result = $this->deleteClient($this->pdo, 1);

        $this->assertTrue($result['success']);

        $count = $this->pdo->query("SELECT COUNT(*) FROM clients WHERE id = 1")->fetchColumn();
        $this->assertEquals(0, $count, "Le client #1 doit avoir été supprimé");
    }

    public function test_ne_supprime_pas_les_autres_clients(): void
    {
        $this->deleteClient($this->pdo, 1);

        $count = $this->pdo->query("SELECT COUNT(*) FROM clients WHERE id = 2")->fetchColumn();
        $this->assertEquals(1, $count, "Le client #2 ne doit pas être touché");
    }

    public function test_retourne_succes_meme_si_id_inexistant(): void
    {
        // DELETE sur un ID inexistant ne lève pas d'exception en SQL — c'est un succès silencieux
        $result = $this->deleteClient($this->pdo, 9999);

        $this->assertTrue($result['success']);
    }

    public function test_retourne_erreur_si_id_null(): void
    {
        $result = $this->deleteClient($this->pdo, null);

        $this->assertFalse($result['success']);
        $this->assertArrayHasKey('error', $result);
    }

    public function test_nombre_de_clients_diminue_apres_suppression(): void
    {
        $avant = (int) $this->pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn();
        $this->deleteClient($this->pdo, 1);
        $apres = (int) $this->pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn();

        $this->assertEquals($avant - 1, $apres);
    }
}