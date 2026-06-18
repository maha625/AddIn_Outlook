<?php
/**
 * Tests unitaires pour updateClient.php
 * Teste la mise à jour d'un client et de ses boutons Outlook.
 */

use PHPUnit\Framework\TestCase;

class UpdateClientTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->exec("
            CREATE TABLE clients (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                site_number      TEXT,
                email            TEXT,
                domain           TEXT,
                dolibarr_url     TEXT,
                dolibarr_api_key TEXT,
                username         TEXT,
                logo             TEXT,
                palette_id       TEXT DEFAULT 'default'
            )
        ");

        $this->pdo->exec("
            CREATE TABLE client_buttons (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id           INTEGER NOT NULL,
                label               TEXT,
                bg_color            TEXT,
                text_color          TEXT,
                icon                TEXT,
                dolibarr_type_code  TEXT,
                allow_linked_events INTEGER DEFAULT 0
            )
        ");

        // Un client existant avec un bouton
        $this->pdo->exec("
            INSERT INTO clients (site_number, email, domain, dolibarr_url, dolibarr_api_key, username, logo, palette_id)
            VALUES ('S001', 'admin@exemple.com', 'exemple.com', 'https://dolibarr.exemple.com', 'cle123', 'admin', '', 'default')
        ");
        $this->pdo->exec("
            INSERT INTO client_buttons (client_id, label, bg_color, text_color, icon)
            VALUES (1, 'Ancien Bouton', '#ff0000', '#ffffff', 'tag.svg')
        ");
    }

    // ── Fonction extraite de updateClient.php ────────────────────────────────

    private function updateClient(PDO $conn, array $data): array
    {
        if (!isset($data['id']) || empty($data['id'])) {
            return ['success' => false, 'error' => 'ID client manquant'];
        }

        $id = (int) $data['id'];

        try {
            $conn->beginTransaction();

            $stmt = $conn->prepare("
                UPDATE clients SET
                    email = ?, domain = ?, site_number = ?, dolibarr_url = ?,
                    dolibarr_api_key = ?, username = ?, logo = ?, palette_id = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['email']            ?? '',
                $data['domain']           ?? '',
                $data['site_number']      ?? '',
                $data['dolibarr_url']     ?? '',
                $data['dolibarr_api_key'] ?? '',
                $data['username']         ?? '',
                $data['logo']             ?? '',
                $data['palette_id']       ?? 'default',
                $id,
            ]);

            // Supprimer les anciens boutons
            $conn->prepare("DELETE FROM client_buttons WHERE client_id = ?")->execute([$id]);

            // Insérer les nouveaux
            if (!empty($data['buttons']) && is_array($data['buttons'])) {
                $placeholders = implode(', ', array_fill(0, count($data['buttons']), "(?, ?, ?, ?, ?, ?, ?)"));
                $sql = "INSERT INTO client_buttons (client_id, label, bg_color, text_color, icon, dolibarr_type_code, allow_linked_events) VALUES $placeholders";
                $values = [];
                foreach ($data['buttons'] as $btn) {
                    $values[] = $id;
                    $values[] = $btn['label']               ?? 'Bouton';
                    $values[] = $btn['bg_color']            ?? '#2563eb';
                    $values[] = $btn['text_color']          ?? '#ffffff';
                    $values[] = $btn['icon']                ?? 'tag.svg';
                    $values[] = !empty($btn['dolibarr_type_code']) ? $btn['dolibarr_type_code'] : null;
                    $values[] = !empty($btn['allow_linked_events']) ? 1 : 0;
                }
                $conn->prepare($sql)->execute($values);
            }

            $conn->commit();
            return ['success' => true, 'message' => 'Mise à jour réussie'];

        } catch (\Exception $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_mise_a_jour_reussie(): void
    {
        $result = $this->updateClient($this->pdo, [
            'id'               => 1,
            'email'            => 'nouveau@exemple.com',
            'domain'           => 'exemple.com',
            'site_number'      => 'S001-UPDATED',
            'dolibarr_url'     => 'https://dolibarr.exemple.com',
            'dolibarr_api_key' => 'nouvelle_cle',
            'username'         => 'admin',
            'logo'             => '',
            'palette_id'       => 'blue',
            'buttons'          => [],
        ]);

        $this->assertTrue($result['success']);
    }

    public function test_champs_client_mis_a_jour_en_base(): void
    {
        $this->updateClient($this->pdo, [
            'id'               => 1,
            'email'            => 'modifie@exemple.com',
            'domain'           => 'exemple.com',
            'site_number'      => 'S999',
            'dolibarr_url'     => 'https://new.dolibarr.com',
            'dolibarr_api_key' => 'cle_modifiee',
            'username'         => 'nouveau_admin',
            'logo'             => '',
            'palette_id'       => 'green',
            'buttons'          => [],
        ]);

        $row = $this->pdo->query("SELECT * FROM clients WHERE id = 1")->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('modifie@exemple.com', $row['email']);
        $this->assertEquals('S999',               $row['site_number']);
        $this->assertEquals('green',              $row['palette_id']);
    }

    public function test_anciens_boutons_supprimes_lors_de_la_mise_a_jour(): void
    {
        // L'ancien bouton est en base, la mise à jour n'en envoie aucun
        $this->updateClient($this->pdo, [
            'id'          => 1,
            'email'       => 'admin@exemple.com',
            'domain'      => 'exemple.com',
            'site_number' => 'S001',
            'dolibarr_url'     => 'https://dolibarr.exemple.com',
            'dolibarr_api_key' => 'cle123',
            'username'    => 'admin',
            'logo'        => '',
            'palette_id'  => 'default',
            'buttons'     => [], // ← aucun bouton
        ]);

        $count = $this->pdo->query("SELECT COUNT(*) FROM client_buttons WHERE client_id = 1")->fetchColumn();
        $this->assertEquals(0, $count, "Les anciens boutons doivent être supprimés");
    }

    public function test_nouveaux_boutons_inseres(): void
    {
        $this->updateClient($this->pdo, [
            'id'          => 1,
            'email'       => 'admin@exemple.com',
            'domain'      => 'exemple.com',
            'site_number' => 'S001',
            'dolibarr_url'     => 'https://dolibarr.exemple.com',
            'dolibarr_api_key' => 'cle123',
            'username'    => 'admin',
            'logo'        => '',
            'palette_id'  => 'default',
            'buttons'     => [
                ['label' => 'Appeler',  'bg_color' => '#2563eb', 'text_color' => '#fff', 'icon' => 'telephone.svg', 'dolibarr_type_code' => 'CALL', 'allow_linked_events' => 0],
                ['label' => 'Archiver', 'bg_color' => '#16a34a', 'text_color' => '#fff', 'icon' => 'star.svg',      'dolibarr_type_code' => null,   'allow_linked_events' => 1],
            ],
        ]);

        $count = $this->pdo->query("SELECT COUNT(*) FROM client_buttons WHERE client_id = 1")->fetchColumn();
        $this->assertEquals(2, $count, "2 nouveaux boutons doivent être insérés");
    }

    public function test_allow_linked_events_correctement_converti(): void
    {
        $this->updateClient($this->pdo, [
            'id'          => 1,
            'email'       => 'admin@exemple.com',
            'domain'      => 'exemple.com',
            'site_number' => 'S001',
            'dolibarr_url'     => 'https://dolibarr.exemple.com',
            'dolibarr_api_key' => 'cle123',
            'username'    => 'admin',
            'logo'        => '',
            'palette_id'  => 'default',
            'buttons'     => [
                ['label' => 'Bouton', 'bg_color' => '#000', 'text_color' => '#fff', 'icon' => 'tag.svg', 'dolibarr_type_code' => null, 'allow_linked_events' => true],
            ],
        ]);

        $row = $this->pdo->query("SELECT allow_linked_events FROM client_buttons WHERE client_id = 1")->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals(1, (int) $row['allow_linked_events']);
    }

    public function test_retourne_erreur_si_id_manquant(): void
    {
        $result = $this->updateClient($this->pdo, ['email' => 'test@test.com']); // pas d'id

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('ID', $result['error']);
    }
}