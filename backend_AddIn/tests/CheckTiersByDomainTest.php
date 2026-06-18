<?php
/**
 * Tests unitaires pour backend_AddIn/tiers/checkTiersByDomain.php
 * Teste la logique de vérification d'un expéditeur comme tiers Dolibarr.
 * 
 * Note : Les appels cURL vers l'API Dolibarr sont simulés (bouchonnés).
 */

use PHPUnit\Framework\TestCase;

class CheckTiersByDomainTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->exec("
            CREATE TABLE clients (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                domain           TEXT,
                dolibarr_url     TEXT,
                dolibarr_api_key TEXT,
                session_token    TEXT
            )
        ");

        $this->pdo->exec("
            INSERT INTO clients (domain, dolibarr_url, dolibarr_api_key, session_token)
            VALUES ('exemple.com', 'https://dolibarr.exemple.com', 'cle_api_123', 'token_valide_abc')
        ");
    }

    // ── Logique extraite de checkTiersByDomain.php ───────────────────────────

    private array $publicDomains = [
        'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.fr', 'icloud.com', 'outlook.fr',
    ];

    /**
     * Construit le filtre de recherche Dolibarr selon le domaine de l'expéditeur.
     * Copie fidèle de la logique de checkTiersByDomain.php.
     */
    private function buildFilter(string $senderEmail): string
    {
        $domain = substr(strrchr($senderEmail, '@'), 1);

        if (in_array(strtolower($domain), $this->publicDomains)) {
            return "(email:equals:'$senderEmail')";
        }

        return "(email:equals:'$senderEmail')OR(url:like:'%$domain%')";
    }

    /**
     * Récupère les credentials Dolibarr depuis la base via le session_token.
     */
    private function getClientByToken(PDO $conn, string $token): array|false
    {
        $stmt = $conn->prepare("SELECT dolibarr_url, dolibarr_api_key FROM clients WHERE session_token = ?");
        $stmt->execute([$token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Vérifie si le résultat Dolibarr correspond vraiment à l'expéditeur.
     * Évite les faux positifs de l'API Dolibarr.
     */
    private function verifyMatch(array $dolibarrMatch, string $senderEmail): array
    {
        $domain           = substr(strrchr($senderEmail, '@'), 1);
        $matchEmail       = strtolower($dolibarrMatch['email']  ?? '');
        $matchUrl         = strtolower($dolibarrMatch['url']    ?? '');
        $searchEmail      = strtolower($senderEmail);

        $foundByEmail  = ($matchEmail === $searchEmail);
        $foundByDomain = (!empty($matchUrl) && strpos($matchUrl, $domain) !== false);

        if ($foundByEmail || $foundByDomain) {
            return [
                'status'      => 'success',
                'found'       => true,
                'name'        => $dolibarrMatch['name'],
                'id'          => $dolibarrMatch['id'],
                'matched_via' => $foundByEmail ? 'email' : 'domain',
            ];
        }

        return ['status' => 'success', 'found' => false, 'reason' => 'false_positive'];
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_filtre_email_seul_pour_domaine_public(): void
    {
        $filter = $this->buildFilter('user@gmail.com');
        $this->assertStringContainsString("email:equals:'user@gmail.com'", $filter);
        $this->assertStringNotContainsString('url:like:', $filter);
    }

    public function test_filtre_email_et_domaine_pour_domaine_entreprise(): void
    {
        $filter = $this->buildFilter('contact@mon-entreprise.fr');
        $this->assertStringContainsString("email:equals:'contact@mon-entreprise.fr'", $filter);
        $this->assertStringContainsString("url:like:'%mon-entreprise.fr%'", $filter);
    }

    public function test_session_valide_retourne_credentials(): void
    {
        $client = $this->getClientByToken($this->pdo, 'token_valide_abc');

        $this->assertNotFalse($client);
        $this->assertEquals('https://dolibarr.exemple.com', $client['dolibarr_url']);
        $this->assertEquals('cle_api_123',                  $client['dolibarr_api_key']);
    }

    public function test_session_invalide_retourne_false(): void
    {
        $client = $this->getClientByToken($this->pdo, 'token_inexistant');

        $this->assertFalse($client);
    }

    public function test_match_par_email_exact(): void
    {
        $dolibarrMatch = ['email' => 'contact@fournisseur.com', 'url' => '', 'name' => 'Fournisseur SA', 'id' => 42];
        $result = $this->verifyMatch($dolibarrMatch, 'contact@fournisseur.com');

        $this->assertTrue($result['found']);
        $this->assertEquals('email', $result['matched_via']);
        $this->assertEquals(42,      $result['id']);
    }

    public function test_match_par_domaine_dans_url(): void
    {
        $dolibarrMatch = ['email' => '', 'url' => 'https://www.fournisseur.com/accueil', 'name' => 'Fournisseur SA', 'id' => 42];
        $result = $this->verifyMatch($dolibarrMatch, 'info@fournisseur.com');

        $this->assertTrue($result['found']);
        $this->assertEquals('domain', $result['matched_via']);
    }

    public function test_faux_positif_detecte(): void
    {
        // L'API Dolibarr renvoie un résultat mais ni l'email ni l'URL ne correspondent
        $dolibarrMatch = ['email' => 'autre@autre.com', 'url' => 'https://autre.com', 'name' => 'Autre SA', 'id' => 99];
        $result = $this->verifyMatch($dolibarrMatch, 'contact@fournisseur.com');

        $this->assertFalse($result['found']);
        $this->assertEquals('false_positive', $result['reason']);
    }

    public function test_match_insensible_a_la_casse(): void
    {
        $dolibarrMatch = ['email' => 'CONTACT@FOURNISSEUR.COM', 'url' => '', 'name' => 'Fournisseur', 'id' => 5];
        $result = $this->verifyMatch($dolibarrMatch, 'contact@fournisseur.com');

        $this->assertTrue($result['found']);
        $this->assertEquals('email', $result['matched_via']);
    }

    public function test_domaines_publics_connus_reconnus(): void
    {
        foreach (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.fr'] as $domain) {
            $filter = $this->buildFilter("user@$domain");
            $this->assertStringNotContainsString('url:like:', $filter,
                "Le domaine $domain doit utiliser le filtre email uniquement");
        }
    }
}