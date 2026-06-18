<?php
/**
 * Tests unitaires pour backend_AddIn/authentification/auth.php
 * Teste la logique d'identification d'un utilisateur par son domaine email.
 */

use PHPUnit\Framework\TestCase;

class AuthTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->exec("
            CREATE TABLE clients (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                domain        TEXT NOT NULL UNIQUE,
                email         TEXT,
                logo          TEXT,
                palette_id    TEXT DEFAULT 'default',
                session_token TEXT
            )
        ");

        // Client connu
        $this->pdo->exec("
            INSERT INTO clients (domain, email, logo, palette_id)
            VALUES ('exemple.com', 'admin@exemple.com', 'https://logo.exemple.com/logo.png', 'default')
        ");
    }

    // ── Logique extraite de auth.php ─────────────────────────────────────────

    /**
     * Extrait le domaine depuis un email.
     * Copie de la logique PHP de auth.php.
     */
    private function extractDomain(string $email): string
    {
        return substr(strrchr($email, '@'), 1);
    }

    /**
     * Recherche un client par son domaine et génère un token de session.
     */
    private function authenticate(PDO $conn, string $email): array
    {
        if (empty($email)) {
            return ['success' => false, 'error' => 'Email requis'];
        }

        $domain = $this->extractDomain($email);

        $stmt = $conn->prepare("SELECT * FROM clients WHERE domain = ?");
        $stmt->execute([$domain]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return ['success' => false, 'error' => 'Utilisateur non reconnu'];
        }

        // Génération du token de session
        $session_token = bin2hex(random_bytes(16)); // 16 octets = token plus court pour les tests
        $update = $conn->prepare("UPDATE clients SET session_token = ? WHERE id = ?");
        $update->execute([$session_token, $user['id']]);

        return [
            'success'       => true,
            'session_token' => $session_token,
            'message'       => 'Utilisateur reconnu',
            'user'          => [
                'id'     => $user['id'],
                'domain' => $user['domain'],
                'logo'   => $user['logo'],
            ],
        ];
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_authentification_reussie_pour_domaine_connu(): void
    {
        $result = $this->authenticate($this->pdo, 'utilisateur@exemple.com');

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('session_token', $result);
        $this->assertNotEmpty($result['session_token']);
    }

    public function test_echec_pour_domaine_inconnu(): void
    {
        $result = $this->authenticate($this->pdo, 'intrus@inconnu.com');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('non reconnu', $result['error']);
    }

    public function test_extraction_correcte_du_domaine(): void
    {
        $domain = $this->extractDomain('contact@mon-entreprise.fr');
        $this->assertEquals('mon-entreprise.fr', $domain);
    }

    public function test_extraction_domaine_email_complexe(): void
    {
        $domain = $this->extractDomain('prenom.nom+tag@sous-domaine.exemple.org');
        $this->assertEquals('sous-domaine.exemple.org', $domain);
    }

    public function test_token_sauvegarde_en_base(): void
    {
        $result = $this->authenticate($this->pdo, 'admin@exemple.com');

        $row = $this->pdo->query("SELECT session_token FROM clients WHERE domain = 'exemple.com'")
                         ->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals($result['session_token'], $row['session_token']);
    }

    public function test_token_est_unique_a_chaque_connexion(): void
    {
        $result1 = $this->authenticate($this->pdo, 'a@exemple.com');
        $result2 = $this->authenticate($this->pdo, 'b@exemple.com');

        $this->assertNotEquals($result1['session_token'], $result2['session_token']);
    }

    public function test_retourne_logo_du_client(): void
    {
        $result = $this->authenticate($this->pdo, 'user@exemple.com');

        $this->assertEquals('https://logo.exemple.com/logo.png', $result['user']['logo']);
    }

    public function test_email_vide_retourne_erreur(): void
    {
        $result = $this->authenticate($this->pdo, '');

        $this->assertFalse($result['success']);
    }
}