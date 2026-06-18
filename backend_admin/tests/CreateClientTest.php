<?php
/**
 * Tests unitaires pour createClient.php
 * Teste la logique de création d'un client en base de données.
 */

use PHPUnit\Framework\TestCase;

class CreateClientTest extends TestCase
{
    private PDO $pdo;

    /**
     * Avant chaque test : on crée une base SQLite en mémoire
     * pour simuler la vraie base MySQL sans toucher au serveur.
     */
    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Création de la table clients (structure identique à la prod)
        $this->pdo->exec("
            CREATE TABLE clients (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                site_number     TEXT NOT NULL,
                email           TEXT NOT NULL,
                dolibarr_url    TEXT NOT NULL,
                username        TEXT NOT NULL,
                dolibarr_api_key TEXT NOT NULL,
                domain          TEXT NOT NULL,
                logo            TEXT,
                palette_id      TEXT DEFAULT 'default',
                created_at      TEXT DEFAULT (datetime('now'))
            )
        ");
    }

    // ── Fonction extraite de createClient.php pour être testable ─────────────

    /**
     * Insère un client dans la base et retourne son ID.
     * Copie fidèle de la logique de createClient.php.
     */
    private function insertClient(PDO $conn, array $data): int
    {
        $domain = !empty($data['domain'])
            ? $data['domain']
            : substr(strrchr($data['email'], '@'), 1);

        $stmt = $conn->prepare("
            INSERT INTO clients
            (site_number, email, dolibarr_url, username, dolibarr_api_key, domain, logo, palette_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['site_number'],
            $data['email'],
            $data['dolibarr_url'],
            $data['username'],
            $data['dolibarr_api_key'],
            $domain,
            $data['logo'] ?? '',
            $data['palette_id'] ?? 'default',
        ]);

        return (int) $conn->lastInsertId();
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_insere_client_et_retourne_un_id_valide(): void
    {
        $data = [
            'site_number'      => 'S001',
            'email'            => 'admin@exemple.com',
            'dolibarr_url'     => 'https://dolibarr.exemple.com',
            'username'         => 'admin_exemple',
            'dolibarr_api_key' => 'cle_api_123',
            'domain'           => 'exemple.com',
            'logo'             => 'https://logo.exemple.com/logo.png',
            'palette_id'       => 'default',
        ];

        $id = $this->insertClient($this->pdo, $data);

        $this->assertGreaterThan(0, $id, "L'ID retourné doit être supérieur à 0");
    }

    public function test_auto_extrait_le_domaine_depuis_email(): void
    {
        // On envoie un domain vide — le script doit l'extraire de l'email
        $data = [
            'site_number'      => 'S002',
            'email'            => 'contact@mon-entreprise.fr',
            'dolibarr_url'     => 'https://dolibarr.mon-entreprise.fr',
            'username'         => 'admin',
            'dolibarr_api_key' => 'cle123',
            'domain'           => '', // intentionnellement vide
            'logo'             => '',
        ];

        $this->insertClient($this->pdo, $data);

        $row = $this->pdo->query("SELECT domain FROM clients WHERE email = 'contact@mon-entreprise.fr'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('mon-entreprise.fr', $row['domain']);
    }

    public function test_palette_id_defaut_si_non_fourni(): void
    {
        $data = [
            'site_number'      => 'S003',
            'email'            => 'admin@test.com',
            'dolibarr_url'     => 'https://dolibarr.test.com',
            'username'         => 'admin_test',
            'dolibarr_api_key' => 'cle456',
            'domain'           => 'test.com',
            'logo'             => '',
            // palette_id absent → doit valoir 'default'
        ];

        $this->insertClient($this->pdo, $data);

        $row = $this->pdo->query("SELECT palette_id FROM clients WHERE domain = 'test.com'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('default', $row['palette_id']);
    }

    public function test_plusieurs_clients_ont_des_ids_distincts(): void
    {
        $base = [
            'dolibarr_url'     => 'https://dolibarr.test.com',
            'username'         => 'admin',
            'dolibarr_api_key' => 'cle',
            'logo'             => '',
        ];

        $id1 = $this->insertClient($this->pdo, array_merge($base, [
            'site_number' => 'S001',
            'email'       => 'a@client1.com',
            'domain'      => 'client1.com',
        ]));

        $id2 = $this->insertClient($this->pdo, array_merge($base, [
            'site_number' => 'S002',
            'email'       => 'b@client2.com',
            'domain'      => 'client2.com',
        ]));

        $this->assertNotEquals($id1, $id2, "Deux clients doivent avoir des IDs différents");
    }

    public function test_les_donnees_sont_bien_persistees(): void
    {
        $data = [
            'site_number'      => 'S099',
            'email'            => 'persist@test.org',
            'dolibarr_url'     => 'https://dolibarr.test.org',
            'username'         => 'user_persist',
            'dolibarr_api_key' => 'cle_persist',
            'domain'           => 'test.org',
            'logo'             => 'https://test.org/logo.png',
            'palette_id'       => 'blue',
        ];

        $id = $this->insertClient($this->pdo, $data);

        $row = $this->pdo->query("SELECT * FROM clients WHERE id = $id")->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('S099',              $row['site_number']);
        $this->assertEquals('persist@test.org',  $row['email']);
        $this->assertEquals('user_persist',       $row['username']);
        $this->assertEquals('blue',               $row['palette_id']);
    }
}